# Subloom

[English](README.md) · [简体中文](README.zh-CN.md)

Subscription management for Obsidian, with your records stored in ordinary Markdown notes. Subloom brings recurring payment forecasts, verified payment dates, and reminders into one dashboard.

[Manual](https://jasonshelter0.github.io/subloom/) · [中文手册](https://jasonshelter0.github.io/zh-cn/subloom/) · [Jason’s website](https://jasonshelter0.github.io/) · [个人网站（中文）](https://jasonshelter0.github.io/zh-cn/) · [Download 0.1.0](https://github.com/jasonshelter0/obsidian-subloom/releases/tag/0.1.0)

## Features

- Discover subscription notes anywhere in your vault by `record_type: subscription` or `subscription` / `subscription/...` tags.
- Forecast weekly, monthly, and yearly charges using local calendar dates. View monthly estimates separately for each currency.
- Search and filter by lifecycle, category, payment method, and renewal mode.
- Link payment method notes to subscriptions and see which services use each method.
- Record verified payments in the original note, and pause or resume subscriptions with confirmation.
- Review upcoming charges and payment checks, snooze reminders for one day, or acknowledge them.

Subloom works locally and requires no Dataview, Tasks, Reminder, or cloud service. In-app reminders appear while Obsidian is open. A scheduled renewal is a forecast; payment is confirmed only after you verify the charge and record it.

## Install 0.1.0

Requires Obsidian **1.12.0 or later**.

1. Download these three files from the [0.1.0 release](https://github.com/jasonshelter0/obsidian-subloom/releases/tag/0.1.0): [main.js](https://github.com/jasonshelter0/obsidian-subloom/releases/download/0.1.0/main.js), [manifest.json](https://github.com/jasonshelter0/obsidian-subloom/releases/download/0.1.0/manifest.json), and [styles.css](https://github.com/jasonshelter0/obsidian-subloom/releases/download/0.1.0/styles.css).
2. Create `<your-vault>/.obsidian/plugins/subloom/` and place the three files inside it.
3. Reload Obsidian, open **Settings → Community plugins**, turn off Restricted mode if needed, and enable **Subloom**.
4. Use the ribbon icon or the **Subloom: Open Subscription Dashboard** command.

## Your first subscription

Run **Subloom: Add Subscription** to create a note in `Subloom/`, or add frontmatter like this to a note anywhere in the vault:

```yaml
---
record_type: subscription
service: Example service
subscription_start: 2026-10-01
billing_cycle: monthly
billing_interval: 1
amount: 12
currency: USD
auto_renew: true
remind_before: 3
subscription_lifecycle: active
---
```

Use **Record payment** after confirming a successful charge. The dialog writes `last_payment_date`, `paid_through`, and `verification_status` to the source note. `paid_through` is exclusive: `2026-11-01` means coverage ends at the start of November 1. Setting `auto_renew: true` does not confirm payment or establish coverage.

Explore the [demo vault notes](sample-vault/) in a separate test vault. They include subscriptions across ten folders, nested tags, a shared payment method, and a deliberately broken payment method link.

## Documentation

- [User manual](https://jasonshelter0.github.io/subloom/) — installation, examples, dashboard actions, reminders, and troubleshooting.
- [Data schema](docs/DATA_SCHEMA.md) — supported fields and their meanings.
- [Architecture](docs/ARCHITECTURE.md) — indexing, recurrence calculations, and views.
- [Test plan](docs/TEST_PLAN.md) — manual checks in Obsidian.
- [Report a bug or request a feature](https://github.com/jasonshelter0/obsidian-subloom/issues).

## Develop

```bash
npm install
npm test
npm run build
```

`npm test` runs the domain tests; `npm run build` typechecks and bundles the plugin. The installable files are `main.js`, `manifest.json`, and `styles.css`. Use the demo notes for development and manual checks.
