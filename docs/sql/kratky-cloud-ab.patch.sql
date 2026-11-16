-- LOKÁLNY NÁVRH, NEAPLIKOVANÝ. V tej istej TEST transakcii po pôvodnom návrhu Z1.
-- Pred použitím overiť, že oba nové workspace sú voľné a budú patriť iba novým účtom.
-- Nenulový request sa povoľuje iba v dvoch nových syntetických workspace.
ALTER TABLE public.tasks ADD CONSTRAINT test_tasks_scope_check CHECK (
 create_request_id IS NULL OR workspace_id IN (
 '00000000-0000-4000-8000-000000008a01'::uuid,
 '00000000-0000-4000-8000-000000008b01'::uuid));
-- Nahrádza globálnu kvótu 1 kvótou 1 na účet/workspace pre tento A/B scenár.
DROP INDEX public.test_tasks_single_probe;
CREATE UNIQUE INDEX test_tasks_single_probe ON public.tasks(workspace_id,created_by_user_id)
 WHERE create_request_id IS NOT NULL;
