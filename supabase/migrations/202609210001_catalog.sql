-- v9 catalog additive preparation ONLY. Review/test against an isolated database first.
-- Does not activate sync, create memberships, or change any grants/RLS policies.
begin;
alter table public.projects alter column department_id drop not null;
alter table public.projects add column if not exists year integer check(year between 1000 and 9999);
-- Preserve edition text; exact numeric editions can be represented structurally.
update public.projects set year=trim(edition)::integer where year is null and trim(edition) ~ '^[1-9][0-9]{3}$';
alter table public.tasks add column if not exists department_detail text not null default '';
alter table public.tasks add column if not exists entity_detail text not null default '';
alter table public.tasks add column if not exists project_detail text not null default '';
alter table public.departments add column if not exists code text;
alter table public.departments add column if not exists sort_order integer not null default 0;
alter table public.departments add column if not exists seed_key text;
create unique index if not exists departments_seed_key on public.departments(workspace_id,seed_key) where seed_key is not null;
alter table public.entities add column if not exists code text;
alter table public.entities add column if not exists sort_order integer not null default 0;
alter table public.entities add column if not exists seed_key text;
create unique index if not exists entities_seed_key on public.entities(workspace_id,seed_key) where seed_key is not null;
alter table public.projects add column if not exists code text;
alter table public.projects add column if not exists sort_order integer not null default 0;
alter table public.projects add column if not exists seed_key text;
create unique index if not exists projects_seed_key on public.projects(workspace_id,seed_key) where seed_key is not null;
-- Protect new identities while keeping pre-existing duplicate identities unchanged.
create or replace function public.project_edition_unique() returns trigger language plpgsql set search_path='' as $$
begin
 if TG_OP='UPDATE' then
  if lower(trim(new.name))=lower(trim(old.name)) and new.year is not distinct from old.year and coalesce(new.edition,'')=coalesce(old.edition,'') and new.workspace_id=old.workspace_id then return new; end if;
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.workspace_id::text,0));
 if exists(select 1 from public.projects p where p.workspace_id=new.workspace_id and p.id<>new.id and lower(trim(p.name))=lower(trim(new.name)) and p.year is not distinct from new.year and (new.year is not null or lower(trim(coalesce(p.edition,'')))=lower(trim(coalesce(new.edition,''))))) then
  raise exception 'Project name/year or legacy edition already exists';
 end if;
 return new;
end; $$;
drop trigger if exists project_edition_unique on public.projects;
create trigger project_edition_unique before insert or update on public.projects for each row execute function public.project_edition_unique();
-- Trusted operator only. Call explicitly for a provisioned workspace, never browser/anon.
create or replace function public.seed_catalog(target_workspace uuid) returns void language plpgsql set search_path='' as $$
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
end; $$;
revoke all on function public.seed_catalog(uuid) from public,anon,authenticated;
commit;
