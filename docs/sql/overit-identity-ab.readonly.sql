-- NEVYKONANÝ návrh: až po objasnení zákazu SQL alebo cez schválenú read-only cestu.
-- Vstupy psql email_a/email_b zadá operátor bezpečne; hodnoty neukladať do repozitára.
-- Výstup neobsahuje email, Auth UUID, profil ID, názov workspace ani prihlasovacie údaje.
BEGIN READ ONLY;
WITH requested(oznacenie,email) AS (
 VALUES ('A',lower(btrim(:'email_a'))),('B',lower(btrim(:'email_b')))
), memberships AS (
 SELECT r.oznacenie,u.id AS uid,u.email_confirmed_at,u.deleted_at,u.banned_until,u.is_anonymous,u.role AS auth_role,
        m.workspace_id,m.role,w.archived_at AS workspace_archived,
        (SELECT count(*) FROM public.profiles p WHERE p.auth_user_id=u.id
          AND p.workspace_id=m.workspace_id AND p.archived_at IS NULL) AS active_profiles
 FROM requested r LEFT JOIN auth.users u ON lower(u.email)=r.email
 LEFT JOIN public.workspace_members m ON m.user_id=u.id
 LEFT JOIN public.workspaces w ON w.id=m.workspace_id
)
SELECT oznacenie,count(DISTINCT uid) AS auth_identity_count,
       coalesce(bool_and(auth_role='authenticated' AND email_confirmed_at IS NOT NULL AND deleted_at IS NULL
         AND (banned_until IS NULL OR banned_until<now()) AND NOT coalesce(is_anonymous,false)),false) AS auth_ready,
       coalesce(jsonb_agg(DISTINCT jsonb_build_object(
         'workspace',CASE workspace_id
           WHEN '00000000-0000-0000-0000-000000004a01'::uuid THEN 'workspace A'
           WHEN '00000000-0000-0000-0000-000000004b01'::uuid THEN 'workspace B'
           ELSE 'NEOVERENÝ workspace' END,
         'rola',role,'aktivny_workspace',workspace_archived IS NULL,
         'aktivne_profily',active_profiles)) FILTER (WHERE workspace_id IS NOT NULL),'[]'::jsonb) AS membership_chain
FROM memberships GROUP BY oznacenie ORDER BY oznacenie;
ROLLBACK;
