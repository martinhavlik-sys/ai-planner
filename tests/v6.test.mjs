import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resizedSlotDuration, resizeTaskSlot, normalizeTask, calendarSegments, departmentEventColors, departmentColors, projectLabel, campaignChoices, saveCampaign } from '../app/model.ts';
const slot = { id: 9, taskId: 1, day: '2026-09-19', startHour: 9, duration: 1 };

test('resize snaps end to quarter hours and clamps minimum and displayed midnight', () => {
  assert.equal(resizedSlotDuration(slot, slot.day, 10.1), 1);
  assert.equal(resizedSlotDuration(slot, slot.day, 10.14), 1.25);
  assert.equal(resizedSlotDuration(slot, slot.day, -100), .25);
  assert.equal(resizedSlotDuration(slot, slot.day, 100), 15);
  assert.equal(resizedSlotDuration({ ...slot, startHour: 23.75 }, slot.day, 25), .25);
  assert.equal(resizedSlotDuration(slot, '2026-09-22', 20), 1);
  assert.equal(resizedSlotDuration(slot, slot.day, NaN), 1);
});
test('overnight segments resize the same original slot, preserving previous-day hours', () => {
  const night = { ...slot, startHour: 23, duration: 2 };
  assert.equal(resizedSlotDuration(night, night.day, 25), 1);
  assert.equal(resizedSlotDuration(night, '2026-09-20', 1.5), 2.5);
  assert.equal(resizedSlotDuration(night, '2026-09-20', -1), 1.25);
  assert.equal(resizedSlotDuration(night, '2026-09-20', 24), 24);
  assert.deepEqual(calendarSegments({ ...night, duration: resizedSlotDuration(night, '2026-09-20', 1.5) }).map(s => [s.id, s.duration]), [[9,1],[9,1.5]]);
});
test('resizing one slot keeps task count, IDs, assignees, unrelated blocks and dates intact', () => {
  const task = normalizeTask({ id: 1, name: 'Keep', ownerIds: [4,5], due: '2026-09-30', note: 'Note', slots: [slot, { ...slot, id: 10, startHour: 14 }] });
  const before = JSON.stringify(task);
  const result = resizeTaskSlot(task, 9, 2.25);
  assert.equal(result.id, task.id); assert.equal(result.slots.length, 2);
  assert.deepEqual(result.ownerIds, [4,5]); assert.equal(result.due, task.due); assert.equal(result.note, task.note);
  assert.deepEqual(result.slots[0], { ...slot, duration: 2.25 }); assert.deepEqual(result.slots[1], task.slots[1]);
  assert.equal(result.duration, 2.25); assert.equal(result.startHour, 9);
  assert.equal(JSON.stringify(task), before);
  assert.equal(resizeTaskSlot(task, 99, 2), task); assert.equal(resizeTaskSlot(task, 9, NaN), task);
  assert.equal(resizeTaskSlot(task, 9, 0), task); assert.equal(resizeTaskSlot(task, 9, 25), task);
});
const luminance = hex => {
  const values = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16) / 255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4);
  return values.reduce((sum,v,i) => sum+v*[.2126,.7152,.0722][i],0);
};
test('department palette retains exact border, readable tint and AA text contrast', () => {
  for (const border of [...departmentColors, '#000000', '#ffffff', '#FFFF00']) {
    const result = departmentEventColors(border);
    assert.equal(result.borderLeftColor, border);
    const a = luminance(result.backgroundColor), b = luminance(result.color);
    assert.ok((Math.max(a,b)+.05)/(Math.min(a,b)+.05) >= 4.5, border);
  }
  assert.deepEqual(departmentEventColors('red;bad'), departmentEventColors());
  assert.notEqual(departmentEventColors('#ff0000').backgroundColor, departmentEventColors('#00ff00').backgroundColor);
});
test('project labels and picker distinguish editions, legacy duplicates and current archive', () => {
  const base = { name: 'Najzamestnávateľ', departmentId: 2, entityIds: [3], archived: false };
  const campaigns = [{ ...base, id: 1, edition: '2026' }, { ...base, id: 2, edition: '2027' }, { ...base, id: 3, edition: '2025', archived: true }];
  assert.equal(projectLabel(campaigns[0]), 'Najzamestnávateľ · 2026'); assert.equal(projectLabel(), '');
  assert.equal(projectLabel({ name: 'Project', edition: '' }), 'Project');
  assert.deepEqual(campaignChoices(campaigns, 2, 3, null).map(c=>c.id), [1,2]);
  assert.match(campaignChoices(campaigns, 2, 3, 3)[2].name, /2025 \(archív\)/);
  const duplicate = campaignChoices([...campaigns, { ...campaigns[0], id: 4 }], 2, 3, null);
  assert.equal(new Set(duplicate.map(c=>c.name)).size, duplicate.length);
  assert.deepEqual(campaignChoices(campaigns, 2, 99, null), []);
});
test('project save rejects duplicate identity while preserving existing records and edition flexibility', () => {
  const a = { id: 1, name: 'Project', edition: '2026', departmentId: 2, entityIds: [], archived: false };
  assert.throws(() => saveCampaign([a], { ...a, id: 2, name: ' project ' }), /už existuje/);
  const result = saveCampaign([a], { ...a, id: 2, edition: '2027' });
  assert.equal(result.length, 2); assert.equal(result[0], a);
  assert.equal(saveCampaign([a], { ...a, name: ' Rename ' })[0].name, 'Rename');
});
test('table separates project line, and management rows expose stable columns and labeled icon actions', () => {
  const page = readFileSync(new URL('../app/page.tsx', import.meta.url),'utf8');
  const css = readFileSync(new URL('../app/globals.css', import.meta.url),'utf8');
  assert.match(page, /className="taskProject">\{projectLabel/);
  assert.match(css, /\.taskClassification > span, \.taskProject \{ display: block/);
  assert.match(page, /role="table" aria-label="Entity"/); assert.match(page, /role="table" aria-label="Projekty"/);
  assert.match(page, /aria-label=\{`Upraviť entitu/); assert.match(page, /aria-label=\{`Upraviť projekt/);
  assert.match(css, /\.entityRow \{ grid-template-columns:/); assert.match(css, /\.campaignRow \{ grid-template-columns:/);
  assert.match(page, /<TaskDialog/); assert.doesNotMatch(page, /className="modalBackdrop"/);
});
