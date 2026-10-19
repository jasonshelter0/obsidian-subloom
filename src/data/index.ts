import { App, TFile, getAllTags } from 'obsidian';
import type { PaymentMethod, Subscription, Issue, Cycle, Lifecycle } from '../domain/model';
import { parseDate } from '../domain/dates';

export interface IndexData { subscriptions: Subscription[]; methods: PaymentMethod[]; }
export interface DiscoverySettings { recognizeTags: boolean; }
function str(value: unknown): string | undefined { return typeof value === 'string' && value.trim() ? value.trim() : undefined; }
function dateString(value: unknown): string | undefined {
  if (typeof value === 'string') return str(value);
  if (value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth()+1).padStart(2,'0')}-${String(value.getDate()).padStart(2,'0')}`;
  return;
}
function int(value: unknown): number | undefined { const n = Number(value); return Number.isInteger(n) ? n : undefined; }
function frontmatter(app: App, file: TFile): Record<string, unknown> | undefined {
  return app.metadataCache.getFileCache(file)?.frontmatter;
}
function hasSubscriptionTag(app: App, file: TFile): boolean {
  const cache = app.metadataCache.getFileCache(file);
  const tags = cache ? getAllTags(cache) ?? [] : [];
  return tags.some(tag => /^#?subscription(?:\/|$)/i.test(tag));
}
export function isSubscription(app: App, file: TFile, settings: DiscoverySettings): boolean {
  const fm = frontmatter(app,file);
  if (fm?.record_type === 'subscription') return true;
  if (fm?.record_type && fm.record_type !== 'subscription') return false;
  return settings.recognizeTags && hasSubscriptionTag(app,file);
}
function parseSubscription(file: TFile, fm: Record<string, unknown>): Subscription {
  const issues: Issue[] = [];
  const start = dateString(fm.subscription_start);
  const cycle = str(fm.billing_cycle);
  const interval = fm.billing_interval == null ? 1 : int(fm.billing_interval);
  const anchor = fm.billing_anchor_day == null ? undefined : int(fm.billing_anchor_day);
  if (!start || !parseDate(start)) issues.push({field:'subscription_start',message:'Use a valid YYYY-MM-DD date'});
  if (!['monthly','yearly','weekly'].includes(cycle ?? '')) issues.push({field:'billing_cycle',message:'Use monthly, yearly, or weekly'});
  if (!interval || interval < 1) issues.push({field:'billing_interval',message:'Use a positive whole number'});
  if (anchor != null && (anchor < 1 || anchor > 31)) issues.push({field:'billing_anchor_day',message:'Use a day from 1 to 31'});
  const reminder = fm.remind_before == null ? 3 : int(fm.remind_before);
  if (reminder == null || reminder < 0) issues.push({field:'remind_before',message:'Use zero or a positive whole number'});
  const rawAmount = fm.amount ?? fm.price;
  const amount = rawAmount == null ? undefined : Number(rawAmount);
  if (amount != null && (!Number.isFinite(amount) || amount < 0)) issues.push({field:'amount',message:'Use a nonnegative number'});
  const lifecycleRaw = str(fm.subscription_lifecycle ?? fm.subscription_status) ?? 'active';
  const lifecycle = ['active','paused','cancelled','archived'].includes(lifecycleRaw) ? lifecycleRaw as Lifecycle : 'active';
  if (lifecycleRaw !== lifecycle) issues.push({field:'subscription_lifecycle',message:'Unknown lifecycle'});
  const lastPaymentDate = dateString(fm.last_payment_date), paidThrough = dateString(fm.paid_through);
  for (const [field,value] of [['last_payment_date',lastPaymentDate],['paid_through',paidThrough]] as const) if (value && !parseDate(value)) issues.push({field,message:'Use a valid YYYY-MM-DD date'});
  return {
    path:file.path, service:str(fm.service) ?? file.basename, category:str(fm.category) ?? '',
    rule: issues.some(i=>['subscription_start','billing_cycle','billing_interval','billing_anchor_day'].includes(i.field)) ? undefined : {start:start!,cycle:cycle as Cycle,interval:interval!,anchorDay:anchor},
    amount:amount != null && Number.isFinite(amount) && amount >= 0 ? amount : undefined,
    currency:str(fm.currency)?.toUpperCase(), autoRenew:fm.auto_renew === true,
    lifecycle, paymentMethodRaw:str(fm.payment_method), remindBefore:reminder != null && reminder >= 0 ? reminder : 3,
    lastPaymentDate: lastPaymentDate && parseDate(lastPaymentDate) ? lastPaymentDate : undefined,
    paidThrough: paidThrough && parseDate(paidThrough) ? paidThrough : undefined,
    verificationOverride:fm.verification_status === 'failed' || fm.verification_status === 'waived' ? fm.verification_status : undefined,
    issues
  };
}
function parseMethod(file: TFile, fm: Record<string, unknown>): PaymentMethod {
  return {path:file.path,name:file.basename,institution:str(fm.institution),kind:str(fm.payment_kind),currency:str(fm.currency),last4:str(fm.card_last4),expiryMonth:str(fm.card_expiry_month),status:str(fm.payment_method_status)};
}
export async function buildIndex(app: App, settings: DiscoverySettings): Promise<IndexData> {
  const subscriptions: Subscription[] = [], methods: PaymentMethod[] = [];
  const files = app.vault.getMarkdownFiles();
  for (let i=0;i<files.length;i++) {
    const file=files[i], fm=frontmatter(app,file);
    if (fm?.record_type === 'payment_method') methods.push(parseMethod(file,fm));
    else if (fm && isSubscription(app,file,settings)) subscriptions.push(parseSubscription(file,fm));
    if (i > 0 && i % 200 === 0) await new Promise<void>(resolve=>setTimeout(resolve,0));
  }
  const methodPaths = new Set(methods.map(m=>m.path));
  for (const sub of subscriptions) {
    if (!sub.paymentMethodRaw) continue;
    const link = sub.paymentMethodRaw.replace(/^\[\[/,'').replace(/\]\]$/,'').split('|')[0].split('#')[0];
    const matches = link.includes('/') ? [] : files.filter(f=>f.basename===link || f.path.replace(/\.md$/i,'')===link);
    const target = app.metadataCache.getFirstLinkpathDest(link,sub.path);
    if (matches.length > 1) sub.issues.push({field:'payment_method',message:'Ambiguous note name; use a path-qualified wikilink'});
    else if (target && methodPaths.has(target.path)) sub.paymentMethodPath=target.path;
    else sub.issues.push({field:'payment_method',message:'Payment method link is missing or does not target a payment method note'});
  }
  return {subscriptions,methods};
}
