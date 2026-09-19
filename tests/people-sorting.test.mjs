import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { normalizeWorkspace, normalizeTask, normalizeProject, avatarProfile, initialsFromName, saveUser, removeUser, defaultPermissions, personTaskCount, sortTasks, defaultMenuOrder, normalizeMenuOrder, moveMenuItem } from '../app/model.ts';

const fixture = () => normalizeWorkspace({ schemaVersion: 3,
  users: [{ id: 1, name: 'Martin Havlík', email: 'martin@example.com', role: 'admin', status: 'active', permissions: defaultPermissions('admin') }, { id: 2, name: 'Eva Nová', email: 'eva@example.com', role: 'user', status: 'pending', permissions: [] }],
  projects: [{ id: 10, name: 'Marketing', goal: 'Keep old goal', ownerId: 1, color: '#123456' }],
  tasks: [{ id: 100, name: 'Task', ownerId: 1, projectId: 10, due: '2026-09-20', note: 'Note', activity: ['Created'], checklist: [{ id: 1, text: 'Done', done: true }], slots: [{ id: 20, day: '2026-09-19', startHour: 9, duration: 2 }, { id: 21, day: '2026-09-20', startHour: 10, duration: 1 }] }]
});

test('schema 3 ownerId migrates to one-person array while preserving task and department data', () => {
  const data = fixture(), task = data.tasks[0];
  assert.equal(data.schemaVersion, 5); assert.deepEqual(task.ownerIds, [1]);
  assert.equal(task.due, '2026-09-20'); assert.equal(task.note, 'Note');
  assert.deepEqual(task.activity, ['Created']); assert.equal(task.checklist[0].done, true);
  assert.deepEqual(task.slots.map(s => s.id), [20, 21]);
  assert.equal(data.projects[0].goal, 'Keep old goal'); assert.equal(data.projects[0].color, '#123456');
  assert.deepEqual(normalizeTask({ ownerId: null, slots: [] }).ownerIds, []);
  assert.deepEqual(normalizeTask({ ownerId: 1, ownerIds: [], slots: [] }).ownerIds, []);
  assert.deepEqual(normalizeWorkspace({ tasks: [{ id: 1, ownerId: null, slots: [] }] }).tasks[0].ownerIds, []);
});

test('two assigned people share one task and each count once, including completed work', () => {
  const data = fixture(); data.tasks[0].ownerIds = [1, 2, 2]; data.tasks[0].status = 'Hotovo';
  const next = normalizeWorkspace(data);
  assert.equal(next.tasks.length, 1); assert.deepEqual(next.tasks[0].ownerIds, [1, 2]);
  for (const id of [1, 2]) assert.equal(personTaskCount(next.tasks, id), 1);
  assert.throws(() => removeUser(next.users, next.tasks, [], 2), /priradený/);
  next.tasks[0].ownerIds = [1];
  assert.equal(removeUser(next.users, next.tasks, [], 2).length, 1);
  for (const ownerIds of [[999], [0], ['1'], null]) assert.throws(() => normalizeWorkspace({ ...data, tasks: [{ ...data.tasks[0], ownerIds }] }));
});

test('save, normalize and JSON import preserve profiles, multi-assignment and menu order', () => {
  const data = fixture();
  const photo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=';
  data.users = saveUser(data.users, { ...data.users[0], initials: 'MHX', avatarColor: '#ad1457', photo });
  data.tasks[0].ownerIds = [2, 1]; data.menuOrder = [...defaultMenuOrder].reverse();
  const saved = normalizeWorkspace(data), imported = normalizeWorkspace(JSON.parse(JSON.stringify(saved)));
  assert.deepEqual(imported, saved);
  assert.equal(imported.users[0].photo, photo); assert.equal(imported.users[0].initials, 'MHX');
  assert.equal(imported.users[0].avatarColor, '#ad1457'); assert.deepEqual(imported.tasks[0].ownerIds, [2, 1]);
});

test('profiles derive initials, cap custom initials and reject unsafe or oversized photos', () => {
  assert.equal(initialsFromName(' Martin Havlík '), 'MH'); assert.equal(initialsFromName('Eva'), 'EV');
  assert.equal(avatarProfile({ name: 'Eva Nová', initials: 'abcd' }).initials, 'ABC');
  assert.equal(avatarProfile({ name: 'Eva Nová' }).avatarColor, '#4285F4');
  for (const photo of ['https://example.com/a.png', 'data:image/svg+xml;base64,AAAA', 'data:text/html;base64,AAAA', `data:image/png;base64,${'A'.repeat(210000)}`]) assert.throws(() => avatarProfile({ photo }));
  const data = fixture(), photo = `data:image/png;base64,${'A'.repeat(200000)}`;
  const users = Array.from({ length: 6 }, (_, i) => ({ ...data.users[0], id: i + 1, email: `user${i}@example.com`, photo }));
  assert.throws(() => normalizeWorkspace({ ...data, users }), /1 MB/);
  assert.throws(() => saveUser(users.slice(0, 5), users[5]), /1 MB/);
});

test('raw imported profiles preserve defaults, normalization and photo validation', () => {
  const migrate = profile => normalizeWorkspace({ tasks: [], team: [{ id: 7, ...profile }] }).users.find(user => user.id === 7);
  const photo = 'data:image/png;base64,AAAA';
  const profileOf = user => ({ initials: user.initials, avatarColor: user.avatarColor, photo: user.photo });
  assert.deepEqual(profileOf(migrate({})), { initials: '', avatarColor: '#4285F4', photo: '' });
  assert.equal(migrate({}).name, 'Osoba');
  assert.deepEqual(profileOf(migrate({ name: 'Eva Nová' })), { initials: 'EN', avatarColor: '#4285F4', photo: '' });
  assert.deepEqual(profileOf(migrate({ name: 42, initials: null, avatarColor: false, photo: {} })), { initials: '', avatarColor: '#4285F4', photo: '' });
  assert.deepEqual(profileOf(migrate({ name: 'Eva Nová', initials: ' x y z q ', avatarColor: '#aBcDeF', photo })), { initials: 'XYZ', avatarColor: '#aBcDeF', photo });
  assert.deepEqual(profileOf(migrate({ name: 'Eva Nová', initials: ' ', avatarColor: 'invalid' })), { initials: 'EN', avatarColor: '#4285F4', photo: '' });
  for (const photo of ['https://example.com/avatar.png', 'data:image/svg+xml;base64,AAAA', `data:image/png;base64,${'A'.repeat(210000)}`]) {
    assert.throws(() => migrate({ name: 'Eva Nová', photo }), /Fotografia/);
  }
});

test('sorts name, deadline, priority, people and department stably without modifying data', () => {
  const { users } = fixture(), projects = [{ id: 10, name: 'Zeta' }, { id: 11, name: 'Alfa' }];
  const tasks = [
    { id: 1, name: 'Bravo', due: '2026-10-01', priority: 'Nizka', ownerIds: [1], projectId: 10 },
    { id: 2, name: 'Alfa', due: '2026-09-20', priority: 'Vysoka', ownerIds: [2], projectId: 11 },
    { id: 3, name: 'Charlie', due: '', priority: 'Stredna', ownerIds: [], projectId: null },
    { id: 4, name: 'Alfa', due: '2026-09-20', priority: 'Vysoka', ownerIds: [2, 1], projectId: 11 }
  ].map(t => normalizeTask({ ...t, slots: [] }));
  const before = JSON.stringify(tasks);
  const ids = (key, dir) => sortTasks(tasks, key, dir, users, projects).map(t => t.id);
  assert.deepEqual(ids('name', 'asc'), [2, 4, 1, 3]); assert.deepEqual(ids('name', 'desc'), [3, 1, 2, 4]);
  assert.deepEqual(ids('due', 'asc'), [2, 4, 1, 3]); assert.deepEqual(ids('due', 'desc'), [1, 2, 4, 3]);
  assert.deepEqual(ids('priority', 'asc'), [1, 3, 2, 4]); assert.deepEqual(ids('priority', 'desc'), [2, 4, 3, 1]);
  assert.deepEqual(ids('people', 'asc'), [2, 4, 1, 3]); assert.deepEqual(ids('people', 'desc'), [1, 4, 2, 3]);
  assert.deepEqual(ids('department', 'asc'), [2, 4, 1, 3]); assert.deepEqual(ids('department', 'desc'), [1, 2, 4, 3]);
  assert.equal(JSON.stringify(tasks), before);
  assert.deepEqual(sortTasks(tasks.filter(t => t.ownerIds.includes(2) && t.name.includes('Alfa')), 'priority', 'desc', users, projects).map(t => t.id), [2, 4]);
});

test('menu repairs old and incomplete data and moves in either direction without mutation', () => {
  assert.deepEqual(normalizeMenuOrder(undefined), defaultMenuOrder);
  assert.deepEqual(normalizeMenuOrder(['Entity', 'Entity', 'unknown']).slice(0, 2), ['Entity', 'Pracovna plocha']);
  const before = [...defaultMenuOrder];
  const next = moveMenuItem(before, 'Tim', 'Pracovna plocha');
  assert.equal(next[0], 'Tim'); assert.deepEqual(before, defaultMenuOrder);
  assert.deepEqual(moveMenuItem(next, 'Tim', 'Klienti'), before);
  assert.deepEqual(moveMenuItem(before, 'Entity', 'Entity'), before);
});

test('department UI has only name/color and task UI uses Deadline and Osoby', () => {
  assert.equal(normalizeProject({}).color, '#4285F4');
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
  const section = page.slice(page.indexOf('{activeScreen === "Projekty" ?'), page.indexOf('{activeScreen === "Tim" ?'));
  for (const hidden of ['projectDraft.owner', 'projectDraft.client', 'projectDraft.goal', 'project.goal', 'project.owner', 'project.client', 'project.status', 'project.next']) assert.ok(!section.includes(hidden), hidden);
  assert.ok(section.includes('ColorPicker'));
  assert.ok(!/Vlastn[íi]k|Termín/.test(page));
  assert.ok(!page.includes('Spravovať entity'));
  assert.match(page, /tableTasks.map/); assert.match(page, /sortTasks\(visibleTasks/);
  assert.match(page, /menuOrder.filter/); assert.match(page, /moveMenuItem/);
});
