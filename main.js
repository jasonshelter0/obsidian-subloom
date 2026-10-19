"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => SubloomPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian4 = require("obsidian");

// src/data/index.ts
var import_obsidian = require("obsidian");

// src/domain/dates.ts
function parseDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return;
  return date;
}
function formatDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function today() {
  return formatDate(/* @__PURE__ */ new Date());
}
function addDays(value, days) {
  const date = parseDate(value);
  if (!date) throw new Error(`Invalid date: ${value}`);
  date.setDate(date.getDate() + days);
  return formatDate(date);
}
function diffDays(a, b) {
  const x = parseDate(a), y = parseDate(b);
  if (!x || !y) throw new Error("Invalid date");
  return Math.round((Date.UTC(x.getFullYear(), x.getMonth(), x.getDate()) - Date.UTC(y.getFullYear(), y.getMonth(), y.getDate())) / 864e5);
}
function occurrence(rule, index) {
  const start = parseDate(rule.start);
  if (!start || !Number.isInteger(index) || index < 0) throw new Error("Invalid recurrence");
  if (!Number.isInteger(rule.interval) || rule.interval < 1) throw new Error("Invalid interval");
  if (rule.cycle === "weekly") return addDays(rule.start, index * rule.interval * 7);
  const step = rule.interval * (rule.cycle === "yearly" ? 12 : 1);
  const offset = rule.anchorDay != null && rule.anchorDay < start.getDate() ? step : 0;
  const months = index * step + offset;
  const absoluteMonth = start.getFullYear() * 12 + start.getMonth() + months;
  const year = Math.floor(absoluteMonth / 12), month = absoluteMonth % 12;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const anchor = rule.anchorDay ?? start.getDate();
  if (anchor < 1 || anchor > 31) throw new Error("Invalid anchor day");
  return formatDate(new Date(year, month, Math.min(anchor, lastDay)));
}
function approximateIndex(rule, asOf) {
  const start = parseDate(rule.start), date = parseDate(asOf);
  if (rule.cycle === "weekly") return Math.max(0, Math.floor(diffDays(asOf, rule.start) / (7 * rule.interval)));
  const months = (date.getFullYear() - start.getFullYear()) * 12 + date.getMonth() - start.getMonth();
  return Math.max(0, Math.floor(months / (rule.interval * (rule.cycle === "yearly" ? 12 : 1))));
}
function calculateNextCharge(rule, asOf) {
  if (!parseDate(asOf) || !parseDate(rule.start)) throw new Error("Invalid date");
  let index = approximateIndex(rule, asOf);
  while (index > 0 && occurrence(rule, index - 1) >= asOf) index--;
  while (occurrence(rule, index) < asOf) index++;
  return occurrence(rule, index);
}
function latestCharge(rule, asOf) {
  if (asOf < rule.start) return;
  let index = approximateIndex(rule, asOf);
  while (occurrence(rule, index) > asOf && index > 0) index--;
  while (occurrence(rule, index + 1) <= asOf) index++;
  return occurrence(rule, index) <= asOf ? occurrence(rule, index) : void 0;
}
function calculateVerificationState(record, asOf) {
  if (record.verificationOverride) return record.verificationOverride;
  if (!record.rule) return "unverified";
  const latest = latestCharge(record.rule, asOf);
  if (!latest || !record.lastPaymentDate) return "unverified";
  const next = calculateNextCharge(record.rule, addDays(latest, 1));
  return record.lastPaymentDate >= latest && record.lastPaymentDate < next ? "confirmed" : "unverified";
}
function entitlement(record, asOf) {
  return !record.paidThrough ? "unknown" : record.paidThrough > asOf ? "covered" : "ended";
}

// src/data/index.ts
function str(value) {
  return typeof value === "string" && value.trim() ? value.trim() : void 0;
}
function dateString(value) {
  if (typeof value === "string") return str(value);
  if (value instanceof Date) return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  return;
}
function int(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : void 0;
}
function frontmatter(app, file) {
  return app.metadataCache.getFileCache(file)?.frontmatter;
}
function hasSubscriptionTag(app, file) {
  const cache = app.metadataCache.getFileCache(file);
  const tags = cache ? (0, import_obsidian.getAllTags)(cache) ?? [] : [];
  return tags.some((tag) => /^#?subscription(?:\/|$)/i.test(tag));
}
function isSubscription(app, file, settings) {
  const fm = frontmatter(app, file);
  if (fm?.record_type === "subscription") return true;
  if (fm?.record_type && fm.record_type !== "subscription") return false;
  return settings.recognizeTags && hasSubscriptionTag(app, file);
}
function parseSubscription(file, fm) {
  const issues = [];
  const start = dateString(fm.subscription_start);
  const cycle = str(fm.billing_cycle);
  const interval = fm.billing_interval == null ? 1 : int(fm.billing_interval);
  const anchor = fm.billing_anchor_day == null ? void 0 : int(fm.billing_anchor_day);
  if (!start || !parseDate(start)) issues.push({ field: "subscription_start", message: "Use a valid YYYY-MM-DD date" });
  if (!["monthly", "yearly", "weekly"].includes(cycle ?? "")) issues.push({ field: "billing_cycle", message: "Use monthly, yearly, or weekly" });
  if (!interval || interval < 1) issues.push({ field: "billing_interval", message: "Use a positive whole number" });
  if (anchor != null && (anchor < 1 || anchor > 31)) issues.push({ field: "billing_anchor_day", message: "Use a day from 1 to 31" });
  const reminder = fm.remind_before == null ? 3 : int(fm.remind_before);
  if (reminder == null || reminder < 0) issues.push({ field: "remind_before", message: "Use zero or a positive whole number" });
  const rawAmount = fm.amount ?? fm.price;
  const amount = rawAmount == null ? void 0 : Number(rawAmount);
  if (amount != null && (!Number.isFinite(amount) || amount < 0)) issues.push({ field: "amount", message: "Use a nonnegative number" });
  const lifecycleRaw = str(fm.subscription_lifecycle ?? fm.subscription_status) ?? "active";
  const lifecycle = ["active", "paused", "cancelled", "archived"].includes(lifecycleRaw) ? lifecycleRaw : "active";
  if (lifecycleRaw !== lifecycle) issues.push({ field: "subscription_lifecycle", message: "Unknown lifecycle" });
  const lastPaymentDate = dateString(fm.last_payment_date), paidThrough = dateString(fm.paid_through);
  for (const [field, value] of [["last_payment_date", lastPaymentDate], ["paid_through", paidThrough]]) if (value && !parseDate(value)) issues.push({ field, message: "Use a valid YYYY-MM-DD date" });
  return {
    path: file.path,
    service: str(fm.service) ?? file.basename,
    category: str(fm.category) ?? "",
    rule: issues.some((i) => ["subscription_start", "billing_cycle", "billing_interval", "billing_anchor_day"].includes(i.field)) ? void 0 : { start, cycle, interval, anchorDay: anchor },
    amount: amount != null && Number.isFinite(amount) && amount >= 0 ? amount : void 0,
    currency: str(fm.currency)?.toUpperCase(),
    autoRenew: fm.auto_renew === true,
    lifecycle,
    paymentMethodRaw: str(fm.payment_method),
    remindBefore: reminder != null && reminder >= 0 ? reminder : 3,
    lastPaymentDate: lastPaymentDate && parseDate(lastPaymentDate) ? lastPaymentDate : void 0,
    paidThrough: paidThrough && parseDate(paidThrough) ? paidThrough : void 0,
    verificationOverride: fm.verification_status === "failed" || fm.verification_status === "waived" ? fm.verification_status : void 0,
    issues
  };
}
function parseMethod(file, fm) {
  return { path: file.path, name: file.basename, institution: str(fm.institution), kind: str(fm.payment_kind), currency: str(fm.currency), last4: str(fm.card_last4), expiryMonth: str(fm.card_expiry_month), status: str(fm.payment_method_status) };
}
async function buildIndex(app, settings) {
  const subscriptions = [], methods = [];
  const files = app.vault.getMarkdownFiles();
  for (let i = 0; i < files.length; i++) {
    const file = files[i], fm = frontmatter(app, file);
    if (fm?.record_type === "payment_method") methods.push(parseMethod(file, fm));
    else if (fm && isSubscription(app, file, settings)) subscriptions.push(parseSubscription(file, fm));
    if (i > 0 && i % 200 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  const methodPaths = new Set(methods.map((m) => m.path));
  for (const sub of subscriptions) {
    if (!sub.paymentMethodRaw) continue;
    const link = sub.paymentMethodRaw.replace(/^\[\[/, "").replace(/\]\]$/, "").split("|")[0].split("#")[0];
    const matches = link.includes("/") ? [] : files.filter((f) => f.basename === link || f.path.replace(/\.md$/i, "") === link);
    const target = app.metadataCache.getFirstLinkpathDest(link, sub.path);
    if (matches.length > 1) sub.issues.push({ field: "payment_method", message: "Ambiguous note name; use a path-qualified wikilink" });
    else if (target && methodPaths.has(target.path)) sub.paymentMethodPath = target.path;
    else sub.issues.push({ field: "payment_method", message: "Payment method link is missing or does not target a payment method note" });
  }
  return { subscriptions, methods };
}

// src/services/reminders.ts
var import_obsidian2 = require("obsidian");
function reminderEvents(records, asOf) {
  const result = [];
  for (const r of records) {
    if (r.lifecycle !== "active" || !r.rule) continue;
    const next = calculateNextCharge(r.rule, asOf), days = diffDays(next, asOf);
    if (days === 0) result.push({ key: `${r.path}|${next}|due`, label: `${r.service} is due today`, path: r.path, kind: "due" });
    else if (days > 0 && days <= r.remindBefore) result.push({ key: `${r.path}|${next}|advance`, label: `${r.service} is due in ${days} day${days === 1 ? "" : "s"}`, path: r.path, kind: "advance" });
    const latest = latestCharge(r.rule, asOf);
    if (latest && diffDays(asOf, latest) > 0 && calculateVerificationState(r, asOf) === "unverified") result.push({ key: `${r.path}|${latest}|verification`, label: `Check payment for ${r.service} (${latest})`, path: r.path, kind: "verification" });
  }
  return result;
}
function visibleReminders(events, state, asOf) {
  return events.filter((e) => !state.acknowledged[e.key] && (!state.snoozedUntil[e.key] || state.snoozedUntil[e.key] <= asOf));
}
function notifyReminders(events, state, asOf, seen) {
  for (const event of visibleReminders(events, state, asOf).slice(0, 5)) {
    if (seen.has(event.key)) continue;
    seen.add(event.key);
    new import_obsidian2.Notice(`Subloom: ${event.label}`, 7e3);
  }
}

// src/ui/dashboard.ts
var import_obsidian3 = require("obsidian");
var VIEW_TYPE = "subloom-dashboard";
var DashboardView = class extends import_obsidian3.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }
  query = "";
  lifecycle = "all";
  category = "all";
  method = "all";
  autoRenew = "all";
  sort = "next";
  getViewType() {
    return VIEW_TYPE;
  }
  getDisplayText() {
    return "Subloom";
  }
  getIcon() {
    return "calendar-clock";
  }
  async onOpen() {
    this.render();
  }
  render() {
    const root = this.contentEl;
    root.empty();
    root.addClass("subloom");
    const today2 = this.plugin.currentDate();
    const data = this.plugin.index;
    const header = root.createDiv({ cls: "subloom-header" });
    const title = header.createDiv();
    title.createEl("h1", { text: "Subloom" });
    title.createEl("p", { text: "Your recurring payments, in one place." });
    const add = header.createEl("button", { text: "Add subscription", cls: "mod-cta" });
    add.onclick = () => this.plugin.addSubscription();
    if (this.plugin.loading) {
      root.createEl("p", { text: "Scanning vault\u2026" });
      return;
    }
    const active = data.subscriptions.filter((r) => r.lifecycle === "active");
    const dueSoon = active.filter((r) => r.rule && diffDays(calculateNextCharge(r.rule, today2), today2) <= r.remindBefore).length;
    const overdue = active.filter((r) => r.rule && latestCharge(r.rule, today2) && calculateVerificationState(r, today2) === "unverified" && diffDays(today2, latestCharge(r.rule, today2)) > 0).length;
    const monthly = /* @__PURE__ */ new Map();
    for (const r of active) if (r.rule && r.amount != null && r.currency) {
      const factor = r.rule.cycle === "monthly" ? 1 / r.rule.interval : r.rule.cycle === "yearly" ? 1 / (12 * r.rule.interval) : 52 / (12 * r.rule.interval);
      monthly.set(r.currency, (monthly.get(r.currency) ?? 0) + r.amount * factor);
    }
    const kpis = root.createDiv({ cls: "subloom-kpis" });
    this.kpi(kpis, "Active", String(active.length));
    this.kpi(kpis, "Due soon", String(dueSoon));
    this.kpi(kpis, "Verify payment", String(overdue));
    this.kpi(kpis, "Monthly forecast", Array.from(monthly).map(([c, v]) => `${v.toFixed(2)} ${c}`).join(" \xB7 ") || "\u2014");
    const candidateEvents = reminderEvents(data.subscriptions, today2);
    for (const method of data.methods) {
      if (method.expiryMonth && /^\d{4}-\d{2}$/.test(method.expiryMonth)) {
        const months = (Number(method.expiryMonth.slice(0, 4)) - Number(today2.slice(0, 4))) * 12 + Number(method.expiryMonth.slice(5, 7)) - Number(today2.slice(5, 7));
        if (months >= 0 && months <= 2) candidateEvents.push({ key: `${method.path}|expiry`, label: `${method.institution ?? method.name} expires in ${method.expiryMonth}`, path: method.path, kind: "advance" });
      }
    }
    const events = visibleReminders(candidateEvents, this.plugin.reminders, today2);
    const attention = root.createDiv({ cls: "subloom-section" });
    attention.createEl("h2", { text: "Needs attention" });
    if (!events.length) attention.createEl("p", { text: "Nothing needs attention right now.", cls: "subloom-muted" });
    for (const event of events.slice(0, 20)) {
      const row = attention.createDiv({ cls: "subloom-alert" });
      row.createSpan({ text: event.label });
      const actions = row.createDiv({ cls: "subloom-actions" });
      this.button(actions, "Open", () => this.plugin.openNote(event.path));
      this.button(actions, "Snooze 1 day", () => this.plugin.snooze(event.key));
      this.button(actions, "Acknowledge", () => this.plugin.acknowledge(event.key));
    }
    const upcoming = root.createDiv({ cls: "subloom-section" });
    upcoming.createEl("h2", { text: "Upcoming" });
    const ordered = active.filter((r) => r.rule).sort((a, b) => calculateNextCharge(a.rule, today2).localeCompare(calculateNextCharge(b.rule, today2))).slice(0, 8);
    if (!ordered.length) upcoming.createEl("p", { text: "No scheduled subscriptions yet.", cls: "subloom-muted" });
    for (const r of ordered) this.subscriptionCard(upcoming, r, today2, true);
    const list = root.createDiv({ cls: "subloom-section" });
    list.createEl("h2", { text: "All subscriptions" });
    const filters = list.createDiv({ cls: "subloom-filters" });
    const search = filters.createEl("input", { type: "search", placeholder: "Search subscriptions" });
    search.value = this.query;
    search.oninput = () => {
      this.query = search.value;
      this.render();
      const replacement = root.querySelector("input[type=search]");
      replacement?.focus();
      replacement?.setSelectionRange(this.query.length, this.query.length);
    };
    const categories = [...new Set(data.subscriptions.map((r) => r.category).filter(Boolean))].sort();
    this.select(filters, ["all", "active", "paused", "cancelled", "archived"], this.lifecycle, (v) => {
      this.lifecycle = v;
      this.render();
    }, "Lifecycle");
    this.select(filters, ["all", ...categories], this.category, (v) => {
      this.category = v;
      this.render();
    }, "Category");
    this.select(filters, ["all", "auto", "manual"], this.autoRenew, (v) => {
      this.autoRenew = v;
      this.render();
    }, "Renewal");
    this.select(filters, ["all", ...data.methods.map((m) => m.path)], this.method, (v) => {
      this.method = v;
      this.render();
    }, "Payment method", (v) => data.methods.find((m) => m.path === v)?.name ?? v);
    this.select(filters, ["next", "name", "amount"], this.sort, (v) => {
      this.sort = v;
      this.render();
    }, "Sort");
    const query = this.query.toLowerCase();
    const filtered = data.subscriptions.filter((r) => (!query || `${r.service} ${r.path} ${r.category}`.toLowerCase().includes(query)) && (this.lifecycle === "all" || r.lifecycle === this.lifecycle) && (this.category === "all" || r.category === this.category) && (this.method === "all" || r.paymentMethodPath === this.method) && (this.autoRenew === "all" || this.autoRenew === "auto" === r.autoRenew));
    filtered.sort((a, b) => this.sort === "name" ? a.service.localeCompare(b.service) : this.sort === "amount" ? (b.amount ?? 0) - (a.amount ?? 0) : (a.rule ? calculateNextCharge(a.rule, today2) : "9999").localeCompare(b.rule ? calculateNextCharge(b.rule, today2) : "9999"));
    if (!filtered.length) list.createEl("p", { text: data.subscriptions.length ? "No subscriptions match these filters." : "No subscriptions found. Add one or tag an existing note subscription/...", cls: "subloom-muted" });
    for (const r of filtered) this.subscriptionCard(list, r, today2, false);
    const methods = root.createDiv({ cls: "subloom-section" });
    methods.createEl("h2", { text: "Payment methods" });
    if (!data.methods.length) methods.createEl("p", { text: "No payment method notes found.", cls: "subloom-muted" });
    for (const method of data.methods) {
      const card = methods.createDiv({ cls: "subloom-card" });
      const heading = card.createDiv({ cls: "subloom-card-title" });
      const link = heading.createEl("button", { text: method.institution ?? method.name, cls: "subloom-link" });
      link.onclick = () => this.plugin.openNote(method.path);
      heading.createSpan({ text: [method.kind, method.last4 ? `\u2022\u2022\u2022\u2022 ${method.last4}` : "", method.status].filter(Boolean).join(" \xB7 "), cls: "subloom-muted" });
      const attached = data.subscriptions.filter((r) => r.paymentMethodPath === method.path);
      card.createEl("p", { text: attached.length ? attached.map((r) => r.service).join(" \xB7 ") : "No linked subscriptions", cls: "subloom-muted" });
    }
    root.createEl("p", { text: "In-app reminders appear only while Obsidian is open. Forecasts do not confirm payment.", cls: "subloom-footnote" });
  }
  kpi(parent, label, value) {
    const box = parent.createDiv({ cls: "subloom-kpi" });
    box.createSpan({ text: label, cls: "subloom-kpi-label" });
    box.createEl("strong", { text: value });
  }
  button(parent, label, fn) {
    const b = parent.createEl("button", { text: label });
    b.onclick = fn;
  }
  select(parent, values, current, onChange, label, display) {
    const wrapper = parent.createEl("label");
    wrapper.createSpan({ text: label });
    const el = wrapper.createEl("select");
    for (const value of values) {
      const option = el.createEl("option", { text: value === "all" ? "All" : display?.(value) ?? value, value });
      option.selected = value === current;
    }
    el.onchange = () => onChange(el.value);
  }
  subscriptionCard(parent, r, asOf, compact) {
    const card = parent.createDiv({ cls: "subloom-card" });
    const top = card.createDiv({ cls: "subloom-card-title" });
    const open = top.createEl("button", { text: r.service, cls: "subloom-link" });
    open.onclick = () => this.plugin.openNote(r.path);
    const next = r.rule ? calculateNextCharge(r.rule, asOf) : void 0;
    const state = calculateVerificationState(r, asOf);
    const days = next ? diffDays(next, asOf) : void 0;
    const meta = [r.category, r.lifecycle, r.autoRenew ? "Auto-renew" : "Manual", next ? `Next ${next} (${days}d)` : "Schedule incomplete", r.amount != null ? `${r.amount} ${r.currency ?? ""}` : "", `Payment ${state}`, `Access ${entitlement(r, asOf)}`].filter(Boolean);
    card.createEl("p", { text: meta.join(" \xB7 "), cls: "subloom-muted" });
    if (!compact && r.paymentMethodPath) card.createEl("p", { text: `Payment method: ${this.plugin.index.methods.find((m) => m.path === r.paymentMethodPath)?.institution ?? r.paymentMethodPath}`, cls: "subloom-muted" });
    if (!compact && r.issues.length) card.createEl("p", { text: r.issues.map((i) => `${i.field}: ${i.message}`).join("; "), cls: "subloom-error" });
    if (!compact) {
      const actions = card.createDiv({ cls: "subloom-actions" });
      this.button(actions, "Record payment", () => this.plugin.recordPayment(r));
      this.button(actions, "Edit note", () => this.plugin.openNote(r.path));
      if (r.lifecycle === "active") this.button(actions, "Pause", () => this.plugin.changeLifecycle(r, "paused"));
      else if (r.lifecycle === "paused") this.button(actions, "Resume", () => this.plugin.changeLifecycle(r, "active"));
    }
  }
};

// src/main.ts
var DEFAULT = { recognizeTags: true, notices: true, reminderState: { acknowledged: {}, snoozedUntil: {} } };
var SubloomPlugin = class extends import_obsidian4.Plugin {
  settings = DEFAULT;
  index = { subscriptions: [], methods: [] };
  loading = true;
  rebuildTimer;
  seen = /* @__PURE__ */ new Set();
  date = today();
  get reminders() {
    return this.settings.reminderState;
  }
  currentDate() {
    return today();
  }
  async onload() {
    const saved = await this.loadData();
    this.settings = { ...DEFAULT, ...saved, reminderState: { ...DEFAULT.reminderState, ...saved?.reminderState } };
    this.registerView(VIEW_TYPE, (leaf) => new DashboardView(leaf, this));
    this.addRibbonIcon("calendar-clock", "Open Subloom dashboard", () => void this.openDashboard());
    this.addCommand({ id: "open-dashboard", name: "Open Subscription Dashboard", callback: () => void this.openDashboard() });
    this.addCommand({ id: "add-subscription", name: "Add Subscription", callback: () => void this.addSubscription() });
    this.addCommand({ id: "record-payment", name: "Record Payment", callback: () => {
      const file = this.app.workspace.getActiveFile();
      const record = this.index.subscriptions.find((r) => r.path === file?.path);
      if (record) this.recordPayment(record);
      else new import_obsidian4.Notice("Open a subscription note to record its payment.");
    } });
    this.addSettingTab(new SubloomSettings(this.app, this));
    this.registerEvent(this.app.vault.on("create", () => this.scheduleRebuild()));
    this.registerEvent(this.app.vault.on("delete", () => this.scheduleRebuild()));
    this.registerEvent(this.app.vault.on("rename", () => this.scheduleRebuild()));
    this.registerEvent(this.app.vault.on("modify", () => this.scheduleRebuild()));
    this.registerEvent(this.app.metadataCache.on("changed", () => this.scheduleRebuild()));
    this.registerInterval(window.setInterval(() => {
      const now = today();
      if (now !== this.date) {
        this.date = now;
        this.refresh();
        this.showReminders();
      }
    }, 6e4));
    this.app.workspace.onLayoutReady(() => void this.rebuild());
  }
  onunload() {
    if (this.rebuildTimer) window.clearTimeout(this.rebuildTimer);
  }
  scheduleRebuild() {
    if (this.rebuildTimer) window.clearTimeout(this.rebuildTimer);
    this.rebuildTimer = window.setTimeout(() => void this.rebuild(), 400);
  }
  async rebuild() {
    this.loading = true;
    this.refresh();
    try {
      this.index = await buildIndex(this.app, this.settings);
    } catch {
      new import_obsidian4.Notice("Subloom could not scan the vault.");
    } finally {
      this.loading = false;
      this.refresh();
      this.showReminders();
    }
  }
  refresh() {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW_TYPE)) {
      const view = leaf.view;
      if (view instanceof DashboardView) view.render();
    }
  }
  showReminders() {
    if (this.settings.notices) notifyReminders(reminderEvents(this.index.subscriptions, today()), this.reminders, today(), this.seen);
  }
  async openDashboard() {
    let leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE)[0];
    if (!leaf) {
      leaf = this.app.workspace.getRightLeaf(false) ?? this.app.workspace.getLeaf(true);
      await leaf.setViewState({ type: VIEW_TYPE, active: true });
    }
    this.app.workspace.revealLeaf(leaf);
  }
  async openNote(path) {
    const file = this.app.vault.getAbstractFileByPath(path);
    if (file instanceof import_obsidian4.TFile) await this.app.workspace.getLeaf("tab").openFile(file);
  }
  async addSubscription() {
    const folder = "Subloom";
    if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
    let path = (0, import_obsidian4.normalizePath)(`${folder}/New subscription.md`), n = 2;
    while (this.app.vault.getAbstractFileByPath(path)) path = (0, import_obsidian4.normalizePath)(`${folder}/New subscription ${n++}.md`);
    const start = today();
    const file = await this.app.vault.create(path, `---
tags:
  - subscription
record_type: subscription
service: New subscription
subscription_start: ${start}
billing_cycle: monthly
billing_interval: 1
amount: 0
currency: USD
auto_renew: false
remind_before: 3
subscription_lifecycle: active
---
`);
    await this.app.workspace.getLeaf("tab").openFile(file);
  }
  recordPayment(record) {
    new PaymentModal(this, record).open();
  }
  changeLifecycle(record, target) {
    new LifecycleModal(this, record, target).open();
  }
  async confirmLifecycle(record, target) {
    const file = this.app.vault.getAbstractFileByPath(record.path);
    if (!(file instanceof import_obsidian4.TFile)) {
      new import_obsidian4.Notice("Subscription note no longer exists.");
      return;
    }
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm.subscription_lifecycle = target;
    });
    await this.rebuild();
  }
  async acknowledge(key) {
    this.reminders.acknowledged[key] = true;
    await this.saveData(this.settings);
    this.refresh();
  }
  async snooze(key) {
    this.reminders.snoozedUntil[key] = addDays(today(), 1);
    this.seen.delete(key);
    await this.saveData(this.settings);
    this.refresh();
  }
  async confirmPayment(record, paymentDate, paidThrough) {
    if (!parseDate(paymentDate) || !parseDate(paidThrough) || paidThrough <= paymentDate) {
      new import_obsidian4.Notice("Enter valid dates; paid-through must follow payment date.");
      return;
    }
    const file = this.app.vault.getAbstractFileByPath(record.path);
    if (!(file instanceof import_obsidian4.TFile)) {
      new import_obsidian4.Notice("Subscription note no longer exists.");
      return;
    }
    await this.app.fileManager.processFrontMatter(file, (fm) => {
      fm.last_payment_date = paymentDate;
      fm.paid_through = paidThrough;
      fm.verification_status = "confirmed";
    });
    new import_obsidian4.Notice(`Payment recorded for ${record.service}.`);
    await this.rebuild();
  }
};
var PaymentModal = class extends import_obsidian4.Modal {
  constructor(plugin, record) {
    super(plugin.app);
    this.plugin = plugin;
    this.record = record;
    this.paidThrough = record.rule ? calculateNextCharge(record.rule, addDays(today(), 1)) : addDays(today(), 30);
  }
  paymentDate = today();
  paidThrough;
  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: `Record payment \xB7 ${this.record.service}` });
    contentEl.createEl("p", { text: "Confirm only after verifying the successful charge. Paid-through is the first day without coverage." });
    new import_obsidian4.Setting(contentEl).setName("Verified payment date").addText((t) => t.setValue(this.paymentDate).onChange((v) => this.paymentDate = v));
    new import_obsidian4.Setting(contentEl).setName("Paid through (exclusive)").addText((t) => t.setValue(this.paidThrough).onChange((v) => this.paidThrough = v));
    new import_obsidian4.Setting(contentEl).addButton((b) => b.setButtonText("Confirm verified payment").setCta().onClick(async () => {
      await this.plugin.confirmPayment(this.record, this.paymentDate, this.paidThrough);
      this.close();
    }));
  }
  onClose() {
    this.contentEl.empty();
  }
};
var SubloomSettings = class extends import_obsidian4.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    this.containerEl.empty();
    this.containerEl.createEl("h2", { text: "Subloom" });
    new import_obsidian4.Setting(this.containerEl).setName("Recognize subscription tags").setDesc("Include notes tagged subscription or subscription/\u2026 without record_type.").addToggle((t) => t.setValue(this.plugin.settings.recognizeTags).onChange(async (v) => {
      this.plugin.settings.recognizeTags = v;
      await this.plugin.saveData(this.plugin.settings);
      await this.plugin.rebuild();
    }));
    new import_obsidian4.Setting(this.containerEl).setName("In-app notices").setDesc("Notices appear only while Obsidian is open; closed-app push notifications are unavailable.").addToggle((t) => t.setValue(this.plugin.settings.notices).onChange(async (v) => {
      this.plugin.settings.notices = v;
      await this.plugin.saveData(this.plugin.settings);
    }));
  }
};
var LifecycleModal = class extends import_obsidian4.Modal {
  constructor(plugin, record, target) {
    super(plugin.app);
    this.plugin = plugin;
    this.record = record;
    this.target = target;
  }
  onOpen() {
    this.contentEl.createEl("h2", { text: `${this.target === "paused" ? "Pause" : "Resume"} ${this.record.service}?` });
    this.contentEl.createEl("p", { text: "This updates the lifecycle property in the original note. Payment history is unchanged." });
    new import_obsidian4.Setting(this.contentEl).addButton((b) => b.setButtonText("Confirm").setCta().onClick(async () => {
      await this.plugin.confirmLifecycle(this.record, this.target);
      this.close();
    }));
  }
  onClose() {
    this.contentEl.empty();
  }
};
//# sourceMappingURL=main.js.map
