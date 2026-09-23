import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateReportPeriod } from '../app/model.ts';

const reference = new Date(2026, 8, 23, 12); // Wednesday, 23 September 2026

test('report period defaults use Monday through Sunday', () => {
  assert.deepEqual(calculateReportPeriod('Tento týždeň', reference), { start: '2026-09-21', end: '2026-09-27', valid: true, error: '' });
});

test('report period calculates previous week, current and previous month, and year', () => {
  assert.deepEqual(calculateReportPeriod('Minulý týždeň', reference), { start: '2026-09-14', end: '2026-09-20', valid: true, error: '' });
  assert.deepEqual(calculateReportPeriod('Tento mesiac', reference), { start: '2026-09-01', end: '2026-09-30', valid: true, error: '' });
  assert.deepEqual(calculateReportPeriod('Minulý mesiac', reference), { start: '2026-08-01', end: '2026-08-31', valid: true, error: '' });
  assert.deepEqual(calculateReportPeriod('Tento rok', reference), { start: '2026-01-01', end: '2026-12-31', valid: true, error: '' });
});

test('custom report period validates completeness and order', () => {
  assert.deepEqual(calculateReportPeriod('Vlastné obdobie', reference, '2026-09-02', '2026-09-08'), { start: '2026-09-02', end: '2026-09-08', valid: true, error: '' });
  assert.equal(calculateReportPeriod('Vlastné obdobie', reference, '2026-09-02', '').valid, false);
  assert.equal(calculateReportPeriod('Vlastné obdobie', reference, '2026-09-10', '2026-09-08').error, 'Dátum Do nesmie byť pred dátumom Od.');
});

test('predefined period ignores stale custom dates', () => {
  assert.deepEqual(calculateReportPeriod('Tento týždeň', reference, '2020-01-01', '2020-01-02'), { start: '2026-09-21', end: '2026-09-27', valid: true, error: '' });
});
