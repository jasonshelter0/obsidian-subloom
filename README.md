# Subloom

Subloom: Subscription Management for Obsidian.

A local, Markdown-first Obsidian plugin for recurring payment forecasts and verified payment records.

## Develop

Run `npm install`, `npm test`, and `npm run build`. `main.js`, `manifest.json`, and `styles.css` are the plugin files. Enable Subloom in Obsidian's Community Plugins settings. The dashboard opens from the ribbon or the **Open Subscription Dashboard** command.

Use `sample-vault/` as fixture notes in a separate test vault. It contains ten distributed subscription folders, nested tags, a shared card, and a broken card link. Do not run tests against personal financial notes. The plugin reads existing subscription-tagged notes throughout the currently open vault, including legacy fields, without rewriting them. An **Add Subscription** command creates a new note in `Subloom/`.

A predicted renewal is never a verified payment. The **Record Payment** dialog requires confirmation and writes `last_payment_date` and exclusive `paid_through` to the original note. Notices and snooze work only while Obsidian is open; they are not system push notifications.

See `docs/DATA_SCHEMA.md` for field definitions and `docs/TEST_PLAN.md` for manual checks. No Dataview, Tasks, Reminder, or cloud service is needed.
