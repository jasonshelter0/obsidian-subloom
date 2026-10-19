import { Modal, Notice, Plugin, PluginSettingTab, Setting, TFile, WorkspaceLeaf, normalizePath } from 'obsidian';
import { buildIndex, type IndexData } from './data/index';
import type { Subscription } from './domain/model';
import { addDays, calculateNextCharge, parseDate, today } from './domain/dates';
import { notifyReminders, reminderEvents, type ReminderState } from './services/reminders';
import { DashboardView, VIEW_TYPE } from './ui/dashboard';
interface SettingsData { recognizeTags:boolean; notices:boolean; reminderState:ReminderState; }
const DEFAULT:SettingsData={recognizeTags:true,notices:true,reminderState:{acknowledged:{},snoozedUntil:{}}};
export default class SubloomPlugin extends Plugin {
  settings:SettingsData=DEFAULT;
  index:IndexData={subscriptions:[],methods:[]};
  loading=true;
  private rebuildTimer:number|undefined;
  private seen=new Set<string>();
  private date=today();
  get reminders():ReminderState {return this.settings.reminderState;}
  currentDate():string {return today();}
  async onload():Promise<void> {
    const saved=await this.loadData() as Partial<SettingsData>|null;
    this.settings={...DEFAULT,...saved,reminderState:{...DEFAULT.reminderState,...saved?.reminderState}};
    this.registerView(VIEW_TYPE,(leaf:WorkspaceLeaf)=>new DashboardView(leaf,this));
    this.addRibbonIcon('calendar-clock','Open Subloom dashboard',()=>void this.openDashboard());
    this.addCommand({id:'open-dashboard',name:'Open Subscription Dashboard',callback:()=>void this.openDashboard()});
    this.addCommand({id:'add-subscription',name:'Add Subscription',callback:()=>void this.addSubscription()});
    this.addCommand({id:'record-payment',name:'Record Payment',callback:()=>{
      const file=this.app.workspace.getActiveFile(); const record=this.index.subscriptions.find(r=>r.path===file?.path);
      if (record) this.recordPayment(record); else new Notice('Open a subscription note to record its payment.');
    }});
    this.addSettingTab(new SubloomSettings(this.app,this));
    this.registerEvent(this.app.vault.on('create',()=>this.scheduleRebuild()));
    this.registerEvent(this.app.vault.on('delete',()=>this.scheduleRebuild()));
    this.registerEvent(this.app.vault.on('rename',()=>this.scheduleRebuild()));
    this.registerEvent(this.app.vault.on('modify',()=>this.scheduleRebuild()));
    this.registerEvent(this.app.metadataCache.on('changed',()=>this.scheduleRebuild()));
    this.registerInterval(window.setInterval(()=>{
      const now=today(); if(now!==this.date){this.date=now;this.refresh();this.showReminders();}
    },60000));
    this.app.workspace.onLayoutReady(()=>void this.rebuild());
  }
  onunload():void {if(this.rebuildTimer)window.clearTimeout(this.rebuildTimer);}
  private scheduleRebuild():void { if(this.rebuildTimer)window.clearTimeout(this.rebuildTimer); this.rebuildTimer=window.setTimeout(()=>void this.rebuild(),400); }
  async rebuild():Promise<void> {
    this.loading=true; this.refresh();
    try {this.index=await buildIndex(this.app,this.settings);}
    catch{new Notice('Subloom could not scan the vault.');}
    finally {this.loading=false;this.refresh();this.showReminders();}
  }
  refresh():void {for(const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)){const view=leaf.view;if(view instanceof DashboardView)view.render();}}
  private showReminders():void {if(this.settings.notices)notifyReminders(reminderEvents(this.index.subscriptions,today()),this.reminders,today(),this.seen);}
  async openDashboard():Promise<void> {
    let leaf=this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf){leaf=this.app.workspace.getRightLeaf(false)??this.app.workspace.getLeaf(true);await leaf.setViewState({type:VIEW_TYPE,active:true});}
    this.app.workspace.revealLeaf(leaf);
  }
  async openNote(path:string):Promise<void> {const file=this.app.vault.getAbstractFileByPath(path);if(file instanceof TFile)await this.app.workspace.getLeaf('tab').openFile(file);}
  async addSubscription():Promise<void> {
    const folder='Subloom';
    if(!this.app.vault.getAbstractFileByPath(folder))await this.app.vault.createFolder(folder);
    let path=normalizePath(`${folder}/New subscription.md`),n=2;
    while(this.app.vault.getAbstractFileByPath(path))path=normalizePath(`${folder}/New subscription ${n++}.md`);
    const start=today();
    const file=await this.app.vault.create(path,`---\ntags:\n  - subscription\nrecord_type: subscription\nservice: New subscription\nsubscription_start: ${start}\nbilling_cycle: monthly\nbilling_interval: 1\namount: 0\ncurrency: USD\nauto_renew: false\nremind_before: 3\nsubscription_lifecycle: active\n---\n`);
    await this.app.workspace.getLeaf('tab').openFile(file);
  }
  recordPayment(record:Subscription):void {new PaymentModal(this,record).open();}
  changeLifecycle(record:Subscription,target:'active'|'paused'):void {new LifecycleModal(this,record,target).open();}
  async confirmLifecycle(record:Subscription,target:'active'|'paused'):Promise<void> {
    const file=this.app.vault.getAbstractFileByPath(record.path); if(!(file instanceof TFile)){new Notice('Subscription note no longer exists.');return;}
    await this.app.fileManager.processFrontMatter(file,fm=>{fm.subscription_lifecycle=target;});
    await this.rebuild();
  }
  async acknowledge(key:string):Promise<void> {this.reminders.acknowledged[key]=true;await this.saveData(this.settings);this.refresh();}
  async snooze(key:string):Promise<void> {this.reminders.snoozedUntil[key]=addDays(today(),1);this.seen.delete(key);await this.saveData(this.settings);this.refresh();}
  async confirmPayment(record:Subscription,paymentDate:string,paidThrough:string):Promise<void> {
    if(!parseDate(paymentDate)||!parseDate(paidThrough)||paidThrough<=paymentDate){new Notice('Enter valid dates; paid-through must follow payment date.');return;}
    const file=this.app.vault.getAbstractFileByPath(record.path);
    if(!(file instanceof TFile)){new Notice('Subscription note no longer exists.');return;}
    await this.app.fileManager.processFrontMatter(file,fm=>{fm.last_payment_date=paymentDate;fm.paid_through=paidThrough;fm.verification_status='confirmed';});
    new Notice(`Payment recorded for ${record.service}.`);
    await this.rebuild();
  }
}
class PaymentModal extends Modal {
  private paymentDate=today(); private paidThrough:string;
  constructor(private plugin:SubloomPlugin,private record:Subscription){super(plugin.app);this.paidThrough=record.rule?calculateNextCharge(record.rule,addDays(today(),1)):addDays(today(),30);}
  onOpen():void {
    const {contentEl}=this;contentEl.empty();contentEl.createEl('h2',{text:`Record payment · ${this.record.service}`});
    contentEl.createEl('p',{text:'Confirm only after verifying the successful charge. Paid-through is the first day without coverage.'});
    new Setting(contentEl).setName('Verified payment date').addText(t=>t.setValue(this.paymentDate).onChange(v=>this.paymentDate=v));
    new Setting(contentEl).setName('Paid through (exclusive)').addText(t=>t.setValue(this.paidThrough).onChange(v=>this.paidThrough=v));
    new Setting(contentEl).addButton(b=>b.setButtonText('Confirm verified payment').setCta().onClick(async()=>{await this.plugin.confirmPayment(this.record,this.paymentDate,this.paidThrough);this.close();}));
  }
  onClose():void {this.contentEl.empty();}
}
class SubloomSettings extends PluginSettingTab {
  constructor(app:SubloomPlugin['app'],private plugin:SubloomPlugin){super(app,plugin);}
  display():void {
    this.containerEl.empty();this.containerEl.createEl('h2',{text:'Subloom'});
    new Setting(this.containerEl).setName('Recognize subscription tags').setDesc('Include notes tagged subscription or subscription/… without record_type.').addToggle(t=>t.setValue(this.plugin.settings.recognizeTags).onChange(async v=>{this.plugin.settings.recognizeTags=v;await this.plugin.saveData(this.plugin.settings);await this.plugin.rebuild();}));
    new Setting(this.containerEl).setName('In-app notices').setDesc('Notices appear only while Obsidian is open; closed-app push notifications are unavailable.').addToggle(t=>t.setValue(this.plugin.settings.notices).onChange(async v=>{this.plugin.settings.notices=v;await this.plugin.saveData(this.plugin.settings);}));
  }
}

class LifecycleModal extends Modal {
  constructor(private plugin:SubloomPlugin,private record:Subscription,private target:'active'|'paused'){super(plugin.app);}
  onOpen():void {
    this.contentEl.createEl('h2',{text:`${this.target==='paused'?'Pause':'Resume'} ${this.record.service}?`});
    this.contentEl.createEl('p',{text:'This updates the lifecycle property in the original note. Payment history is unchanged.'});
    new Setting(this.contentEl).addButton(b=>b.setButtonText('Confirm').setCta().onClick(async()=>{await this.plugin.confirmLifecycle(this.record,this.target);this.close();}));
  }
  onClose():void {this.contentEl.empty();}
}
