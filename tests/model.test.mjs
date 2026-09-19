import assert from 'node:assert/strict';
import test from 'node:test';
import { matchesAssignments, removeEntity } from '../app/model.ts';
import { normalizeWorkspace, normalizeTask, effectiveClientId, newId, calendarDate, localDate, addDays, monday, rangeDays, layoutSlots, timeLabel, calendarSegments } from '../app/model.ts';

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
  assert.equal(data.tasks[0].slots[0].day, calendarDate('Utorok'));
  assert.equal(data.tasks[0].due, '');
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
  assert.equal(data.projects.length, 1); assert.equal(data.users.length, 2);
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
  assert.equal(remaining.day, calendarDate('Streda')); assert.equal(remaining.slots[0].id, 2);
  assert.equal(normalizeTask({ ...remaining, slots: [] }).day, 'Neskor');
});

test('ID references survive stale names, rename and null assignments', () => {
  const data = normalizeWorkspace(legacy());
  data.projects[0].name = 'Renamed'; data.users[0].name = 'Renamed owner';
  let next = normalizeWorkspace(data);
  assert.equal(next.tasks[0].project, 'Renamed'); assert.equal(next.tasks[0].owner, 'Renamed owner');
  next.tasks[0].projectId = null; next.tasks[0].ownerIds = [];
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
  assert.throws(() => normalizeWorkspace({ schemaVersion: 99, tasks: [] }));
  assert.throws(() => normalizeWorkspace({ tasks: [{ id: 1 }, { id: 1 }] }));
  assert.throws(() => normalizeWorkspace({ tasks: [{ id: '1' }] }));
  assert.throws(() => normalizeWorkspace({ tasks: [{ id: 1, slots: [{ id: 2 }, { id: 2 }] }] }));
  for (const field of ['projectId', 'entityId', 'clientId']) {
    const data = normalizeWorkspace(legacy()); data.tasks[0][field] = 999;
    assert.throws(() => normalizeWorkspace(data));
  }
});

test('schema 1 migrates tasks to no entity without losing existing data', () => {
  const old = normalizeWorkspace(legacy(), '2026-09-18');
  old.schemaVersion = 1; delete old.entities;
  old.tasks.forEach(task => delete task.entityId);
  const before = JSON.stringify(old);
  const migrated = normalizeWorkspace(old, '2026-09-18');
  assert.equal(migrated.schemaVersion, 5);
  assert.deepEqual(migrated.entities, []);
  assert.equal(migrated.tasks[0].entityId, null);
  const restored = JSON.parse(JSON.stringify(migrated));
  restored.schemaVersion = 1; delete restored.entities;
  restored.tasks.forEach(task => delete task.entityId);
  assert.deepEqual(restored, JSON.parse(before));
  assert.equal(JSON.stringify(old), before);
});

test('department and entity filters combine independently, including no entity', () => {
  const tasks = [[20, 50], [20, 51], [21, 50], [21, null]].map(([projectId, entityId], i) => normalizeTask({ id: i + 1, projectId, entityId, slots: [] }));
  const ids = (project, entity) => tasks.filter(t => matchesAssignments(t, project, entity)).map(t => t.id);
  assert.deepEqual(ids(null, 'all'), [1, 2, 3, 4]);
  assert.deepEqual(ids(20, 'all'), [1, 2]);
  assert.deepEqual(ids(null, 50), [1, 3]);
  assert.deepEqual(ids(20, 50), [1]);
  assert.deepEqual(ids(20, 51), [2]);
  assert.deepEqual(ids(20, null), []);
  assert.deepEqual(ids(null, null), [4]);
});

test('entity export/import and rename preserve independent IDs and client links', () => {
  const data = normalizeWorkspace(legacy());
  data.entities = [{ id: 50, name: 'Nemocnica Bory' }, { id: 51, name: 'ProCare Betliarska' }];
  data.clients = [{ id: 60, name: 'Separate client', email: '', note: '' }];
  data.tasks[0].entityId = 50; data.tasks[0].clientId = 60;
  assert.deepEqual(normalizeWorkspace(JSON.parse(JSON.stringify(data))), data);
  data.entities[0].name = 'Nový názov';
  const imported = normalizeWorkspace(JSON.parse(JSON.stringify(data)));
  assert.equal(imported.tasks[0].entityId, 50);
  assert.equal(imported.tasks[0].projectId, 20);
  assert.equal(imported.tasks[0].clientId, 60);
  assert.equal(imported.entities[0].name, 'Nový názov');
  assert.throws(() => normalizeWorkspace({ ...data, entities: [{ id: 50, name: '' }] }));
  assert.throws(() => normalizeWorkspace({ ...data, entities: [data.entities[0], data.entities[0]] }));
});

test('entity deletion is blocked until all tasks, including completed ones, are reassigned', () => {
  const entities = [{ id: 50, name: 'Bory' }, { id: 51, name: 'Other' }];
  const tasks = [normalizeTask({ entityId: 50, status: 'Hotovo', slots: [] })];
  assert.throws(() => removeEntity(entities, tasks, 50), /Najprv zmeňte priradenie/);
  assert.equal(entities.length, 2);
  assert.deepEqual(removeEntity(entities, tasks, 51), [entities[0]]);
  tasks[0].entityId = null;
  assert.deepEqual(removeEntity(entities, tasks, 50), [entities[1]]);
});

test('empty workspace remains empty and generated IDs are unique safe integers', () => {
  const data = normalizeWorkspace({ schemaVersion: 1, tasks: [], projects: [], team: [], clients: [], goals: [] });
  assert.deepEqual(data.tasks, []); assert.deepEqual(data.projects, []);
  const ids = Array.from({ length: 2000 }, newId);
  assert.equal(new Set(ids).size, ids.length); assert.ok(ids.every(Number.isSafeInteger));
});

test('legacy dates map into local current week and persist without rolling forward', () => {
  const anchor = '2026-09-18';
  for (const [label, expected] of [['Dnes', anchor], ['Pondelok', '2026-09-14'], ['Utorok', '2026-09-15'], ['Štvrtok', '2026-09-17'], ['Víkend', '2026-09-19'], ['Nedela', '2026-09-20'], ['custom', anchor]]) {
    assert.equal(calendarDate(label, anchor), expected);
  }
  const data = normalizeWorkspace(legacy(), anchor);
  assert.deepEqual(normalizeWorkspace(data, '2027-01-01'), data);
  assert.equal(data.tasks[0].slots[0].day, '2026-09-15');
  assert.equal(calendarDate('2024-02-29', anchor), '2024-02-29');
  assert.equal(calendarDate('2026-02-30', anchor), anchor);
});

test('ranges cross month, year, weekend and daylight saving boundaries', () => {
  assert.deepEqual(rangeDays('2026-12-31', '3'), ['2026-12-31', '2027-01-01', '2027-01-02']);
  assert.deepEqual(rangeDays('2026-09-20', 'work'), ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17', '2026-09-18']);
  assert.equal(rangeDays('2026-09-20', 'week')[6], '2026-09-20');
  assert.equal(rangeDays('2026-09-18', '5')[4], '2026-09-22');
  assert.equal(addDays('2026-03-28', 2), '2026-03-30');
  assert.equal(monday('2027-01-01'), '2026-12-28');
  assert.equal(localDate(new Date(2026, 8, 18, 0, 1)), '2026-09-18');
});

test('full day timing supports midnight, quarter hours and preserves overnight duration', () => {
  const task = normalizeTask({ id: 1, slots: [
    { id: 1, day: '2026-09-18', startHour: 0, duration: 24 },
    { id: 2, day: '2026-09-18', startHour: 23.75, duration: 2 }
  ] });
  assert.equal(task.slots[0].duration, 24);
  assert.equal(task.slots[0].startHour, 0);
  assert.equal(task.slots[1].duration, 2);
  const segments = calendarSegments(task.slots[1]);
  assert.equal(segments[0].duration, .25);
  assert.equal(segments[1].day, '2026-09-19');
  assert.equal(segments[1].duration, 1.75);
  assert.equal(segments[1].id, task.slots[1].id);
  assert.equal(timeLabel(23.75), '23:45');
  assert.equal(timeLabel(24), '24:00');
});

test('interval layout handles chains, nesting, touching ends and separate days deterministically', () => {
  const slots = [[1, 9, 3], [2, 9, 1], [3, 10, 1], [4, 10.5, 2], [5, 12.5, 1]].map(([id, startHour, duration]) => ({ id, taskId: id, day: '2026-09-18', startHour, duration }));
  const placed = layoutSlots(slots);
  assert.deepEqual(layoutSlots([...slots].reverse()), placed);
  assert.deepEqual(placed.map(p => p.columns), [3, 3, 3, 3, 1]);
  for (const a of placed) for (const b of placed) {
    if (a === b) continue;
    const overlap = a.slot.startHour < b.slot.startHour + b.slot.duration && b.slot.startHour < a.slot.startHour + a.slot.duration;
    if (overlap) assert.notEqual(a.column, b.column);
  }
  assert.equal(layoutSlots([...slots, { ...slots[0], id: 6, day: '2026-09-19' }]).at(-1).columns, 1);
  assert.deepEqual(layoutSlots([]), []);
});

test('moving one block preserves identity, other blocks and metadata', () => {
  const task = normalizeTask({ id: 7, name: 'Same task', status: 'Backlog', due: 'Keep', slots: [
    { id: 1, day: '2026-09-18', startHour: 9, duration: 2 },
    { id: 2, day: '2026-09-19', startHour: 10, duration: 1 }
  ] });
  const moved = normalizeTask({ ...task, slots: task.slots.map(s => s.id === 2 ? { ...s, day: '2026-10-01', startHour: 0 } : s) });
  assert.deepEqual(moved.slots[0], task.slots[0]);
  assert.equal(moved.slots[1].id, 2);
  assert.equal(moved.slots[1].taskId, 7);
  assert.equal(moved.slots[1].startHour, 0);
  assert.equal(moved.due, ''); assert.equal(moved.status, 'Backlog');
});
