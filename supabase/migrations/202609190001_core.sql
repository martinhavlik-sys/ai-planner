-- Foundation only. No browser writes are granted in this phase.
-- Apply manually after review on a fresh Supabase project; never reset production.
begin;
create table public.workspaces (
 id uuid primary key default gen_random_uuid(), name text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz
);
create table public.workspace_members (
 workspace_id uuid references public.workspaces(id) on delete restrict,
 user_id uuid references auth.users(id) on delete restrict,
 role text not null check (role in ('owner','admin','member')),
 created_at timestamptz not null default now(), primary key(workspace_id,user_id)
);
-- SECURITY DEFINER helper avoids recursive membership RLS. No write capability.
create function public.is_workspace_member(w uuid, admin_only boolean default false)
returns boolean language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.workspace_members m where m.workspace_id=w
 and m.user_id=(select auth.uid()) and (not admin_only or m.role in ('owner','admin')));
$$;
revoke all on function public.is_workspace_member(uuid,boolean) from public, anon;
grant execute on function public.is_workspace_member(uuid,boolean) to authenticated;
alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
create policy workspace_read on public.workspaces for select to authenticated using(public.is_workspace_member(id));
create policy membership_read on public.workspace_members for select to authenticated using(user_id=(select auth.uid()));
create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end; $$;
create table public.clients (
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 id bigint not null check(id>0 and id<=9007199254740991),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 name text not null check (length(trim(name))>0), email text, note text, primary key(workspace_id,id)
);
alter table public.clients enable row level security;
create policy clients_read on public.clients for select to authenticated using(public.is_workspace_member(workspace_id, true));
create trigger touch_clients before update on public.clients for each row execute function public.touch_updated_at();
create table public.departments (
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 id bigint not null check(id>0 and id<=9007199254740991),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 name text not null check (length(trim(name))>0), color text not null default '#4285F4', primary key(workspace_id,id)
);
alter table public.departments enable row level security;
create policy departments_read on public.departments for select to authenticated using(public.is_workspace_member(workspace_id, false));
create trigger touch_departments before update on public.departments for each row execute function public.touch_updated_at();
create table public.entities (
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 id bigint not null check(id>0 and id<=9007199254740991),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 name text not null check (length(trim(name))>0), primary key(workspace_id,id)
);
alter table public.entities enable row level security;
create policy entities_read on public.entities for select to authenticated using(public.is_workspace_member(workspace_id, false));
create trigger touch_entities before update on public.entities for each row execute function public.touch_updated_at();
create table public.profiles (
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 id bigint not null check(id>0 and id<=9007199254740991),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 auth_user_id uuid references auth.users(id) on delete restrict, name text not null, email text, initials text, avatar_color text, photo text, legacy jsonb not null default '{}'::jsonb, primary key(workspace_id,id)
);
alter table public.profiles enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(public.is_workspace_member(workspace_id, false));
create trigger touch_profiles before update on public.profiles for each row execute function public.touch_updated_at();
create table public.projects (
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 id bigint not null check(id>0 and id<=9007199254740991),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 name text not null check (length(trim(name))>0), department_id bigint not null, edition text, foreign key(workspace_id,department_id) references public.departments(workspace_id,id), primary key(workspace_id,id)
);
alter table public.projects enable row level security;
create policy projects_read on public.projects for select to authenticated using(public.is_workspace_member(workspace_id, false));
create trigger touch_projects before update on public.projects for each row execute function public.touch_updated_at();
create table public.project_entities (
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 id bigint not null check(id>0 and id<=9007199254740991),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 project_id bigint not null, entity_id bigint not null, foreign key(workspace_id,project_id) references public.projects(workspace_id,id), foreign key(workspace_id,entity_id) references public.entities(workspace_id,id), unique(workspace_id,project_id,entity_id), primary key(workspace_id,id)
);
alter table public.project_entities enable row level security;
create policy project_entities_read on public.project_entities for select to authenticated using(public.is_workspace_member(workspace_id, false));
create trigger touch_project_entities before update on public.project_entities for each row execute function public.touch_updated_at();
create table public.department_clients (
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 id bigint not null check(id>0 and id<=9007199254740991),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 department_id bigint not null, client_id bigint not null, foreign key(workspace_id,department_id) references public.departments(workspace_id,id), foreign key(workspace_id,client_id) references public.clients(workspace_id,id), unique(workspace_id,department_id), primary key(workspace_id,id)
);
alter table public.department_clients enable row level security;
create policy department_clients_read on public.department_clients for select to authenticated using(public.is_workspace_member(workspace_id, true));
create trigger touch_department_clients before update on public.department_clients for each row execute function public.touch_updated_at();
create table public.tasks (
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 id bigint not null check(id>0 and id<=9007199254740991),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 title text not null check (length(trim(title))>0), department_id bigint, entity_id bigint, project_id bigint, priority text not null default 'Stredna' check(priority in ('Nizka','Stredna','Vysoka')), status text check(status in ('Backlog','Dnes','Robi sa','Caka','Hotovo')), due_date date, note text, checklist jsonb not null default '[]'::jsonb, legacy jsonb not null default '{}'::jsonb, foreign key(workspace_id,department_id) references public.departments(workspace_id,id), foreign key(workspace_id,entity_id) references public.entities(workspace_id,id), foreign key(workspace_id,project_id) references public.projects(workspace_id,id), primary key(workspace_id,id)
);
alter table public.tasks enable row level security;
create policy tasks_read on public.tasks for select to authenticated using(public.is_workspace_member(workspace_id, false));
create trigger touch_tasks before update on public.tasks for each row execute function public.touch_updated_at();
create table public.task_clients (
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 id bigint not null check(id>0 and id<=9007199254740991),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 task_id bigint not null, client_id bigint not null, foreign key(workspace_id,task_id) references public.tasks(workspace_id,id), foreign key(workspace_id,client_id) references public.clients(workspace_id,id), unique(workspace_id,task_id), primary key(workspace_id,id)
);
alter table public.task_clients enable row level security;
create policy task_clients_read on public.task_clients for select to authenticated using(public.is_workspace_member(workspace_id, true));
create trigger touch_task_clients before update on public.task_clients for each row execute function public.touch_updated_at();
create table public.task_assignees (
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 id bigint not null check(id>0 and id<=9007199254740991),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 task_id bigint not null, profile_id bigint not null, foreign key(workspace_id,task_id) references public.tasks(workspace_id,id), foreign key(workspace_id,profile_id) references public.profiles(workspace_id,id), unique(workspace_id,task_id,profile_id), primary key(workspace_id,id)
);
alter table public.task_assignees enable row level security;
create policy task_assignees_read on public.task_assignees for select to authenticated using(public.is_workspace_member(workspace_id, false));
create trigger touch_task_assignees before update on public.task_assignees for each row execute function public.touch_updated_at();
create table public.calendar_slots (
 workspace_id uuid not null references public.workspaces(id) on delete restrict,
 id bigint not null check(id>0 and id<=9007199254740991),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), archived_at timestamptz,
 task_id bigint not null, day date not null, start_hour numeric not null check(start_hour>=0 and start_hour<=23.75), duration numeric not null check(duration>=0.25 and duration<=24), foreign key(workspace_id,task_id) references public.tasks(workspace_id,id), primary key(workspace_id,id)
);
alter table public.calendar_slots enable row level security;
create policy calendar_slots_read on public.calendar_slots for select to authenticated using(public.is_workspace_member(workspace_id, false));
create trigger touch_calendar_slots before update on public.calendar_slots for each row execute function public.touch_updated_at();
create index tasks_department_id_idx on public.tasks(workspace_id,department_id);
create index tasks_entity_id_idx on public.tasks(workspace_id,entity_id);
create index tasks_project_id_idx on public.tasks(workspace_id,project_id);
create index projects_department_id_idx on public.projects(workspace_id,department_id);
create index project_entities_entity_id_idx on public.project_entities(workspace_id,entity_id);
create index task_assignees_profile_id_idx on public.task_assignees(workspace_id,profile_id);
create index calendar_slots_task_id_idx on public.calendar_slots(workspace_id,task_id);
create index calendar_slots_day_idx on public.calendar_slots(workspace_id,day);
create index department_clients_client_id_idx on public.department_clients(workspace_id,client_id);
create index task_clients_client_id_idx on public.task_clients(workspace_id,client_id);
-- Explicit deny-by-default even if the hosting project has permissive defaults.
revoke all on public.workspaces from anon, authenticated;
grant select on public.workspaces to authenticated;
revoke all on public.workspace_members from anon, authenticated;
grant select on public.workspace_members to authenticated;
revoke all on public.clients from anon, authenticated;
grant select on public.clients to authenticated;
revoke all on public.departments from anon, authenticated;
grant select on public.departments to authenticated;
revoke all on public.entities from anon, authenticated;
grant select on public.entities to authenticated;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
revoke all on public.projects from anon, authenticated;
grant select on public.projects to authenticated;
revoke all on public.project_entities from anon, authenticated;
grant select on public.project_entities to authenticated;
revoke all on public.department_clients from anon, authenticated;
grant select on public.department_clients to authenticated;
revoke all on public.tasks from anon, authenticated;
grant select on public.tasks to authenticated;
revoke all on public.task_clients from anon, authenticated;
grant select on public.task_clients to authenticated;
revoke all on public.task_assignees from anon, authenticated;
grant select on public.task_assignees to authenticated;
revoke all on public.calendar_slots from anon, authenticated;
grant select on public.calendar_slots to authenticated;
commit;
