import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTask, normalizeWorkspace, recordTaskDates, taskTimestamp } from '../app/model.ts';
import { buildReport, reportRange, bratislavaDay, defaultReportFilters } from '../app/report-model.ts';

const stamp = '2026-10-20T10:00:00.000Z';
const later = '2026-10-21T11:00:00.000Z';
const task = (patch = {}) => normalizeTask({ id: 1, name: 'Úloha', slots: [], status: 'Backlog', ...patch });
const filters = patch => ({ ...defaultReportFilters, period: 'Vlastné obdobie', from: '2026-10-19', to: '2026-10-25', ...patch });
const ids = report => report.tasks.map(t => t.id);

test('task date lifecycle: create, complete, edit, reopen, complete again, duplicate', () => {
  const created = recordTaskDates(task(), undefined, stamp);
  assert.equal(created.createdAt, stamp); assert.equal(created.completedAt, undefined);
  const done = recordTaskDates({ ...created, status: 'Hotovo' }, created, later);
  assert.equal(done.completedAt, later); assert.equal(done.createdAt, stamp);
  const edited = recordTaskDates({ ...done, name: 'Upravené' }, done, '2026-10-22T10:00:00Z');
  assert.equal(edited.completedAt, later);
  const reopened = recordTaskDates({ ...done, status: 'Dnes' }, done, later);
  assert.equal(reopened.completedAt, undefined);
  assert.equal(recordTaskDates({ ...reopened, status: 'Hotovo' }, reopened, stamp).completedAt, stamp);
  const duplicate = recordTaskDates({ ...done, id: 2, status: 'Backlog' }, undefined, later);
  assert.equal(duplicate.createdAt, later); assert.equal(duplicate.completedAt, undefined);
  assert.equal(recordTaskDates(task({ status: 'Hotovo' }), undefined, stamp).completedAt, stamp);
});

test('legacy completed tasks stay undated during normalization and edits', () => {
  const legacy = task({ status: 'Hotovo' });
  const edited = recordTaskDates({ ...legacy, name: 'Nový názov' }, legacy, stamp);
  assert.equal(edited.createdAt, undefined); assert.equal(edited.completedAt, undefined);
  assert.equal(task({ createdAt: 'zlé', completedAt: '2026-02-30T10:00:00Z' }).completedAt, undefined);
  assert.equal(taskTimestamp('2026-10-20'), undefined);
});

test('workspace JSON export/import preserves dates and legacy compatibility without changing schema', () => {
  const workspace = normalizeWorkspace({ tasks: [task({ createdAt: stamp, completedAt: later, status: 'Hotovo' }), task({ id: 2 })] });
  const restored = normalizeWorkspace(JSON.parse(JSON.stringify(workspace)));
  assert.deepEqual(restored, workspace);
  assert.equal(restored.schemaVersion, 6);
  assert.equal(restored.tasks[0].createdAt, stamp);
  assert.equal(restored.tasks[0].completedAt, later);
  assert.equal(restored.tasks[1].createdAt, undefined);
  for (const version of [1, 2, 3, 4, 5]) {
    const old = normalizeWorkspace({ ...workspace, schemaVersion: version, tasks: [task({ status: 'Hotovo' })] });
    assert.equal(old.tasks[0].completedAt, undefined);
  }
});

test('Bratislava dates include the entire final day and exclude the next midnight', () => {
  const data = [task({ id: 1, completedAt: '2026-10-18T22:00:00Z', status: 'Hotovo' }), task({ id: 2, completedAt: '2026-10-25T22:59:59Z' }), task({ id: 3, completedAt: '2026-10-25T23:00:00Z' })];
  assert.deepEqual(ids(buildReport(data, filters())), [1, 2]);
  assert.equal(bratislavaDay('2026-03-29T00:59:59Z'), '2026-03-29');
  assert.equal(bratislavaDay('2026-03-29T01:00:00Z'), '2026-03-29');
  assert.equal(bratislavaDay('2026-10-25T00:30:00Z'), '2026-10-25');
  assert.equal(bratislavaDay('2026-10-25T01:30:00Z'), '2026-10-25');
});

test('periods use Bratislava even when UTC is still the preceding day/year', () => {
  const ref = new Date('2026-10-18T22:30:00Z');
  assert.equal(reportRange(defaultReportFilters, ref).start, '2026-10-19');
  assert.equal(reportRange({ ...defaultReportFilters, period: 'Minulý týždeň' }, ref).start, '2026-10-12');
  assert.deepEqual(reportRange({ ...defaultReportFilters, period: 'Minulý mesiac' }, new Date('2024-03-15T12:00:00Z')), { start: '2024-02-01', end: '2024-02-29', valid: true, error: '' });
  assert.equal(reportRange({ ...defaultReportFilters, period: 'Tento rok' }, new Date('2025-12-31T23:30:00Z')).start, '2026-01-01');
  assert.equal(reportRange({ ...defaultReportFilters, period: 'Tento mesiac' }, ref).end, '2026-10-31');
  assert.equal(reportRange({ ...defaultReportFilters, period: 'Minulý mesiac' }, new Date('2026-01-15T12:00:00Z')).start, '2025-12-01');
});

test('invalid custom periods show no counts or stale results', () => {
  for (const patch of [{ from: '' }, { to: '2026-10-01' }, { from: '2026-02-30' }]) {
    const report = buildReport([task({ completedAt: stamp })], filters(patch));
    assert.equal(report.range.valid, false); assert.equal(report.total, 0);
  }
});

test('department, secondary entity, project, status, priority and date combine with AND', () => {
  const base = { completedAt: stamp, projectId: 11, campaignId: 22, entityId: 33, entityIds: [33, 44], status: 'Hotovo', priority: 'Vysoka' };
  const data = [task(base), task({ ...base, id: 2, projectId: 12 }), task({ ...base, id: 3, campaignId: 23 }), task({ ...base, id: 4, entityId: null, entityIds: [] }), task({ ...base, id: 5, status: 'Caka' }), task({ ...base, id: 6, priority: 'Nizka' }), task({ ...base, id: 7, completedAt: '2026-01-01T12:00:00Z' })];
  assert.deepEqual(ids(buildReport(data, filters({ department: '11', project: '22', entity: '44', status: 'Hotovo', priority: 'Vysoka' }))), [1]);
  assert.equal(buildReport(data, filters({ entity: '33' })).total, 5);
});

test('unassigned filters do not infer classifications from names or project relations', () => {
  const data = [task({ completedAt: stamp, projectId: null, campaignId: null, entityId: null }), task({ id: 2, completedAt: stamp, projectId: 1 })];
  assert.deepEqual(ids(buildReport(data, filters({ department: 'none', entity: 'none', project: 'none' }))), [1]);
});

test('multiple entities, repeated IDs and overlapping blocks count each task once', () => {
  const t = task({ entityId: 1, entityIds: [1, 2], slots: [{ id: 1, day: '2026-10-20', startHour: 9, duration: 1 }, { id: 2, day: '2026-10-20', startHour: 9.5, duration: 2 }] });
  const report = buildReport([t, t], filters({ dateType: 'Dátum pracovného bloku', entity: '2' }));
  assert.equal(report.total, 1); assert.deepEqual(ids(report), [1]);
});

test('blocks overlap the interval but an exact midnight end does not enter the next day', () => {
  const t = task({ slots: [{ id: 1, day: '2026-10-18', startHour: 23, duration: 2 }] });
  assert.equal(buildReport([t], filters({ dateType: 'Dátum pracovného bloku' })).total, 1);
  const midnight = task({ slots: [{ id: 1, day: '2026-10-18', startHour: 23, duration: 1 }] });
  assert.equal(buildReport([midnight], filters({ dateType: 'Dátum pracovného bloku' })).total, 0);
});

test('missing date information respects all non-date filters and does not invent history', () => {
  const data = [task({ projectId: 1, status: 'Hotovo' }), task({ id: 2, projectId: 2 }), task({ id: 3, projectId: 1, completedAt: stamp, status: 'Hotovo' })];
  const report = buildReport(data, filters({ department: '1', status: 'Hotovo' }));
  assert.equal(report.missingDateCount, 1); assert.equal(report.done, 1); assert.equal(report.total, 1);
  assert.equal(buildReport([], filters()).missingDateCount, 0);
});

test('created date, due date and completion are independent; counts match returned tasks', () => {
  const data = [task({ status: 'Hotovo', due: '2026-10-20', createdAt: '2026-01-01T12:00:00Z' }), task({ id: 2, due: '2026-10-21', status: 'Dnes', createdAt: stamp })];
  const report = buildReport(data, filters({ dateType: 'Termín' }));
  assert.equal(report.total, report.tasks.length); assert.equal(report.done, 1); assert.equal(report.active, 1);
  assert.deepEqual(ids(buildReport(data, filters({ dateType: 'Dátum vytvorenia' }))), [2]);
  assert.equal(buildReport(data, filters()).done, 0);
});
