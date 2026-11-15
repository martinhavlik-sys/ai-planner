-- TEST-only návrh, NEAPLIKOVANÝ. Pred BEGIN overiť projekt cez Supabase API.
-- Operátor po schválení: BEGIN; SET LOCAL app.ai_planner_target_ref =
-- 'yqleboakzkowfxsmynfy'; potom tento súbor; post-check; až potom COMMIT.
DO $$ BEGIN
 IF current_setting('app.ai_planner_target_ref',true) IS DISTINCT FROM 'yqleboakzkowfxsmynfy'
 THEN RAISE EXCEPTION 'Chýba potvrdenie testovacieho projektu'; END IF;
 IF EXISTS (SELECT FROM information_schema.role_column_grants WHERE table_schema='public' AND table_name='tasks' AND grantee IN ('anon','authenticated') AND privilege_type IN ('INSERT','UPDATE'))
 OR has_table_privilege('authenticated','public.tasks','INSERT,UPDATE,DELETE')
 OR EXISTS (SELECT FROM pg_policies WHERE schemaname='public' AND tablename='tasks' AND cmd <> 'SELECT')
 THEN RAISE EXCEPTION 'Zapisovacie oprávnenia sa zmenili; návrh zastavený'; END IF;
END $$;
LOCK TABLE public.tasks IN ACCESS EXCLUSIVE MODE;
CREATE SEQUENCE public.test_tasks_id_seq MINVALUE 1 MAXVALUE 9007199254740991 NO CYCLE;
SELECT pg_catalog.setval('public.test_tasks_id_seq', COALESCE(max(id),0)+1, false) FROM public.tasks;
ALTER TABLE public.tasks ALTER COLUMN id SET DEFAULT nextval('public.test_tasks_id_seq');
ALTER TABLE public.tasks ALTER COLUMN created_by_user_id SET DEFAULT auth.uid();
ALTER TABLE public.tasks ADD COLUMN write_version integer NOT NULL DEFAULT 1 CHECK (write_version > 0);
ALTER TABLE public.tasks ADD COLUMN create_request_id uuid;
ALTER TABLE public.tasks ADD COLUMN create_payload jsonb;
ALTER TABLE public.tasks ADD CONSTRAINT test_tasks_request_unique UNIQUE (workspace_id,created_by_user_id,create_request_id);

-- Žiadna nová SECURITY DEFINER funkcia. Autor sa odvodí z overeného JWT.
-- Prvý TEST: nanajvýš jedna nová syntetická úloha v celom projekte.
CREATE UNIQUE INDEX test_tasks_single_probe ON public.tasks ((true)) WHERE create_request_id IS NOT NULL;

CREATE FUNCTION public.test_tasks_guard() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
 IF auth.uid() IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Vyžaduje sa prihlásenie'; END IF;
 IF TG_OP='INSERT' THEN
  IF NEW.title IS DISTINCT FROM 'Syntetická TEST – cloudový zápis'
  THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Prvý TEST povoľuje iba schválenú syntetickú úlohu'; END IF;
  IF NEW.created_by_user_id IS DISTINCT FROM auth.uid() OR NEW.create_request_id IS NULL OR NEW.write_version<>1
  THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Neplatný autor alebo požiadavka'; END IF;
  NEW.create_payload := jsonb_build_object('title',NEW.title,'status',NEW.status,'priority',NEW.priority);
 ELSE
  IF ROW(NEW.workspace_id,NEW.id,NEW.created_by_user_id,NEW.create_request_id,NEW.create_payload)
     IS DISTINCT FROM ROW(OLD.workspace_id,OLD.id,OLD.created_by_user_id,OLD.create_request_id,OLD.create_payload)
  THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='Identita úlohy je nemenná'; END IF;
  IF NEW.write_version::bigint <> OLD.write_version::bigint+1
  THEN RAISE EXCEPTION USING ERRCODE='40001', MESSAGE='Úloha sa medzičasom zmenila'; END IF;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.test_tasks_guard() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER test_tasks_guard BEFORE INSERT OR UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.test_tasks_guard();

-- Priamy predikát umožní RETURNING nového riadka aj členovi bez tímovej roly.
CREATE POLICY test_tasks_read_created ON public.tasks FOR SELECT TO authenticated USING (
 auth.uid() IS NOT NULL AND created_by_user_id=auth.uid() AND public.current_workspace_role(workspace_id) IS NOT NULL
);
CREATE POLICY test_tasks_insert ON public.tasks FOR INSERT TO authenticated WITH CHECK (
 auth.uid() IS NOT NULL AND created_by_user_id=auth.uid()
 AND public.current_workspace_role(workspace_id) IN ('owner','admin','member','user')
 AND EXISTS (SELECT FROM public.workspaces w WHERE w.id=tasks.workspace_id AND w.archived_at IS NULL)
 AND EXISTS (SELECT FROM public.profiles p WHERE p.workspace_id=tasks.workspace_id AND p.auth_user_id=auth.uid() AND p.archived_at IS NULL)
);
CREATE POLICY test_tasks_update ON public.tasks FOR UPDATE TO authenticated USING (
 auth.uid() IS NOT NULL AND public.current_workspace_role(workspace_id) IN ('owner','admin','member','user')
 AND EXISTS (SELECT FROM public.workspaces w WHERE w.id=tasks.workspace_id AND w.archived_at IS NULL)
 AND (public.current_workspace_role(workspace_id) IN ('owner','admin') OR created_by_user_id=auth.uid() OR EXISTS (
  SELECT FROM public.task_assignees a JOIN public.profiles p ON p.workspace_id=a.workspace_id AND p.id=a.profile_id
  WHERE a.workspace_id=tasks.workspace_id AND a.task_id=tasks.id AND a.archived_at IS NULL AND p.archived_at IS NULL AND p.auth_user_id=auth.uid()
 ))
) WITH CHECK (
 auth.uid() IS NOT NULL AND public.current_workspace_role(workspace_id) IN ('owner','admin','member','user')
 AND EXISTS (SELECT FROM public.workspaces w WHERE w.id=tasks.workspace_id AND w.archived_at IS NULL)
 AND (public.current_workspace_role(workspace_id) IN ('owner','admin') OR created_by_user_id=auth.uid() OR EXISTS (
  SELECT FROM public.task_assignees a JOIN public.profiles p ON p.workspace_id=a.workspace_id AND p.id=a.profile_id
  WHERE a.workspace_id=tasks.workspace_id AND a.task_id=tasks.id AND a.archived_at IS NULL AND p.archived_at IS NULL AND p.auth_user_id=auth.uid()
 ))
);
-- Dočasná brána prvého TEST bloku, nezávislá od oprávnení rolí.
-- Historické úlohy sú neupraviteľné aj pre admin/owner.
-- Odstránenie tejto politiky vyžaduje samostatné neskoršie schválenie.
CREATE POLICY test_tasks_update_probe_only ON public.tasks AS RESTRICTIVE
FOR UPDATE TO authenticated
USING (create_request_id IS NOT NULL)
WITH CHECK (create_request_id IS NOT NULL);
-- Existujúce SELECT politiky, pohľady, FK a touch_tasks sa nemenia.
-- Stĺpcové granty: klient neurčuje autora, ID, čas, väzby ani obsah auditu.
REVOKE ALL ON SEQUENCE public.test_tasks_id_seq FROM PUBLIC,anon,authenticated;
GRANT USAGE ON SEQUENCE public.test_tasks_id_seq TO authenticated;
GRANT INSERT (workspace_id,title,status,priority,create_request_id) ON public.tasks TO authenticated;
GRANT UPDATE (title,status,priority,write_version) ON public.tasks TO authenticated;
