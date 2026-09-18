import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeWorkspace, defaultPermissions, permissionCatalog, saveUser, removeUser, removeClient, normalizeEmail } from '../app/model.ts';

const oldWorkspace = () => ({ schemaVersion: 2, tasks: [{ id: 10, ownerId: 30, projectId: 20, entityId: 50, slots: [{ id: 60, day: '2026-09-18', startHour: 9, duration: 2 }] }], projects: [{ id: 20, ownerId: 30, clientId: 40 }], entities: [{ id: 50, name: 'Bory' }], team: [{ id: 30, name: 'Martin', role: 'Founder', capacity: 80 }, { id: 31, name: 'Eva', role: 'Designer', capacity: 45 }], clients: [{ id: 40, name: 'Penta Hospitals', email: 'legacy@example.com', note: 'Keep' }] });
const draft = (id = 32) => ({ id, name: 'Jana', email: ' Jana@Example.com ', role: 'user', status: 'pending', permissions: defaultPermissions('user'), capacity: 60 });

test('schema 2 migrates members to users preserving IDs, assignments, capacity and client legacy data', () => {
  const old = oldWorkspace(); const snapshot = JSON.stringify(old);
  const data = normalizeWorkspace(old);
  assert.equal(data.schemaVersion, 3);
  assert.equal(data.users[0].id, 30); assert.equal(data.users[0].role, 'admin');
  assert.equal(data.users[0].status, 'active'); assert.equal(data.users[0].email, '');
  assert.equal(data.users[1].role, 'user'); assert.equal(data.users[1].legacyRole, 'Designer');
  assert.equal(data.users[1].capacity, 45); assert.equal(data.users[1].status, 'pending');
  assert.equal(data.tasks[0].ownerId, 30); assert.equal(data.projects[0].ownerId, 30);
  assert.deepEqual(data.clients, old.clients); assert.equal(JSON.stringify(old), snapshot);
  assert.deepEqual(normalizeWorkspace(JSON.parse(JSON.stringify(data))), data);
});

test('permission catalog keys are unique and role defaults are conservative', () => {
  const keys = permissionCatalog.map(p => p.key);
  assert.equal(new Set(keys).size, 11);
  assert.deepEqual(defaultPermissions('admin'), keys);
  assert.deepEqual(defaultPermissions('user'), ['workspace.view', 'tasks.create', 'tasks.edit', 'calendar.view']);
  assert.ok(permissionCatalog.every(p => p.group && p.label));
});

test('user email is normalized and duplicate emails are rejected on add, edit and import', () => {
  const data = normalizeWorkspace(oldWorkspace());
  const users = saveUser(data.users, draft());
  assert.equal(users.at(-1).email, 'jana@example.com');
  assert.equal(normalizeEmail(' A@Example.COM '), 'a@example.com');
  assert.throws(() => saveUser(users, draft(33)), /emailom/);
  assert.throws(() => saveUser(users, { ...users[0], email: 'JANA@EXAMPLE.COM' }), /emailom/);
  for (const email of ['', 'bad', 'a@b', 'a b@example.com']) assert.throws(() => saveUser(users, { ...draft(33), email }), /platný email/);
  assert.throws(() => normalizeWorkspace({ ...data, users: [...users, { ...draft(33), email: 'JANA@EXAMPLE.COM' }] }), /emailom/);
  const renamed = saveUser(users, { ...users.at(-1), name: 'Jana Nová', permissions: [] });
  assert.deepEqual(renamed.at(-1).permissions, []);
});

test('last administrator cannot be deleted or demoted, assigned owners cannot be deleted', () => {
  const data = normalizeWorkspace(oldWorkspace());
  assert.throws(() => removeUser(data.users, [], [], 30), /administrátor/);
  assert.throws(() => saveUser(data.users, { ...data.users[0], email: 'martin@example.com', role: 'user' }), /administrátor/);
  const users = saveUser(data.users, { ...draft(), role: 'admin' });
  assert.throws(() => removeUser(users, data.tasks, [], 30), /priradený/);
  assert.throws(() => removeUser(users, [], data.projects, 30), /priradený/);
  assert.equal(removeUser(users, [], [], 30).length, 2);
  assert.throws(() => normalizeWorkspace({ ...data, users: data.users.map(u => ({ ...u, role: 'user' })) }), /administrátor/);
});

test('clients need only a name and deletion checks departments and tasks', () => {
  const data = normalizeWorkspace(oldWorkspace());
  assert.throws(() => removeClient(data.clients, [], data.projects, 40), /priradený/);
  assert.throws(() => removeClient(data.clients, [{ ...data.tasks[0], clientId: 40 }], [], 40), /priradený/);
  assert.deepEqual(removeClient(data.clients, [], [], 40), []);
  assert.equal(normalizeWorkspace({ ...data, clients: [{ id: 40, name: 'Agency' }] }).clients[0].name, 'Agency');
});

test('schema 3 roundtrip keeps custom permissions, all assignments and calendar', () => {
  const data = normalizeWorkspace(oldWorkspace());
  data.users = saveUser(data.users, { ...draft(), permissions: ['calendar.view', 'entities.manage'] });
  data.tasks[0].ownerId = 32;
  const normalized = normalizeWorkspace(data);
  assert.deepEqual(normalizeWorkspace(JSON.parse(JSON.stringify(normalized))), normalized);
  assert.equal(normalized.tasks[0].entityId, 50);
  assert.equal(normalized.tasks[0].slots[0].id, 60);
  assert.throws(() => normalizeWorkspace({ ...data, users: data.users.map(u => ({ ...u, permissions: ['unknown'] })) }), /oprávnenia/);
});
