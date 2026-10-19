import type { Rule, ScheduleState, Subscription, VerificationState } from './model';

export function parseDate(value: string): Date | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return;
  return date;
}
export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function today(): string { return formatDate(new Date()); }
export function addDays(value: string, days: number): string {
  const date = parseDate(value); if (!date) throw new Error(`Invalid date: ${value}`);
  date.setDate(date.getDate() + days); return formatDate(date);
}
export function diffDays(a: string, b: string): number {
  const x = parseDate(a), y = parseDate(b); if (!x || !y) throw new Error('Invalid date');
  return Math.round((Date.UTC(x.getFullYear(),x.getMonth(),x.getDate()) - Date.UTC(y.getFullYear(),y.getMonth(),y.getDate())) / 86400000);
}
export function occurrence(rule: Rule, index: number): string {
  const start = parseDate(rule.start); if (!start || !Number.isInteger(index) || index < 0) throw new Error('Invalid recurrence');
  if (!Number.isInteger(rule.interval) || rule.interval < 1) throw new Error('Invalid interval');
  if (rule.cycle === 'weekly') return addDays(rule.start, index * rule.interval * 7);
  const step = rule.interval * (rule.cycle === 'yearly' ? 12 : 1);
  const offset = rule.anchorDay != null && rule.anchorDay < start.getDate() ? step : 0;
  const months = index * step + offset;
  const absoluteMonth = start.getFullYear() * 12 + start.getMonth() + months;
  const year = Math.floor(absoluteMonth / 12), month = absoluteMonth % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const anchor = rule.anchorDay ?? start.getDate();
  if (anchor < 1 || anchor > 31) throw new Error('Invalid anchor day');
  return formatDate(new Date(year, month, Math.min(anchor, lastDay)));
}
function approximateIndex(rule: Rule, asOf: string): number {
  const start = parseDate(rule.start)!, date = parseDate(asOf)!;
  if (rule.cycle === 'weekly') return Math.max(0, Math.floor(diffDays(asOf, rule.start)/(7*rule.interval)));
  const months = (date.getFullYear()-start.getFullYear())*12 + date.getMonth()-start.getMonth();
  return Math.max(0, Math.floor(months / (rule.interval * (rule.cycle === 'yearly' ? 12 : 1))));
}
export function calculateNextCharge(rule: Rule, asOf: string): string {
  if (!parseDate(asOf) || !parseDate(rule.start)) throw new Error('Invalid date');
  let index = approximateIndex(rule, asOf);
  while (index > 0 && occurrence(rule,index-1) >= asOf) index--;
  while (occurrence(rule,index) < asOf) index++;
  return occurrence(rule,index);
}
export function latestCharge(rule: Rule, asOf: string): string | undefined {
  if (asOf < rule.start) return;
  let index = approximateIndex(rule, asOf);
  while (occurrence(rule,index) > asOf && index > 0) index--;
  while (occurrence(rule,index+1) <= asOf) index++;
  return occurrence(rule,index) <= asOf ? occurrence(rule,index) : undefined;
}
export function calculateScheduleState(rule: Rule, asOf: string, reminderWindow: number, lifecycle: string = 'active'): ScheduleState {
  if (lifecycle !== 'active') return 'inactive';
  const next = calculateNextCharge(rule, asOf);
  const days = diffDays(next, asOf);
  if (days === 0) return 'due-today';
  return days <= reminderWindow ? 'due-soon' : 'upcoming';
}
export function calculateVerificationState(record: Subscription, asOf: string): VerificationState {
  if (record.verificationOverride) return record.verificationOverride;
  if (!record.rule) return 'unverified';
  const latest = latestCharge(record.rule, asOf);
  if (!latest || !record.lastPaymentDate) return 'unverified';
  const next = calculateNextCharge(record.rule, addDays(latest,1));
  return record.lastPaymentDate >= latest && record.lastPaymentDate < next ? 'confirmed' : 'unverified';
}
export function getChargeOccurrences(rule: Rule, from: string, to: string): string[] {
  if (!parseDate(from) || !parseDate(to) || from > to) return [];
  let index = approximateIndex(rule, from);
  while (index > 0 && occurrence(rule,index-1) >= from) index--;
  const result: string[] = [];
  while (occurrence(rule,index) < from) index++;
  while (occurrence(rule,index) <= to) { result.push(occurrence(rule,index)); index++; }
  return result;
}
export function entitlement(record: Subscription, asOf: string): 'covered' | 'ended' | 'unknown' {
  return !record.paidThrough ? 'unknown' : record.paidThrough > asOf ? 'covered' : 'ended';
}
