-- Schema-only baseline ai-planner-test / yqleboakzkowfxsmynfy; 2026-11-15.

-- Iba aplikacna schema public. Bez riadkov, tajomstiev a managed Auth/Storage schem.

-- NEAPLIKOVAT na existujucu DB ani ako migraciu. Obnova iba do prazdneho lokalneho prostredia.

-- Predpoklady: existuju platformove roly a auth.users(id), auth.uid().

CREATE SCHEMA IF NOT EXISTS public;

CREATE TABLE public."calendar_slots" (
  "workspace_id" uuid NOT NULL,
  "id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone,
  "task_id" bigint NOT NULL,
  "day" date NOT NULL,
  "start_hour" numeric NOT NULL,
  "duration" numeric NOT NULL
);

CREATE TABLE public."clients" (
  "workspace_id" uuid NOT NULL,
  "id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone,
  "name" text NOT NULL,
  "email" text,
  "note" text
);

CREATE TABLE public."department_clients" (
  "workspace_id" uuid NOT NULL,
  "id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone,
  "department_id" bigint NOT NULL,
  "client_id" bigint NOT NULL
);

CREATE TABLE public."departments" (
  "workspace_id" uuid NOT NULL,
  "id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone,
  "name" text NOT NULL,
  "color" text DEFAULT '#4285F4'::text NOT NULL,
  "code" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "seed_key" text
);

CREATE TABLE public."entities" (
  "workspace_id" uuid NOT NULL,
  "id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone,
  "name" text NOT NULL,
  "code" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "seed_key" text
);

CREATE TABLE public."profiles" (
  "workspace_id" uuid NOT NULL,
  "id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone,
  "auth_user_id" uuid,
  "name" text NOT NULL,
  "email" text,
  "initials" text,
  "avatar_color" text,
  "photo" text,
  "legacy" jsonb DEFAULT '{}'::jsonb NOT NULL
);

CREATE TABLE public."project_entities" (
  "workspace_id" uuid NOT NULL,
  "id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone,
  "project_id" bigint NOT NULL,
  "entity_id" bigint NOT NULL
);

CREATE TABLE public."projects" (
  "workspace_id" uuid NOT NULL,
  "id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone,
  "name" text NOT NULL,
  "department_id" bigint,
  "edition" text,
  "year" integer,
  "code" text,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "seed_key" text
);

CREATE TABLE public."task_assignees" (
  "workspace_id" uuid NOT NULL,
  "id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone,
  "task_id" bigint NOT NULL,
  "profile_id" bigint NOT NULL
);

CREATE TABLE public."task_clients" (
  "workspace_id" uuid NOT NULL,
  "id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone,
  "task_id" bigint NOT NULL,
  "client_id" bigint NOT NULL
);

CREATE TABLE public."task_entities" (
  "workspace_id" uuid NOT NULL,
  "task_id" bigint NOT NULL,
  "entity_id" bigint NOT NULL,
  "is_primary" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."tasks" (
  "workspace_id" uuid NOT NULL,
  "id" bigint NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone,
  "title" text NOT NULL,
  "department_id" bigint,
  "entity_id" bigint,
  "project_id" bigint,
  "priority" text DEFAULT 'Stredna'::text NOT NULL,
  "status" text,
  "due_date" date,
  "note" text,
  "checklist" jsonb DEFAULT '[]'::jsonb NOT NULL,
  "legacy" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "department_detail" text DEFAULT ''::text NOT NULL,
  "entity_detail" text DEFAULT ''::text NOT NULL,
  "project_detail" text DEFAULT ''::text NOT NULL,
  "created_by_user_id" uuid,
  "completed_at" timestamp with time zone
);

CREATE TABLE public."workspace_members" (
  "workspace_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "role" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."workspaces" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "archived_at" timestamp with time zone
);

ALTER TABLE public."calendar_slots" ADD CONSTRAINT "calendar_slots_duration_check" CHECK (duration >= 0.25 AND duration <= 24::numeric);

ALTER TABLE public."calendar_slots" ADD CONSTRAINT "calendar_slots_id_check" CHECK (id > 0 AND id <= '9007199254740991'::bigint);

ALTER TABLE public."calendar_slots" ADD CONSTRAINT "calendar_slots_pkey" PRIMARY KEY (workspace_id, id);

ALTER TABLE public."calendar_slots" ADD CONSTRAINT "calendar_slots_start_hour_check" CHECK (start_hour >= 0::numeric AND start_hour <= 23.75);

ALTER TABLE public."clients" ADD CONSTRAINT "clients_id_check" CHECK (id > 0 AND id <= '9007199254740991'::bigint);

ALTER TABLE public."clients" ADD CONSTRAINT "clients_name_check" CHECK (length(TRIM(BOTH FROM name)) > 0);

ALTER TABLE public."clients" ADD CONSTRAINT "clients_pkey" PRIMARY KEY (workspace_id, id);

ALTER TABLE public."department_clients" ADD CONSTRAINT "department_clients_id_check" CHECK (id > 0 AND id <= '9007199254740991'::bigint);

ALTER TABLE public."department_clients" ADD CONSTRAINT "department_clients_pkey" PRIMARY KEY (workspace_id, id);

ALTER TABLE public."department_clients" ADD CONSTRAINT "department_clients_workspace_id_department_id_key" UNIQUE (workspace_id, department_id);

ALTER TABLE public."departments" ADD CONSTRAINT "departments_id_check" CHECK (id > 0 AND id <= '9007199254740991'::bigint);

ALTER TABLE public."departments" ADD CONSTRAINT "departments_name_check" CHECK (length(TRIM(BOTH FROM name)) > 0);

ALTER TABLE public."departments" ADD CONSTRAINT "departments_pkey" PRIMARY KEY (workspace_id, id);

ALTER TABLE public."entities" ADD CONSTRAINT "entities_id_check" CHECK (id > 0 AND id <= '9007199254740991'::bigint);

ALTER TABLE public."entities" ADD CONSTRAINT "entities_name_check" CHECK (length(TRIM(BOTH FROM name)) > 0);

ALTER TABLE public."entities" ADD CONSTRAINT "entities_pkey" PRIMARY KEY (workspace_id, id);

ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_id_check" CHECK (id > 0 AND id <= '9007199254740991'::bigint);

ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (workspace_id, id);

ALTER TABLE public."project_entities" ADD CONSTRAINT "project_entities_id_check" CHECK (id > 0 AND id <= '9007199254740991'::bigint);

ALTER TABLE public."project_entities" ADD CONSTRAINT "project_entities_pkey" PRIMARY KEY (workspace_id, id);

ALTER TABLE public."project_entities" ADD CONSTRAINT "project_entities_workspace_id_project_id_entity_id_key" UNIQUE (workspace_id, project_id, entity_id);

ALTER TABLE public."projects" ADD CONSTRAINT "projects_id_check" CHECK (id > 0 AND id <= '9007199254740991'::bigint);

ALTER TABLE public."projects" ADD CONSTRAINT "projects_name_check" CHECK (length(TRIM(BOTH FROM name)) > 0);

ALTER TABLE public."projects" ADD CONSTRAINT "projects_pkey" PRIMARY KEY (workspace_id, id);

ALTER TABLE public."projects" ADD CONSTRAINT "projects_year_check" CHECK (year >= 1000 AND year <= 9999);

ALTER TABLE public."task_assignees" ADD CONSTRAINT "task_assignees_id_check" CHECK (id > 0 AND id <= '9007199254740991'::bigint);

ALTER TABLE public."task_assignees" ADD CONSTRAINT "task_assignees_pkey" PRIMARY KEY (workspace_id, id);

ALTER TABLE public."task_assignees" ADD CONSTRAINT "task_assignees_workspace_id_task_id_profile_id_key" UNIQUE (workspace_id, task_id, profile_id);

ALTER TABLE public."task_clients" ADD CONSTRAINT "task_clients_id_check" CHECK (id > 0 AND id <= '9007199254740991'::bigint);

ALTER TABLE public."task_clients" ADD CONSTRAINT "task_clients_pkey" PRIMARY KEY (workspace_id, id);

ALTER TABLE public."task_clients" ADD CONSTRAINT "task_clients_workspace_id_task_id_key" UNIQUE (workspace_id, task_id);

ALTER TABLE public."task_entities" ADD CONSTRAINT "task_entities_pkey" PRIMARY KEY (workspace_id, task_id, entity_id);

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_id_check" CHECK (id > 0 AND id <= '9007199254740991'::bigint);

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_pkey" PRIMARY KEY (workspace_id, id);

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_priority_check" CHECK (priority = ANY (ARRAY['Nizka'::text, 'Stredna'::text, 'Vysoka'::text]));

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_status_check" CHECK (status = ANY (ARRAY['Backlog'::text, 'Dnes'::text, 'Robi sa'::text, 'Caka'::text, 'Hotovo'::text]));

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_title_check" CHECK (length(TRIM(BOTH FROM title)) > 0);

ALTER TABLE public."workspace_members" ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY (workspace_id, user_id);

ALTER TABLE public."workspace_members" ADD CONSTRAINT "workspace_members_role_check" CHECK (role = ANY (ARRAY['owner'::text, 'admin'::text, 'user'::text, 'analyst'::text, 'member'::text]));

ALTER TABLE public."workspaces" ADD CONSTRAINT "workspaces_pkey" PRIMARY KEY (id);

ALTER TABLE public."calendar_slots" ADD CONSTRAINT "calendar_slots_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE public."calendar_slots" ADD CONSTRAINT "calendar_slots_workspace_id_task_id_fkey" FOREIGN KEY (workspace_id, task_id) REFERENCES tasks(workspace_id, id);

ALTER TABLE public."clients" ADD CONSTRAINT "clients_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE public."department_clients" ADD CONSTRAINT "department_clients_workspace_id_client_id_fkey" FOREIGN KEY (workspace_id, client_id) REFERENCES clients(workspace_id, id);

ALTER TABLE public."department_clients" ADD CONSTRAINT "department_clients_workspace_id_department_id_fkey" FOREIGN KEY (workspace_id, department_id) REFERENCES departments(workspace_id, id);

ALTER TABLE public."department_clients" ADD CONSTRAINT "department_clients_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE public."departments" ADD CONSTRAINT "departments_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE public."entities" ADD CONSTRAINT "entities_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_auth_user_id_fkey" FOREIGN KEY (auth_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE public."project_entities" ADD CONSTRAINT "project_entities_workspace_id_entity_id_fkey" FOREIGN KEY (workspace_id, entity_id) REFERENCES entities(workspace_id, id);

ALTER TABLE public."project_entities" ADD CONSTRAINT "project_entities_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE public."project_entities" ADD CONSTRAINT "project_entities_workspace_id_project_id_fkey" FOREIGN KEY (workspace_id, project_id) REFERENCES projects(workspace_id, id);

ALTER TABLE public."projects" ADD CONSTRAINT "projects_workspace_id_department_id_fkey" FOREIGN KEY (workspace_id, department_id) REFERENCES departments(workspace_id, id);

ALTER TABLE public."projects" ADD CONSTRAINT "projects_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE public."task_assignees" ADD CONSTRAINT "task_assignees_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE public."task_assignees" ADD CONSTRAINT "task_assignees_workspace_id_profile_id_fkey" FOREIGN KEY (workspace_id, profile_id) REFERENCES profiles(workspace_id, id);

ALTER TABLE public."task_assignees" ADD CONSTRAINT "task_assignees_workspace_id_task_id_fkey" FOREIGN KEY (workspace_id, task_id) REFERENCES tasks(workspace_id, id);

ALTER TABLE public."task_clients" ADD CONSTRAINT "task_clients_workspace_id_client_id_fkey" FOREIGN KEY (workspace_id, client_id) REFERENCES clients(workspace_id, id);

ALTER TABLE public."task_clients" ADD CONSTRAINT "task_clients_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE public."task_clients" ADD CONSTRAINT "task_clients_workspace_id_task_id_fkey" FOREIGN KEY (workspace_id, task_id) REFERENCES tasks(workspace_id, id);

ALTER TABLE public."task_entities" ADD CONSTRAINT "task_entities_workspace_id_entity_id_fkey" FOREIGN KEY (workspace_id, entity_id) REFERENCES entities(workspace_id, id) ON DELETE RESTRICT;

ALTER TABLE public."task_entities" ADD CONSTRAINT "task_entities_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE public."task_entities" ADD CONSTRAINT "task_entities_workspace_id_task_id_fkey" FOREIGN KEY (workspace_id, task_id) REFERENCES tasks(workspace_id, id) ON DELETE RESTRICT;

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_created_by_user_id_fkey" FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_workspace_id_department_id_fkey" FOREIGN KEY (workspace_id, department_id) REFERENCES departments(workspace_id, id);

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_workspace_id_entity_id_fkey" FOREIGN KEY (workspace_id, entity_id) REFERENCES entities(workspace_id, id);

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

ALTER TABLE public."tasks" ADD CONSTRAINT "tasks_workspace_id_project_id_fkey" FOREIGN KEY (workspace_id, project_id) REFERENCES projects(workspace_id, id);

ALTER TABLE public."workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;

ALTER TABLE public."workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE RESTRICT;

CREATE INDEX calendar_slots_day_idx ON public.calendar_slots USING btree (workspace_id, day);

CREATE INDEX calendar_slots_task_id_idx ON public.calendar_slots USING btree (workspace_id, task_id);

CREATE INDEX department_clients_client_id_idx ON public.department_clients USING btree (workspace_id, client_id);

CREATE UNIQUE INDEX departments_seed_key ON public.departments USING btree (workspace_id, seed_key) WHERE (seed_key IS NOT NULL);

CREATE UNIQUE INDEX entities_seed_key ON public.entities USING btree (workspace_id, seed_key) WHERE (seed_key IS NOT NULL);

CREATE UNIQUE INDEX profiles_workspace_auth_user_uidx ON public.profiles USING btree (workspace_id, auth_user_id) WHERE ((auth_user_id IS NOT NULL) AND (archived_at IS NULL));

CREATE INDEX project_entities_entity_id_idx ON public.project_entities USING btree (workspace_id, entity_id);

CREATE INDEX projects_department_id_idx ON public.projects USING btree (workspace_id, department_id);

CREATE UNIQUE INDEX projects_seed_key ON public.projects USING btree (workspace_id, seed_key) WHERE (seed_key IS NOT NULL);

CREATE INDEX task_assignees_profile_id_idx ON public.task_assignees USING btree (workspace_id, profile_id);

CREATE INDEX task_clients_client_id_idx ON public.task_clients USING btree (workspace_id, client_id);

CREATE INDEX task_entities_entity_idx ON public.task_entities USING btree (workspace_id, entity_id, task_id);

CREATE UNIQUE INDEX task_entities_one_primary_uidx ON public.task_entities USING btree (workspace_id, task_id) WHERE is_primary;

CREATE INDEX tasks_completed_at_idx ON public.tasks USING btree (workspace_id, completed_at);

CREATE INDEX tasks_created_by_user_idx ON public.tasks USING btree (workspace_id, created_by_user_id);

CREATE INDEX tasks_department_id_idx ON public.tasks USING btree (workspace_id, department_id);

CREATE INDEX tasks_entity_id_idx ON public.tasks USING btree (workspace_id, entity_id);

CREATE INDEX tasks_project_id_idx ON public.tasks USING btree (workspace_id, project_id);

CREATE OR REPLACE FUNCTION public.current_workspace_role(w uuid)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select m.role
  from public.workspace_members m
  where m.workspace_id = w
    and m.user_id = (select auth.uid())
  limit 1
$function$
;

CREATE OR REPLACE FUNCTION public.is_workspace_member(w uuid, admin_only boolean DEFAULT false)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.workspace_members m where m.workspace_id=w
 and m.user_id=(select auth.uid()) and (not admin_only or m.role in ('owner','admin')));
$function$
;

CREATE OR REPLACE FUNCTION public.can_read_task(w uuid, task_key bigint)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    public.current_workspace_role(w) is not null
    and (
      public.current_workspace_role(w) in ('owner', 'admin', 'analyst')
      or exists (
      select 1
      from public.tasks t
      where t.workspace_id = w
        and t.id = task_key
        and (
          t.created_by_user_id = (select auth.uid())
          or exists (
            select 1
            from public.task_assignees a
            join public.profiles p
              on p.workspace_id = a.workspace_id
             and p.id = a.profile_id
             and p.archived_at is null
            where a.workspace_id = w
              and a.task_id = task_key
              and p.auth_user_id = (select auth.uid())
              and a.archived_at is null
          )
        )
      )
    )
$function$
;

CREATE OR REPLACE FUNCTION public.project_edition_unique()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 if TG_OP='UPDATE' then
  if lower(trim(new.name))=lower(trim(old.name)) and new.year is not distinct from old.year and coalesce(new.edition,'')=coalesce(old.edition,'') and new.workspace_id=old.workspace_id then return new; end if;
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.workspace_id::text,0));
 if exists(select 1 from public.projects p where p.workspace_id=new.workspace_id and p.id<>new.id and lower(trim(p.name))=lower(trim(new.name)) and p.year is not distinct from new.year and (new.year is not null or lower(trim(coalesce(p.edition,'')))=lower(trim(coalesce(new.edition,''))))) then
  raise exception 'Project name/year or legacy edition already exists';
 end if;
 return new;
end; $function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
  tbl name;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        SELECT c.relname INTO tbl FROM pg_catalog.pg_class c WHERE c.oid = cmd.objid;
        EXECUTE format('alter table if exists %I.%I enable row level security', cmd.schema_name, tbl);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.seed_catalog(target_workspace uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare item record; existing_id bigint; candidate bigint;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(target_workspace::text,0));
 if not exists(select 1 from public.workspaces where id=target_workspace) then raise exception 'Unknown workspace'; end if;
 for item in select * from (values
('departments', 'Finančný úsek', 'departments:1', 1, 8000001::bigint),
('departments', 'Projektový tím', 'departments:2', 2, 8000002::bigint),
('departments', 'Marketing', 'departments:3', 3, 8000003::bigint),
('departments', 'Medicínsky úsek', 'departments:4', 4, 8000004::bigint),
('departments', 'IT úsek', 'departments:5', 5, 8000005::bigint),
('departments', 'HR úsek', 'departments:6', 6, 8000006::bigint),
('departments', 'PR úsek', 'departments:7', 7, 8000007::bigint),
('departments', 'Oddelenie právnych služieb', 'departments:8', 8, 8000008::bigint),
('departments', 'Obchodný úsek', 'departments:9', 9, 8000009::bigint),
('departments', 'Úsek prevádzky', 'departments:10', 10, 8000010::bigint),
('departments', 'Pracovná zdravotná služba', 'departments:11', 11, 8000011::bigint),
('departments', 'Dopravná zdravotná služba', 'departments:12', 12, 8000012::bigint),
('departments', 'Dlhodobá starostlivosť', 'departments:13', 13, 8000013::bigint),
('departments', 'PH International', 'departments:14', 14, 8000014::bigint),
('departments', 'Darcovské centrum', 'departments:15', 15, 8000015::bigint),
('departments', 'Pôrodnice', 'departments:16', 16, 8000016::bigint),
('departments', 'Iné', 'departments:17', 17, 8000017::bigint),
('entities', 'NEM Medissimo', 'entities:1', 1, 8001001::bigint),
('entities', 'NEM Dunajská Streda', 'entities:2', 2, 8001002::bigint),
('entities', 'NEM Topoľčany', 'entities:3', 3, 8001003::bigint),
('entities', 'NEM Rimavská Sobota', 'entities:4', 4, 8001004::bigint),
('entities', 'NEM Spišská Nová Ves', 'entities:5', 5, 8001005::bigint),
('entities', 'NEM Trebišov', 'entities:6', 6, 8001006::bigint),
('entities', 'NEM Svidník', 'entities:7', 7, 8001007::bigint),
('entities', 'NEM Humenné', 'entities:8', 8, 8001008::bigint),
('entities', 'NEM Galanta', 'entities:9', 9, 8001009::bigint),
('entities', 'NEM Partizánske', 'entities:10', 10, 8001010::bigint),
('entities', 'NEM Rožňava', 'entities:11', 11, 8001011::bigint),
('entities', 'NEM Michalovce', 'entities:12', 12, 8001012::bigint),
('entities', 'NEM Vranov nad Topľou', 'entities:13', 13, 8001013::bigint),
('entities', 'NEM Stropkov', 'entities:14', 14, 8001014::bigint),
('entities', 'PLK Central', 'entities:15', 15, 8001015::bigint),
('entities', 'PLK Central Tower', 'entities:16', 16, 8001016::bigint),
('entities', 'PLK Bory', 'entities:17', 17, 8001017::bigint),
('entities', 'PLK Betliarska', 'entities:18', 18, 8001018::bigint),
('entities', 'PLK Devínska Nová Ves', 'entities:19', 19, 8001019::bigint),
('entities', 'PLK Vlčie Hrdlo', 'entities:20', 20, 8001020::bigint),
('entities', 'PLK Sereď', 'entities:21', 21, 8001021::bigint),
('entities', 'PLK Nitra', 'entities:22', 22, 8001022::bigint),
('entities', 'PLK Prešov', 'entities:23', 23, 8001023::bigint),
('entities', 'PLK Košice', 'entities:24', 24, 8001024::bigint),
('entities', 'SEN Pohoda Seniorov', 'entities:25', 25, 8001025::bigint),
('entities', 'SEN SeniorCare Galanta', 'entities:26', 26, 8001026::bigint),
('entities', 'SEN SeniorCare Kaskády', 'entities:27', 27, 8001027::bigint),
('entities', 'SEN SČSS Stropkov', 'entities:28', 28, 8001028::bigint),
('entities', 'Sportclinic', 'entities:29', 29, 8001029::bigint),
('entities', 'HQ Bratislava', 'entities:30', 30, 8001030::bigint),
('entities', 'HQ Košice', 'entities:31', 31, 8001031::bigint),
('entities', 'Iné', 'entities:32', 32, 8001032::bigint),
('projects', 'Najzamestnávateľ', 'projects:1', 1, 8002001::bigint),
('projects', 'Ružový október', 'projects:2', 2, 8002002::bigint),
('projects', 'Movember', 'projects:3', 3, 8002003::bigint),
('projects', 'Vianočný večierok', 'projects:4', 4, 8002004::bigint),
('projects', 'Teambuilding', 'projects:5', 5, 8002005::bigint),
('projects', 'Strategická konferencia', 'projects:6', 6, 8002006::bigint),
('projects', 'Deň sestier', 'projects:7', 7, 8002007::bigint),
('projects', 'Deň lekárov', 'projects:8', 8, 8002008::bigint),
('projects', 'Deň OZP', 'projects:9', 9, 8002009::bigint),
('projects', 'Hokejová kvapka krvi', 'projects:10', 10, 8002010::bigint),
('projects', 'Futbalová kvapka krvi', 'projects:11', 11, 8002011::bigint),
('projects', 'Týždeň dojčenia', 'projects:12', 12, 8002012::bigint),
('projects', 'Piknik s laktačnou poradkyňou', 'projects:13', 13, 8002013::bigint),
('projects', 'Bezpečnosť pacienta', 'projects:14', 14, 8002014::bigint),
('projects', 'Svetový deň srdca', 'projects:15', 15, 8002015::bigint),
('projects', 'Top sestra', 'projects:16', 16, 8002016::bigint),
('projects', 'Absolventi', 'projects:17', 17, 8002017::bigint),
('projects', 'Biele srdce', 'projects:18', 18, 8002018::bigint),
('projects', 'Intranet', 'projects:19', 19, 8002019::bigint),
('projects', 'Klientská zóna', 'projects:20', 20, 8002020::bigint),
('projects', 'Re/Branding', 'projects:21', 21, 8002021::bigint),
('projects', 'Iné', 'projects:22', 22, 8002022::bigint)) as catalog(kind,label,key,position,preferred_id) loop
  execute format('select id from public.%I where workspace_id=$1 and seed_key=$2',item.kind) into existing_id using target_workspace,item.key;
  if existing_id is not null then continue; end if;
  execute format('select id from public.%I where workspace_id=$1 and name=$2 %s order by id limit 1',item.kind,case when item.kind='projects' then $predicate$and year is null and coalesce(edition,'')=''$predicate$ else '' end) into existing_id using target_workspace,item.label;
  if existing_id is not null then
   execute format('update public.%I set seed_key=$2 where workspace_id=$1 and id=$3 and seed_key is null',item.kind) using target_workspace,item.key,existing_id;
   continue;
  end if;
  candidate=item.preferred_id;
  loop
   execute format('select id from public.%I where workspace_id=$1 and id=$2',item.kind) into existing_id using target_workspace,candidate;
   exit when existing_id is null; candidate=candidate+1;
  end loop;
  execute format('insert into public.%I(workspace_id,id,name,seed_key,sort_order) values($1,$2,$3,$4,$5)',item.kind) using target_workspace,candidate,item.label,item.key,item.position;
 end loop;
end; $function$
;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$ begin new.updated_at=now(); return new; end; $function$
;

CREATE VIEW public."reporting_task_entity_links" WITH (security_invoker=true) AS
 SELECT workspace_id,
    task_id,
    entity_id,
    is_primary
   FROM task_entities;

CREATE VIEW public."reporting_tasks" WITH (security_invoker=true) AS
 SELECT t.workspace_id,
    t.id AS task_id,
    t.created_at,
    t.updated_at,
    t.created_by_user_id,
    t.completed_at,
    t.due_date,
    t.status,
    t.priority,
    t.department_id,
    t.project_id,
    t.entity_id AS legacy_entity_id,
    primary_link.entity_id AS primary_entity_id
   FROM tasks t
     LEFT JOIN LATERAL ( SELECT te.entity_id
           FROM task_entities te
          WHERE te.workspace_id = t.workspace_id AND te.task_id = t.id
          ORDER BY te.is_primary DESC, te.created_at, te.entity_id
         LIMIT 1) primary_link ON true;

CREATE TRIGGER touch_calendar_slots BEFORE UPDATE ON calendar_slots FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE public."calendar_slots" ENABLE TRIGGER "touch_calendar_slots";

CREATE TRIGGER touch_clients BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE public."clients" ENABLE TRIGGER "touch_clients";

CREATE TRIGGER touch_department_clients BEFORE UPDATE ON department_clients FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE public."department_clients" ENABLE TRIGGER "touch_department_clients";

CREATE TRIGGER touch_departments BEFORE UPDATE ON departments FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE public."departments" ENABLE TRIGGER "touch_departments";

CREATE TRIGGER touch_entities BEFORE UPDATE ON entities FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE public."entities" ENABLE TRIGGER "touch_entities";

CREATE TRIGGER touch_profiles BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE public."profiles" ENABLE TRIGGER "touch_profiles";

CREATE TRIGGER touch_project_entities BEFORE UPDATE ON project_entities FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE public."project_entities" ENABLE TRIGGER "touch_project_entities";

CREATE TRIGGER project_edition_unique BEFORE INSERT OR UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION project_edition_unique();

ALTER TABLE public."projects" ENABLE TRIGGER "project_edition_unique";

CREATE TRIGGER touch_projects BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE public."projects" ENABLE TRIGGER "touch_projects";

CREATE TRIGGER touch_task_assignees BEFORE UPDATE ON task_assignees FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE public."task_assignees" ENABLE TRIGGER "touch_task_assignees";

CREATE TRIGGER touch_task_clients BEFORE UPDATE ON task_clients FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE public."task_clients" ENABLE TRIGGER "touch_task_clients";

CREATE TRIGGER touch_task_entities BEFORE UPDATE ON task_entities FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE public."task_entities" ENABLE TRIGGER "touch_task_entities";

CREATE TRIGGER touch_tasks BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

ALTER TABLE public."tasks" ENABLE TRIGGER "touch_tasks";

ALTER TABLE public."calendar_slots" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."calendar_slots" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public."clients" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."clients" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public."department_clients" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."department_clients" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public."departments" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."departments" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public."entities" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."entities" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."profiles" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public."project_entities" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."project_entities" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public."projects" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."projects" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public."task_assignees" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."task_assignees" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public."task_clients" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."task_clients" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public."task_entities" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."task_entities" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public."tasks" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."tasks" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public."workspace_members" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."workspace_members" NO FORCE ROW LEVEL SECURITY;

ALTER TABLE public."workspaces" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."workspaces" NO FORCE ROW LEVEL SECURITY;

CREATE POLICY "calendar_slots_read_own_or_reporting" ON public."calendar_slots" AS PERMISSIVE FOR SELECT TO "authenticated" USING (can_read_task(workspace_id, task_id));

CREATE POLICY "clients_read" ON public."clients" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_workspace_member(workspace_id, true));

CREATE POLICY "department_clients_read" ON public."department_clients" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_workspace_member(workspace_id, true));

CREATE POLICY "departments_read" ON public."departments" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_workspace_member(workspace_id, false));

CREATE POLICY "entities_read" ON public."entities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_workspace_member(workspace_id, false));

CREATE POLICY "profiles_read" ON public."profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_workspace_member(workspace_id, false));

CREATE POLICY "project_entities_read" ON public."project_entities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_workspace_member(workspace_id, false));

CREATE POLICY "projects_read" ON public."projects" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_workspace_member(workspace_id, false));

CREATE POLICY "task_assignees_read_own_or_reporting" ON public."task_assignees" AS PERMISSIVE FOR SELECT TO "authenticated" USING (can_read_task(workspace_id, task_id));

CREATE POLICY "task_clients_read" ON public."task_clients" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_workspace_member(workspace_id, true));

CREATE POLICY "task_entities_read_own_or_reporting" ON public."task_entities" AS PERMISSIVE FOR SELECT TO "authenticated" USING (can_read_task(workspace_id, task_id));

CREATE POLICY "tasks_read_own_or_reporting" ON public."tasks" AS PERMISSIVE FOR SELECT TO "authenticated" USING (can_read_task(workspace_id, id));

CREATE POLICY "membership_read" ON public."workspace_members" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((user_id = ( SELECT auth.uid() AS uid)));

CREATE POLICY "workspace_read" ON public."workspaces" AS PERMISSIVE FOR SELECT TO "authenticated" USING (is_workspace_member(id));

ALTER TABLE public."calendar_slots" OWNER TO "postgres";

REVOKE ALL ON public."calendar_slots" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."calendar_slots" TO "postgres";

GRANT SELECT ON public."calendar_slots" TO "postgres";

GRANT UPDATE ON public."calendar_slots" TO "postgres";

GRANT DELETE ON public."calendar_slots" TO "postgres";

GRANT TRUNCATE ON public."calendar_slots" TO "postgres";

GRANT REFERENCES ON public."calendar_slots" TO "postgres";

GRANT TRIGGER ON public."calendar_slots" TO "postgres";

GRANT MAINTAIN ON public."calendar_slots" TO "postgres";

GRANT TRUNCATE ON public."calendar_slots" TO "service_role";

GRANT REFERENCES ON public."calendar_slots" TO "service_role";

GRANT TRIGGER ON public."calendar_slots" TO "service_role";

GRANT MAINTAIN ON public."calendar_slots" TO "service_role";

GRANT SELECT ON public."calendar_slots" TO "authenticated";

ALTER TABLE public."clients" OWNER TO "postgres";

REVOKE ALL ON public."clients" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."clients" TO "postgres";

GRANT SELECT ON public."clients" TO "postgres";

GRANT UPDATE ON public."clients" TO "postgres";

GRANT DELETE ON public."clients" TO "postgres";

GRANT TRUNCATE ON public."clients" TO "postgres";

GRANT REFERENCES ON public."clients" TO "postgres";

GRANT TRIGGER ON public."clients" TO "postgres";

GRANT MAINTAIN ON public."clients" TO "postgres";

GRANT TRUNCATE ON public."clients" TO "service_role";

GRANT REFERENCES ON public."clients" TO "service_role";

GRANT TRIGGER ON public."clients" TO "service_role";

GRANT MAINTAIN ON public."clients" TO "service_role";

GRANT SELECT ON public."clients" TO "authenticated";

ALTER TABLE public."department_clients" OWNER TO "postgres";

REVOKE ALL ON public."department_clients" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."department_clients" TO "postgres";

GRANT SELECT ON public."department_clients" TO "postgres";

GRANT UPDATE ON public."department_clients" TO "postgres";

GRANT DELETE ON public."department_clients" TO "postgres";

GRANT TRUNCATE ON public."department_clients" TO "postgres";

GRANT REFERENCES ON public."department_clients" TO "postgres";

GRANT TRIGGER ON public."department_clients" TO "postgres";

GRANT MAINTAIN ON public."department_clients" TO "postgres";

GRANT TRUNCATE ON public."department_clients" TO "service_role";

GRANT REFERENCES ON public."department_clients" TO "service_role";

GRANT TRIGGER ON public."department_clients" TO "service_role";

GRANT MAINTAIN ON public."department_clients" TO "service_role";

GRANT SELECT ON public."department_clients" TO "authenticated";

ALTER TABLE public."departments" OWNER TO "postgres";

REVOKE ALL ON public."departments" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."departments" TO "postgres";

GRANT SELECT ON public."departments" TO "postgres";

GRANT UPDATE ON public."departments" TO "postgres";

GRANT DELETE ON public."departments" TO "postgres";

GRANT TRUNCATE ON public."departments" TO "postgres";

GRANT REFERENCES ON public."departments" TO "postgres";

GRANT TRIGGER ON public."departments" TO "postgres";

GRANT MAINTAIN ON public."departments" TO "postgres";

GRANT TRUNCATE ON public."departments" TO "service_role";

GRANT REFERENCES ON public."departments" TO "service_role";

GRANT TRIGGER ON public."departments" TO "service_role";

GRANT MAINTAIN ON public."departments" TO "service_role";

GRANT SELECT ON public."departments" TO "authenticated";

ALTER TABLE public."entities" OWNER TO "postgres";

REVOKE ALL ON public."entities" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."entities" TO "postgres";

GRANT SELECT ON public."entities" TO "postgres";

GRANT UPDATE ON public."entities" TO "postgres";

GRANT DELETE ON public."entities" TO "postgres";

GRANT TRUNCATE ON public."entities" TO "postgres";

GRANT REFERENCES ON public."entities" TO "postgres";

GRANT TRIGGER ON public."entities" TO "postgres";

GRANT MAINTAIN ON public."entities" TO "postgres";

GRANT TRUNCATE ON public."entities" TO "service_role";

GRANT REFERENCES ON public."entities" TO "service_role";

GRANT TRIGGER ON public."entities" TO "service_role";

GRANT MAINTAIN ON public."entities" TO "service_role";

GRANT SELECT ON public."entities" TO "authenticated";

ALTER TABLE public."profiles" OWNER TO "postgres";

REVOKE ALL ON public."profiles" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."profiles" TO "postgres";

GRANT SELECT ON public."profiles" TO "postgres";

GRANT UPDATE ON public."profiles" TO "postgres";

GRANT DELETE ON public."profiles" TO "postgres";

GRANT TRUNCATE ON public."profiles" TO "postgres";

GRANT REFERENCES ON public."profiles" TO "postgres";

GRANT TRIGGER ON public."profiles" TO "postgres";

GRANT MAINTAIN ON public."profiles" TO "postgres";

GRANT TRUNCATE ON public."profiles" TO "service_role";

GRANT REFERENCES ON public."profiles" TO "service_role";

GRANT TRIGGER ON public."profiles" TO "service_role";

GRANT MAINTAIN ON public."profiles" TO "service_role";

GRANT SELECT ON public."profiles" TO "authenticated";

ALTER TABLE public."project_entities" OWNER TO "postgres";

REVOKE ALL ON public."project_entities" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."project_entities" TO "postgres";

GRANT SELECT ON public."project_entities" TO "postgres";

GRANT UPDATE ON public."project_entities" TO "postgres";

GRANT DELETE ON public."project_entities" TO "postgres";

GRANT TRUNCATE ON public."project_entities" TO "postgres";

GRANT REFERENCES ON public."project_entities" TO "postgres";

GRANT TRIGGER ON public."project_entities" TO "postgres";

GRANT MAINTAIN ON public."project_entities" TO "postgres";

GRANT TRUNCATE ON public."project_entities" TO "service_role";

GRANT REFERENCES ON public."project_entities" TO "service_role";

GRANT TRIGGER ON public."project_entities" TO "service_role";

GRANT MAINTAIN ON public."project_entities" TO "service_role";

GRANT SELECT ON public."project_entities" TO "authenticated";

ALTER TABLE public."projects" OWNER TO "postgres";

REVOKE ALL ON public."projects" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."projects" TO "postgres";

GRANT SELECT ON public."projects" TO "postgres";

GRANT UPDATE ON public."projects" TO "postgres";

GRANT DELETE ON public."projects" TO "postgres";

GRANT TRUNCATE ON public."projects" TO "postgres";

GRANT REFERENCES ON public."projects" TO "postgres";

GRANT TRIGGER ON public."projects" TO "postgres";

GRANT MAINTAIN ON public."projects" TO "postgres";

GRANT TRUNCATE ON public."projects" TO "service_role";

GRANT REFERENCES ON public."projects" TO "service_role";

GRANT TRIGGER ON public."projects" TO "service_role";

GRANT MAINTAIN ON public."projects" TO "service_role";

GRANT SELECT ON public."projects" TO "authenticated";

ALTER VIEW public."reporting_task_entity_links" OWNER TO "postgres";

REVOKE ALL ON public."reporting_task_entity_links" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."reporting_task_entity_links" TO "postgres";

GRANT SELECT ON public."reporting_task_entity_links" TO "postgres";

GRANT UPDATE ON public."reporting_task_entity_links" TO "postgres";

GRANT DELETE ON public."reporting_task_entity_links" TO "postgres";

GRANT TRUNCATE ON public."reporting_task_entity_links" TO "postgres";

GRANT REFERENCES ON public."reporting_task_entity_links" TO "postgres";

GRANT TRIGGER ON public."reporting_task_entity_links" TO "postgres";

GRANT MAINTAIN ON public."reporting_task_entity_links" TO "postgres";

GRANT TRUNCATE ON public."reporting_task_entity_links" TO "service_role";

GRANT REFERENCES ON public."reporting_task_entity_links" TO "service_role";

GRANT TRIGGER ON public."reporting_task_entity_links" TO "service_role";

GRANT MAINTAIN ON public."reporting_task_entity_links" TO "service_role";

GRANT SELECT ON public."reporting_task_entity_links" TO "authenticated";

ALTER VIEW public."reporting_tasks" OWNER TO "postgres";

REVOKE ALL ON public."reporting_tasks" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."reporting_tasks" TO "postgres";

GRANT SELECT ON public."reporting_tasks" TO "postgres";

GRANT UPDATE ON public."reporting_tasks" TO "postgres";

GRANT DELETE ON public."reporting_tasks" TO "postgres";

GRANT TRUNCATE ON public."reporting_tasks" TO "postgres";

GRANT REFERENCES ON public."reporting_tasks" TO "postgres";

GRANT TRIGGER ON public."reporting_tasks" TO "postgres";

GRANT MAINTAIN ON public."reporting_tasks" TO "postgres";

GRANT TRUNCATE ON public."reporting_tasks" TO "service_role";

GRANT REFERENCES ON public."reporting_tasks" TO "service_role";

GRANT TRIGGER ON public."reporting_tasks" TO "service_role";

GRANT MAINTAIN ON public."reporting_tasks" TO "service_role";

GRANT SELECT ON public."reporting_tasks" TO "authenticated";

ALTER TABLE public."task_assignees" OWNER TO "postgres";

REVOKE ALL ON public."task_assignees" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."task_assignees" TO "postgres";

GRANT SELECT ON public."task_assignees" TO "postgres";

GRANT UPDATE ON public."task_assignees" TO "postgres";

GRANT DELETE ON public."task_assignees" TO "postgres";

GRANT TRUNCATE ON public."task_assignees" TO "postgres";

GRANT REFERENCES ON public."task_assignees" TO "postgres";

GRANT TRIGGER ON public."task_assignees" TO "postgres";

GRANT MAINTAIN ON public."task_assignees" TO "postgres";

GRANT TRUNCATE ON public."task_assignees" TO "service_role";

GRANT REFERENCES ON public."task_assignees" TO "service_role";

GRANT TRIGGER ON public."task_assignees" TO "service_role";

GRANT MAINTAIN ON public."task_assignees" TO "service_role";

GRANT SELECT ON public."task_assignees" TO "authenticated";

ALTER TABLE public."task_clients" OWNER TO "postgres";

REVOKE ALL ON public."task_clients" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."task_clients" TO "postgres";

GRANT SELECT ON public."task_clients" TO "postgres";

GRANT UPDATE ON public."task_clients" TO "postgres";

GRANT DELETE ON public."task_clients" TO "postgres";

GRANT TRUNCATE ON public."task_clients" TO "postgres";

GRANT REFERENCES ON public."task_clients" TO "postgres";

GRANT TRIGGER ON public."task_clients" TO "postgres";

GRANT MAINTAIN ON public."task_clients" TO "postgres";

GRANT TRUNCATE ON public."task_clients" TO "service_role";

GRANT REFERENCES ON public."task_clients" TO "service_role";

GRANT TRIGGER ON public."task_clients" TO "service_role";

GRANT MAINTAIN ON public."task_clients" TO "service_role";

GRANT SELECT ON public."task_clients" TO "authenticated";

ALTER TABLE public."task_entities" OWNER TO "postgres";

REVOKE ALL ON public."task_entities" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."task_entities" TO "postgres";

GRANT SELECT ON public."task_entities" TO "postgres";

GRANT UPDATE ON public."task_entities" TO "postgres";

GRANT DELETE ON public."task_entities" TO "postgres";

GRANT TRUNCATE ON public."task_entities" TO "postgres";

GRANT REFERENCES ON public."task_entities" TO "postgres";

GRANT TRIGGER ON public."task_entities" TO "postgres";

GRANT MAINTAIN ON public."task_entities" TO "postgres";

GRANT TRUNCATE ON public."task_entities" TO "service_role";

GRANT REFERENCES ON public."task_entities" TO "service_role";

GRANT TRIGGER ON public."task_entities" TO "service_role";

GRANT MAINTAIN ON public."task_entities" TO "service_role";

GRANT SELECT ON public."task_entities" TO "authenticated";

ALTER TABLE public."tasks" OWNER TO "postgres";

REVOKE ALL ON public."tasks" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."tasks" TO "postgres";

GRANT SELECT ON public."tasks" TO "postgres";

GRANT UPDATE ON public."tasks" TO "postgres";

GRANT DELETE ON public."tasks" TO "postgres";

GRANT TRUNCATE ON public."tasks" TO "postgres";

GRANT REFERENCES ON public."tasks" TO "postgres";

GRANT TRIGGER ON public."tasks" TO "postgres";

GRANT MAINTAIN ON public."tasks" TO "postgres";

GRANT TRUNCATE ON public."tasks" TO "service_role";

GRANT REFERENCES ON public."tasks" TO "service_role";

GRANT TRIGGER ON public."tasks" TO "service_role";

GRANT MAINTAIN ON public."tasks" TO "service_role";

GRANT SELECT ON public."tasks" TO "authenticated";

ALTER TABLE public."workspace_members" OWNER TO "postgres";

REVOKE ALL ON public."workspace_members" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."workspace_members" TO "postgres";

GRANT SELECT ON public."workspace_members" TO "postgres";

GRANT UPDATE ON public."workspace_members" TO "postgres";

GRANT DELETE ON public."workspace_members" TO "postgres";

GRANT TRUNCATE ON public."workspace_members" TO "postgres";

GRANT REFERENCES ON public."workspace_members" TO "postgres";

GRANT TRIGGER ON public."workspace_members" TO "postgres";

GRANT MAINTAIN ON public."workspace_members" TO "postgres";

GRANT TRUNCATE ON public."workspace_members" TO "service_role";

GRANT REFERENCES ON public."workspace_members" TO "service_role";

GRANT TRIGGER ON public."workspace_members" TO "service_role";

GRANT MAINTAIN ON public."workspace_members" TO "service_role";

GRANT SELECT ON public."workspace_members" TO "authenticated";

ALTER TABLE public."workspaces" OWNER TO "postgres";

REVOKE ALL ON public."workspaces" FROM PUBLIC, anon, authenticated, service_role;

GRANT INSERT ON public."workspaces" TO "postgres";

GRANT SELECT ON public."workspaces" TO "postgres";

GRANT UPDATE ON public."workspaces" TO "postgres";

GRANT DELETE ON public."workspaces" TO "postgres";

GRANT TRUNCATE ON public."workspaces" TO "postgres";

GRANT REFERENCES ON public."workspaces" TO "postgres";

GRANT TRIGGER ON public."workspaces" TO "postgres";

GRANT MAINTAIN ON public."workspaces" TO "postgres";

GRANT TRUNCATE ON public."workspaces" TO "service_role";

GRANT REFERENCES ON public."workspaces" TO "service_role";

GRANT TRIGGER ON public."workspaces" TO "service_role";

GRANT MAINTAIN ON public."workspaces" TO "service_role";

GRANT SELECT ON public."workspaces" TO "authenticated";

ALTER FUNCTION public."can_read_task"(w uuid, task_key bigint) OWNER TO "postgres";

REVOKE ALL ON FUNCTION public."can_read_task"(w uuid, task_key bigint) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."can_read_task"(w uuid, task_key bigint) TO "postgres";

GRANT EXECUTE ON FUNCTION public."can_read_task"(w uuid, task_key bigint) TO "authenticated";

ALTER FUNCTION public."current_workspace_role"(w uuid) OWNER TO "postgres";

REVOKE ALL ON FUNCTION public."current_workspace_role"(w uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."current_workspace_role"(w uuid) TO "postgres";

GRANT EXECUTE ON FUNCTION public."current_workspace_role"(w uuid) TO "authenticated";

ALTER FUNCTION public."is_workspace_member"(w uuid, admin_only boolean) OWNER TO "postgres";

REVOKE ALL ON FUNCTION public."is_workspace_member"(w uuid, admin_only boolean) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."is_workspace_member"(w uuid, admin_only boolean) TO "postgres";

GRANT EXECUTE ON FUNCTION public."is_workspace_member"(w uuid, admin_only boolean) TO "authenticated";

ALTER FUNCTION public."project_edition_unique"() OWNER TO "postgres";

ALTER FUNCTION public."rls_auto_enable"() OWNER TO "postgres";

REVOKE ALL ON FUNCTION public."rls_auto_enable"() FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."rls_auto_enable"() TO "postgres";

ALTER FUNCTION public."seed_catalog"(target_workspace uuid) OWNER TO "postgres";

REVOKE ALL ON FUNCTION public."seed_catalog"(target_workspace uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public."seed_catalog"(target_workspace uuid) TO "postgres";

ALTER FUNCTION public."touch_updated_at"() OWNER TO "postgres";

CREATE EVENT TRIGGER "ensure_rls" ON ddl_command_end WHEN TAG IN ('CREATE TABLE','CREATE TABLE AS','SELECT INTO') EXECUTE FUNCTION rls_auto_enable();

ALTER EVENT TRIGGER "ensure_rls" OWNER TO "postgres";

ALTER EVENT TRIGGER "ensure_rls" ENABLE;

ALTER SCHEMA "public" OWNER TO "pg_database_owner";

REVOKE ALL ON SCHEMA "public" FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA "public" TO "pg_database_owner";

GRANT CREATE ON SCHEMA "public" TO "pg_database_owner";

GRANT USAGE ON SCHEMA "public" TO PUBLIC;

GRANT USAGE ON SCHEMA "public" TO "postgres";

GRANT USAGE ON SCHEMA "public" TO "anon";

GRANT USAGE ON SCHEMA "public" TO "authenticated";

GRANT USAGE ON SCHEMA "public" TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT ON SEQUENCES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT USAGE ON SEQUENCES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT ON SEQUENCES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT USAGE ON SEQUENCES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT ON SEQUENCES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT USAGE ON SEQUENCES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT USAGE ON SEQUENCES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT INSERT ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT UPDATE ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT DELETE ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT TRUNCATE ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT REFERENCES ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT TRIGGER ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT MAINTAIN ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT INSERT ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT UPDATE ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT DELETE ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT TRUNCATE ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT REFERENCES ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT TRIGGER ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT MAINTAIN ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT INSERT ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT UPDATE ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT DELETE ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT TRUNCATE ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT REFERENCES ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT TRIGGER ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT MAINTAIN ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT INSERT ON TABLES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT SELECT ON TABLES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT UPDATE ON TABLES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT DELETE ON TABLES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT TRUNCATE ON TABLES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT REFERENCES ON TABLES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT TRIGGER ON TABLES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "supabase_admin" IN SCHEMA "public" GRANT MAINTAIN ON TABLES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM PUBLIC, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT ON SEQUENCES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON SEQUENCES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT USAGE ON SEQUENCES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM PUBLIC, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT EXECUTE ON FUNCTIONS TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT INSERT ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT SELECT ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT UPDATE ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT DELETE ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT TRUNCATE ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT TRIGGER ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT MAINTAIN ON TABLES TO "postgres";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT TRUNCATE ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT TRIGGER ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT MAINTAIN ON TABLES TO "anon";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT TRUNCATE ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT TRIGGER ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT MAINTAIN ON TABLES TO "authenticated";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT TRUNCATE ON TABLES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT REFERENCES ON TABLES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT TRIGGER ON TABLES TO "service_role";

ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT MAINTAIN ON TABLES TO "service_role";
