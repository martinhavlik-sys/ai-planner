-- TEST-only úplný návrat schémy LEN pred prvým zápisom. BEGIN … COMMIT operátora.
-- Najprv vykonať bezpečnostný rollback. Pri existujúcej novej úlohe sa zastaví.
LOCK TABLE public.tasks IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS (SELECT FROM pg_policies WHERE schemaname='public' AND tablename='tasks'
   AND policyname IN ('test_tasks_insert','test_tasks_update','test_tasks_read_created','test_tasks_update_probe_only'))
 THEN RAISE EXCEPTION 'Najprv vykonajte R1 vrátane dočasnej RESTRICTIVE politiky'; END IF;
END $$;
DO $$ BEGIN
 IF EXISTS (SELECT FROM public.tasks WHERE create_request_id IS NOT NULL OR write_version <> 1)
 THEN RAISE EXCEPTION 'Existuje história zápisu; použiť iba bezpečnostný rollback'; END IF;
END $$;
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS test_tasks_scope_check;
DROP INDEX public.test_tasks_single_probe;
DROP TRIGGER test_tasks_guard ON public.tasks;
DROP FUNCTION public.test_tasks_guard();
ALTER TABLE public.tasks DROP CONSTRAINT test_tasks_request_unique;
ALTER TABLE public.tasks DROP COLUMN create_payload;
ALTER TABLE public.tasks DROP COLUMN create_request_id;
ALTER TABLE public.tasks DROP COLUMN write_version;
ALTER TABLE public.tasks ALTER COLUMN id DROP DEFAULT;
ALTER TABLE public.tasks ALTER COLUMN created_by_user_id DROP DEFAULT;
DROP SEQUENCE public.test_tasks_id_seq RESTRICT;
