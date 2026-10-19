import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { calculateNextCharge, calculateScheduleState, calculateVerificationState, entitlement, getChargeOccurrences, occurrence, parseDate } from '../src/domain/dates';
import type { Subscription } from '../src/domain/model';
const monthly = { start:'2025-01-31', cycle:'monthly' as const, interval:1 };
test('month end anchor survives short months', () => {
  assert.equal(occurrence(monthly,1),'2025-02-28');
  assert.equal(occurrence(monthly,2),'2025-03-31');
  assert.equal(calculateNextCharge(monthly,'2025-02-28'),'2025-02-28');
  assert.equal(calculateNextCharge(monthly,'2025-03-01'),'2025-03-31');
});
test('leap days and yearly policy', () => {
  const rule = {start:'2024-02-29',cycle:'yearly' as const,interval:1};
  assert.equal(occurrence(rule,1),'2025-02-28');
  assert.equal(occurrence(rule,4),'2028-02-29');
});
test('large elapsed cycles and interval', () => {
  assert.equal(calculateNextCharge({start:'2020-01-30',cycle:'monthly',interval:2},'2030-02-01'),'2030-03-30');
  assert.deepEqual(getChargeOccurrences(monthly,'2025-02-01','2025-04-30'),['2025-02-28','2025-03-31','2025-04-30']);
});
test('dates and schedule state', () => {
  assert.equal(parseDate('2025-02-29'),undefined);
  assert.equal(calculateScheduleState(monthly,'2025-01-31',3),'due-today');
  assert.equal(calculateScheduleState(monthly,'2025-02-26',3),'due-soon');
  assert.equal(calculateScheduleState(monthly,'2025-02-26',3,'paused'),'inactive');
});
test('auto renew is not payment evidence and paid-through is exclusive', () => {
  const record: Subscription = {path:'a.md',service:'A',category:'',rule:monthly,autoRenew:true,lifecycle:'active',remindBefore:3,issues:[]};
  assert.equal(calculateVerificationState(record,'2025-02-01'),'unverified');
  record.lastPaymentDate='2025-01-31'; record.paidThrough='2025-02-28';
  assert.equal(calculateVerificationState(record,'2025-02-01'),'confirmed');
  assert.equal(entitlement(record,'2025-02-28'),'ended');
});

test('mid-cycle anchors and local DST dates', () => {
  assert.equal(calculateNextCharge({start:'2026-01-18',cycle:'monthly',interval:1,anchorDay:29},'2026-01-18'),'2026-01-29');
  assert.equal(calculateNextCharge({start:'2026-01-31',cycle:'monthly',interval:1,anchorDay:29},'2026-01-31'),'2026-02-28');
  assert.equal(occurrence({start:'2026-03-07',cycle:'weekly',interval:1},1),'2026-03-14');
});
