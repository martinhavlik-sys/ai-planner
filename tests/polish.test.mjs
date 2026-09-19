import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { deadline, formatDeadline, normalizeTask, normalizeProject, departmentColors, appendCalendarSlot } from '../app/model.ts';
const source = file => readFileSync(new URL(`../app/${file}`, import.meta.url), 'utf8');

test('deadline accepts real ISO dates only and formats Slovak dates', () => {
  for (const value of ['Dnes', 'Utorok', 'Neskôr', 'Neskor', '', '2026-02-29', '2026-13-01', '2026-9-18']) {
    assert.equal(deadline(value), ''); assert.equal(formatDeadline(value), '—');
  }
  assert.equal(deadline('2024-02-29'), '2024-02-29');
  assert.equal(formatDeadline('2026-09-18'), '18. 9. 2026');
  const task = normalizeTask({ id: 42, due: 'Utorok', note: 'Keep', checklist: [{ id: 1, text: 'Check', done: true }], activity: ['Keep'], slots: [{ id: 2, day: '2026-09-18', startHour: 9, duration: 1 }] });
  assert.equal(task.due, ''); assert.equal(task.note, 'Keep'); assert.equal(task.slots[0].id, 2); assert.equal(task.checklist[0].done, true); assert.deepEqual(task.activity, ['Keep']);
  assert.equal(normalizeTask({ ...task, due: '2026-09-18' }).due, '2026-09-18');
});

test('palette offers at least 20 unique valid colors and preserves saved color', () => {
  assert.ok(new Set(departmentColors).size >= 20);
  for (const color of departmentColors) {
    assert.match(color, /^#[0-9a-f]{6}$/i);
    const project = normalizeProject({ id: 1, color });
    assert.equal(normalizeProject(JSON.parse(JSON.stringify(project))).color, color);
  }
  assert.match(source('page.tsx'), /aria-pressed=\{projectDraft.color === color\}/);
  assert.match(source('page.tsx'), /Predvolené/);
});

test('same and different timing add slots without duplicating or mutating task', () => {
  const task = normalizeTask({ id: 42, name: 'Original', due: '2026-09-18', note: 'Keep', slots: [{ id: 2, day: '2026-09-18', startHour: 9, duration: 1 }] });
  const before = JSON.stringify(task);
  const same = appendCalendarSlot(task, task.slots[0]);
  assert.equal(same.id, 42); assert.equal(same.slots.length, 2);
  assert.notEqual(same.slots[1].id, 2);
  assert.deepEqual({ ...same.slots[1], id: 2 }, task.slots[0]);
  const timing = { day: '2026-09-20', startHour: 14.5, duration: 2.25 };
  const other = appendCalendarSlot(same, timing);
  assert.equal(other.id, task.id); assert.equal(other.due, task.due); assert.equal(other.note, task.note);
  assert.deepEqual(other.slots.slice(0, 2), same.slots);
  assert.deepEqual(other.slots[2], { ...timing, taskId: 42, id: other.slots[2].id });
  assert.equal(JSON.stringify(task), before);
  assert.throws(() => appendCalendarSlot(task, { ...timing, day: 'bad' }));
  assert.throws(() => appendCalendarSlot(task, { ...timing, duration: NaN }));
});

test('table has eight matching columns, no time column and accessible icon actions', () => {
  const page = source('page.tsx');
  const header = page.match(/<div className="tableHeader">(.*?)<\/div>/s)[1];
  assert.equal((header.match(/<span>/g) || []).length, 8);
  assert.ok(!header.includes('Čas'));
  assert.ok(header.includes('Termín'));
  const actions = page.match(/<div className="rowActions">(.*?)<\/div>/s)[1];
  assert.equal((actions.match(/aria-label=/g) || []).length, 3);
  assert.match(page, /type="date" value=\{draft.due\}/);
});

test('calendar exposes exactly edit and add and resets every navigation including same-date selection', () => {
  const calendar = source('calendar.tsx');
  const actions = calendar.match(/<div className="timedActions">(.*?)<\/div>/s)[1];
  assert.equal((actions.match(/<button /g) || []).length, 2);
  assert.match(actions, /onEdit\(task\)/); assert.match(actions, /onAdd\(task,/);
  assert.match(calendar, /scroll.current.scrollTop = 8 \* hourHeight/);
  assert.match(calendar, /\[anchor, range, navigation\]/);
  assert.match(calendar, /const selectDate = .*setNavigation\(value => value \+ 1\)/);
  assert.match(calendar, /const changeMonth = .*setNavigation\(value => value \+ 1\)/);
  for (const handler of ['selectDate(today)', 'selectDate(date)', 'selectDate(addDays(anchor', 'setRange(e.target.value']) assert.ok(calendar.includes(handler));
  const dialog = source('slot-dialog.tsx');
  assert.ok(dialog.includes('Rovnaký čas') && dialog.includes('Iný čas'));
  assert.match(dialog, /onConfirm\(slot\)/); assert.match(dialog, /onConfirm\(\{ day, startHour: hours \+ minutes \/ 60, duration \}\)/);
});
