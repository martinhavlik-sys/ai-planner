import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeWorkspace } from '../app/model.ts';
const legacy = () => normalizeWorkspace({ tasks: [{ id: 1, project: 'Marketing', owner: 'Eva', slots: [{ id: 2, day: '2026-09-19', startHour: 10, duration: 2 }] }], entities: [{ id: 3, name: 'Bory' }], projects: [], team: [] });
test('v5 preserves legacy departments, task identities and slots without inventing projects', () => {
 const data = legacy(); const departmentId = data.tasks[0].projectId;
 assert.equal(data.schemaVersion, 5); assert.deepEqual(data.campaigns, []);
 assert.equal(data.tasks[0].campaignId, null); assert.equal(data.tasks[0].id, 1);
 assert.equal(data.tasks[0].slots[0].id, 2); assert.equal(data.projects.find(p => p.id === departmentId).name, 'Marketing');
 assert.deepEqual(normalizeWorkspace(JSON.parse(JSON.stringify(data))), data);
});
test('annual projects and multi-entity links roundtrip independently of departments', () => {
 const data = legacy(); const departmentId = data.projects[0].id;
 data.entities.push({ id: 4, name: 'Other' });
 data.campaigns = [2026,2027].map(year => ({ id: year, name: `Najzamestnávateľ ${year}`, departmentId, entityIds: [3,4], edition: String(year), archived: false }));
 data.tasks[0].campaignId = 2026; data.tasks[0].entityId = 3;
 assert.deepEqual(normalizeWorkspace(data), data);
 data.campaigns[0].archived = true;
 assert.equal(normalizeWorkspace(data).tasks[0].campaignId, 2026);
});
test('dangling and incompatible project links are rejected before saving', () => {
 const data = legacy(); data.campaigns = [{ id: 10, name: 'Campaign', departmentId: data.projects[0].id, entityIds: [3], edition: '', archived: false }];
 data.tasks[0].campaignId = 10;
 assert.throws(() => normalizeWorkspace(data), /Projekt/);
 data.tasks[0].entityId = 3; assert.doesNotThrow(() => normalizeWorkspace(data));
 data.campaigns[0].departmentId = 999; assert.throws(() => normalizeWorkspace(data), /oddelenie/);
});
