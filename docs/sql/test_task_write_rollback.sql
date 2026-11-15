-- TEST-only bezpečnostný rollback; po samostatnom schválení v transakcii.
-- Zachová všetky údaje, verzie, idempotentné kľúče a pôvodný read-only režim.
REVOKE INSERT (workspace_id,title,status,priority,create_request_id) ON public.tasks FROM authenticated;
REVOKE UPDATE (title,status,priority,write_version) ON public.tasks FROM authenticated;
DROP POLICY test_tasks_insert ON public.tasks;
DROP POLICY test_tasks_update ON public.tasks;
DROP POLICY test_tasks_read_created ON public.tasks;
REVOKE USAGE ON SEQUENCE public.test_tasks_id_seq FROM authenticated;
-- Trigger a metadáta zostanú ako ochrana a audit; bez DELETE a CASCADE.
