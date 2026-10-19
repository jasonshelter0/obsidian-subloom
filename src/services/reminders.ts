import { Notice } from 'obsidian';
import { calculateNextCharge, calculateVerificationState, diffDays, latestCharge } from '../domain/dates';
import type { Subscription } from '../domain/model';
export interface ReminderState { acknowledged: Record<string,boolean>; snoozedUntil: Record<string,string>; }
export interface ReminderEvent { key:string; label:string; path:string; kind:'advance'|'due'|'verification'; }
export function reminderEvents(records: Subscription[], asOf: string): ReminderEvent[] {
  const result: ReminderEvent[]=[];
  for (const r of records) {
    if (r.lifecycle !== 'active' || !r.rule) continue;
    const next=calculateNextCharge(r.rule,asOf), days=diffDays(next,asOf);
    if (days === 0) result.push({key:`${r.path}|${next}|due`,label:`${r.service} is due today`,path:r.path,kind:'due'});
    else if (days > 0 && days <= r.remindBefore) result.push({key:`${r.path}|${next}|advance`,label:`${r.service} is due in ${days} day${days===1?'':'s'}`,path:r.path,kind:'advance'});
    const latest=latestCharge(r.rule,asOf);
    if (latest && diffDays(asOf,latest)>0 && calculateVerificationState(r,asOf)==='unverified') result.push({key:`${r.path}|${latest}|verification`,label:`Check payment for ${r.service} (${latest})`,path:r.path,kind:'verification'});
  }
  return result;
}
export function visibleReminders(events: ReminderEvent[], state: ReminderState, asOf:string): ReminderEvent[] {
  return events.filter(e=>!state.acknowledged[e.key] && (!state.snoozedUntil[e.key] || state.snoozedUntil[e.key] <= asOf));
}
export function notifyReminders(events: ReminderEvent[], state: ReminderState, asOf:string, seen:Set<string>): void {
  for (const event of visibleReminders(events,state,asOf).slice(0,5)) {
    if (seen.has(event.key)) continue;
    seen.add(event.key); new Notice(`Subloom: ${event.label}`,7000);
  }
}
