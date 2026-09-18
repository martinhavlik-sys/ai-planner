import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeWorkspace, normalizeTask, effectiveClientId, newId } from '../app/model.ts';

const legacy = () => ({
  tasks: [{ id: 10, name: 'Task', project: 'Project', owner: 'Owner', due: 'Piatok', day: 'Utorok', startHour: 10, duration: 2, note: 'Keep me', checklist: [{ id: 1, text: 'Done', done: true }], activity: ['Created'] }],
  projects: [{ id: 20, name: 'Project', owner: 'Owner' }],
  team: [{ id: 30, name: 'Owner', role: 'Designer', capacity: 80 }],
  goals: [{ id: 40, title: 'Keep goal', project: 'Project' }]
});

test('legacy migration preserves records and creates stable ID links', () => {
  const input = legacy(); const before = JSON.stringify(input);
  const data = normalizeWorkspace(input);
  assert.equal(JSON.stringify(input), before);
  assert.equal(data.tasks[0].id, 10);
  assert.equal(data.tasks[0].projectId, 20);
  assert.equal(data.tasks[0].ownerId, 30);
  assert.equal(data.projects[0].ownerId, 30);
  assert.equal(data.tasks[0].slots[0].taskId, 10);
  assert.equal(data.tasks[0].slots[0].day, 'Utorok');
  assert.equal(data.tasks[0].due, 'Piatok');
  assert.equal(data.tasks[0].note, 'Keep me');
  assert.equal(data.tasks[0].checklist[0].done, true);
  assert.deepEqual(data.tasks[0].activity, ['Created']);
  assert.equal(data.goals[0].title, 'Keep goal');
});

test('normalization and JSON roundtrip are idempotent', () => {
  const data = normalizeWorkspace(legacy());
  assert.deepEqual(normalizeWorkspace(JSON.parse(JSON.stringify(data))), data);
});

test('migration creates missing legacy projects and owners only once', () => {
  const data = normalizeWorkspace({ tasks: [...legacy().tasks, { id: 11, project: 'Project', owner: 'Owner', day: 'Neskor' }] });
  assert.equal(data.projects.length, 1); assert.equal(data.team.length, 1);
  assert.equal(data.tasks[0].projectId, data.tasks[1].projectId);
  assert.equal(data.tasks[0].ownerId, data.tasks[1].ownerId);
});

test('explicitly empty blocks stay empty after save and reload', () => {
  const data = normalizeWorkspace({ ...legacy(), tasks: [{ ...legacy().tasks[0], slots: [] }] });
  assert.deepEqual(data.tasks[0].slots, []);
  assert.equal(data.tasks[0].day, 'Neskor');
  assert.deepEqual(normalizeWorkspace(data).tasks[0].slots, []);
  assert.equal(data.tasks[0].duration, 2);
});

test('multiple blocks preserve IDs, timing and repair taskId', () => {
  const data = normalizeWorkspace({ ...legacy(), tasks: [{ ...legacy().tasks[0], slots: [
    { id: 101, taskId: 999, day: 'Utorok', startHour: 10, duration: 2 },
    { id: 102, day: 'Vikend', startHour: 14.5, duration: 0.5 }
  ] }] });
  const slots = data.tasks[0].slots;
  assert.deepEqual(slots.map(s => s.id), [101, 102]);
  assert.ok(slots.every(s => s.taskId === 10));
  assert.equal(slots[1].startHour, 14.5);
  assert.deepEqual(normalizeWorkspace(data).tasks[0].slots, slots);
});

test('removing one block preserves other blocks and final removal stays unscheduled', () => {
  const task = normalizeTask({ id: 10, slots: [{ id: 1, taskId: 10, day: 'Dnes', startHour: 9, duration: 1 }, { id: 2, taskId: 10, day: 'Streda', startHour: 11, duration: 2 }] });
  const remaining = normalizeTask({ ...task, slots: task.slots.slice(1) });
  assert.equal(remaining.day, 'Streda'); assert.equal(remaining.slots[0].id, 2);
  assert.equal(normalizeTask({ ...remaining, slots: [] }).day, 'Neskor');
});

test('ID references survive stale names, rename and null assignments', () => {
  const data = normalizeWorkspace(legacy());
  data.projects[0].name = 'Renamed'; data.team[0].name = 'Renamed owner';
  let next = normalizeWorkspace(data);
  assert.equal(next.tasks[0].project, 'Renamed'); assert.equal(next.tasks[0].owner, 'Renamed owner');
  next.tasks[0].projectId = null; next.tasks[0].ownerId = null;
  next.projects[0].ownerId = null;
  next = normalizeWorkspace(next);
  assert.equal(next.tasks[0].projectId, null); assert.equal(next.tasks[0].project, '');
  assert.equal(next.tasks[0].ownerId, null); assert.equal(next.projects[0].ownerId, null);
});

test('clients inherit through projects and task override takes precedence', () => {
  const data = normalizeWorkspace(legacy());
  data.clients = [{ id: 50, name: 'A' }, { id: 51, name: 'B' }];
  data.projects[0].clientId = 50;
  assert.equal(effectiveClientId(data.tasks[0], data.projects), 50);
  data.tasks[0].clientId = 51;
  const next = normalizeWorkspace(data);
  assert.equal(effectiveClientId(next.tasks[0], next.projects), 51);
  next.tasks[0].clientId = null;
  assert.equal(effectiveClientId(next.tasks[0], next.projects), 50);
});

test('invalid schema, duplicate IDs and dangling links are rejected', () => {
  assert.throws(() => normalizeWorkspace({ schemaVersion: 2, tasks: [] }));
  assert.throws(() => normalizeWorkspace({ tasks: [{ id: 1 }, { id: 1 }] }));
  assert.throws(() => normalizeWorkspace({ tasks: [{ id: '1' }] }));
  assert.throws(() => normalizeWorkspace({ tasks: [{ id: 1, slots: [{ id: 2 }, { id: 2 }] }] }));
  for (const field of ['projectId', 'ownerId', 'clientId']) {
    const data = normalizeWorkspace(legacy()); data.tasks[0][field] = 999;
    assert.throws(() => normalizeWorkspace(data));
  }
});

test('empty workspace remains empty and generated IDs are unique safe integers', () => {
  const data = normalizeWorkspace({ schemaVersion: 1, tasks: [], projects: [], team: [], clients: [], goals: [] });
  assert.deepEqual(data.tasks, []); assert.deepEqual(data.projects, []);
  const ids = Array.from({ length: 2000 }, newId);
  assert.equal(new Set(ids).size, ids.length); assert.ok(ids.every(Number.isSafeInteger));
});
