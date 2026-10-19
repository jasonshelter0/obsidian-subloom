import { ItemView, WorkspaceLeaf } from 'obsidian';
import { calculateNextCharge, calculateVerificationState, diffDays, entitlement, latestCharge } from '../domain/dates';
import type { Subscription } from '../domain/model';
import { reminderEvents, visibleReminders } from '../services/reminders';
import type SubloomPlugin from '../main';
export const VIEW_TYPE = 'subloom-dashboard';
export class DashboardView extends ItemView {
  private query=''; private lifecycle='all'; private category='all'; private method='all'; private autoRenew='all'; private sort='next';
  constructor(leaf: WorkspaceLeaf, private plugin: SubloomPlugin) { super(leaf); }
  getViewType(): string { return VIEW_TYPE; }
  getDisplayText(): string { return 'Subloom'; }
  getIcon(): string { return 'calendar-clock'; }
  async onOpen(): Promise<void> { this.render(); }
  render(): void {
    const root=this.contentEl; root.empty(); root.addClass('subloom');
    const today=this.plugin.currentDate(); const data=this.plugin.index;
    const header=root.createDiv({cls:'subloom-header'});
    const title=header.createDiv(); title.createEl('h1',{text:'Subloom'}); title.createEl('p',{text:'Your recurring payments, in one place.'});
    const add=header.createEl('button',{text:'Add subscription',cls:'mod-cta'}); add.onclick=()=>this.plugin.addSubscription();
    if (this.plugin.loading) { root.createEl('p',{text:'Scanning vault…'}); return; }
    const active=data.subscriptions.filter(r=>r.lifecycle==='active');
    const dueSoon=active.filter(r=>r.rule && diffDays(calculateNextCharge(r.rule,today),today)<=r.remindBefore).length;
    const overdue=active.filter(r=>r.rule && latestCharge(r.rule,today) && calculateVerificationState(r,today)==='unverified' && diffDays(today,latestCharge(r.rule,today)!)>0).length;
    const monthly=new Map<string,number>();
    for (const r of active) if (r.rule && r.amount!=null && r.currency) {
      const factor=r.rule.cycle==='monthly'?1/r.rule.interval:r.rule.cycle==='yearly'?1/(12*r.rule.interval):52/(12*r.rule.interval);
      monthly.set(r.currency,(monthly.get(r.currency)??0)+r.amount*factor);
    }
    const kpis=root.createDiv({cls:'subloom-kpis'});
    this.kpi(kpis,'Active',String(active.length)); this.kpi(kpis,'Due soon',String(dueSoon)); this.kpi(kpis,'Verify payment',String(overdue));
    this.kpi(kpis,'Monthly forecast',Array.from(monthly).map(([c,v])=>`${v.toFixed(2)} ${c}`).join(' · ') || '—');
    const candidateEvents=reminderEvents(data.subscriptions,today);
    for (const method of data.methods) {
      if (method.expiryMonth && /^\d{4}-\d{2}$/.test(method.expiryMonth)) {
        const months=(Number(method.expiryMonth.slice(0,4))-Number(today.slice(0,4)))*12+Number(method.expiryMonth.slice(5,7))-Number(today.slice(5,7));
        if (months>=0 && months<=2) candidateEvents.push({key:`${method.path}|expiry`,label:`${method.institution??method.name} expires in ${method.expiryMonth}`,path:method.path,kind:'advance'});
      }
    }
    const events=visibleReminders(candidateEvents,this.plugin.reminders,today);
    const attention=root.createDiv({cls:'subloom-section'}); attention.createEl('h2',{text:'Needs attention'});
    if (!events.length) attention.createEl('p',{text:'Nothing needs attention right now.',cls:'subloom-muted'});
    for (const event of events.slice(0,20)) {
      const row=attention.createDiv({cls:'subloom-alert'}); row.createSpan({text:event.label});
      const actions=row.createDiv({cls:'subloom-actions'});
      this.button(actions,'Open',()=>this.plugin.openNote(event.path));
      this.button(actions,'Snooze 1 day',()=>this.plugin.snooze(event.key));
      this.button(actions,'Acknowledge',()=>this.plugin.acknowledge(event.key));
    }
    const upcoming=root.createDiv({cls:'subloom-section'}); upcoming.createEl('h2',{text:'Upcoming'});
    const ordered=active.filter(r=>r.rule).sort((a,b)=>calculateNextCharge(a.rule!,today).localeCompare(calculateNextCharge(b.rule!,today))).slice(0,8);
    if (!ordered.length) upcoming.createEl('p',{text:'No scheduled subscriptions yet.',cls:'subloom-muted'});
    for (const r of ordered) this.subscriptionCard(upcoming,r,today,true);
    const list=root.createDiv({cls:'subloom-section'}); list.createEl('h2',{text:'All subscriptions'});
    const filters=list.createDiv({cls:'subloom-filters'});
    const search=filters.createEl('input',{type:'search',placeholder:'Search subscriptions'}); search.value=this.query;
    search.oninput=()=>{this.query=search.value; this.render(); const replacement=root.querySelector<HTMLInputElement>('input[type=search]'); replacement?.focus(); replacement?.setSelectionRange(this.query.length,this.query.length);};
    const categories=[...new Set(data.subscriptions.map(r=>r.category).filter(Boolean))].sort();
    this.select(filters,['all','active','paused','cancelled','archived'],this.lifecycle,v=>{this.lifecycle=v;this.render();},'Lifecycle');
    this.select(filters,['all',...categories],this.category,v=>{this.category=v;this.render();},'Category');
    this.select(filters,['all','auto','manual'],this.autoRenew,v=>{this.autoRenew=v;this.render();},'Renewal');
    this.select(filters,['all',...data.methods.map(m=>m.path)],this.method,v=>{this.method=v;this.render();},'Payment method',v=>data.methods.find(m=>m.path===v)?.name??v);
    this.select(filters,['next','name','amount'],this.sort,v=>{this.sort=v;this.render();},'Sort');
    const query=this.query.toLowerCase();
    const filtered=data.subscriptions.filter(r=>(!query || `${r.service} ${r.path} ${r.category}`.toLowerCase().includes(query)) && (this.lifecycle==='all'||r.lifecycle===this.lifecycle) && (this.category==='all'||r.category===this.category) && (this.method==='all'||r.paymentMethodPath===this.method) && (this.autoRenew==='all'||(this.autoRenew==='auto')===r.autoRenew));
    filtered.sort((a,b)=>this.sort==='name'?a.service.localeCompare(b.service):this.sort==='amount'?(b.amount??0)-(a.amount??0):(a.rule?calculateNextCharge(a.rule,today):'9999').localeCompare(b.rule?calculateNextCharge(b.rule,today):'9999'));
    if (!filtered.length) list.createEl('p',{text:data.subscriptions.length?'No subscriptions match these filters.':'No subscriptions found. Add one or tag an existing note subscription/...',cls:'subloom-muted'});
    for (const r of filtered) this.subscriptionCard(list,r,today,false);
    const methods=root.createDiv({cls:'subloom-section'}); methods.createEl('h2',{text:'Payment methods'});
    if (!data.methods.length) methods.createEl('p',{text:'No payment method notes found.',cls:'subloom-muted'});
    for (const method of data.methods) {
      const card=methods.createDiv({cls:'subloom-card'}); const heading=card.createDiv({cls:'subloom-card-title'});
      const link=heading.createEl('button',{text:method.institution??method.name,cls:'subloom-link'}); link.onclick=()=>this.plugin.openNote(method.path);
      heading.createSpan({text:[method.kind,method.last4?`•••• ${method.last4}`:'',method.status].filter(Boolean).join(' · '),cls:'subloom-muted'});
      const attached=data.subscriptions.filter(r=>r.paymentMethodPath===method.path);
      card.createEl('p',{text:attached.length?attached.map(r=>r.service).join(' · '):'No linked subscriptions',cls:'subloom-muted'});
    }
    root.createEl('p',{text:'In-app reminders appear only while Obsidian is open. Forecasts do not confirm payment.',cls:'subloom-footnote'});
  }
  private kpi(parent:HTMLElement,label:string,value:string):void { const box=parent.createDiv({cls:'subloom-kpi'}); box.createSpan({text:label,cls:'subloom-kpi-label'}); box.createEl('strong',{text:value}); }
  private button(parent:HTMLElement,label:string,fn:()=>void):void { const b=parent.createEl('button',{text:label}); b.onclick=fn; }
  private select(parent:HTMLElement,values:string[],current:string,onChange:(v:string)=>void,label:string,display?:(v:string)=>string):void {
    const wrapper=parent.createEl('label'); wrapper.createSpan({text:label}); const el=wrapper.createEl('select');
    for(const value of values) { const option=el.createEl('option',{text:value==='all'?'All':display?.(value)??value,value}); option.selected=value===current; }
    el.onchange=()=>onChange(el.value);
  }
  private subscriptionCard(parent:HTMLElement,r:Subscription,asOf:string,compact:boolean):void {
    const card=parent.createDiv({cls:'subloom-card'}); const top=card.createDiv({cls:'subloom-card-title'});
    const open=top.createEl('button',{text:r.service,cls:'subloom-link'}); open.onclick=()=>this.plugin.openNote(r.path);
    const next=r.rule?calculateNextCharge(r.rule,asOf):undefined;
    const state=calculateVerificationState(r,asOf);
    const days=next?diffDays(next,asOf):undefined;
    const meta=[r.category,r.lifecycle,r.autoRenew?'Auto-renew':'Manual',next?`Next ${next} (${days}d)`:'Schedule incomplete',r.amount!=null?`${r.amount} ${r.currency??''}`:'',`Payment ${state}`,`Access ${entitlement(r,asOf)}`].filter(Boolean);
    card.createEl('p',{text:meta.join(' · '),cls:'subloom-muted'});
    if (!compact && r.paymentMethodPath) card.createEl('p',{text:`Payment method: ${this.plugin.index.methods.find(m=>m.path===r.paymentMethodPath)?.institution??r.paymentMethodPath}`,cls:'subloom-muted'});
    if (!compact && r.issues.length) card.createEl('p',{text:r.issues.map(i=>`${i.field}: ${i.message}`).join('; '),cls:'subloom-error'});
    if (!compact) {const actions=card.createDiv({cls:'subloom-actions'}); this.button(actions,'Record payment',()=>this.plugin.recordPayment(r)); this.button(actions,'Edit note',()=>this.plugin.openNote(r.path)); if (r.lifecycle==='active') this.button(actions,'Pause',()=>this.plugin.changeLifecycle(r,'paused')); else if (r.lifecycle==='paused') this.button(actions,'Resume',()=>this.plugin.changeLifecycle(r,'active'));}
  }
}
