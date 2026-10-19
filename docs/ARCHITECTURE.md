# Architecture

Subloom scans the current vault's Markdown metadata cache. A file is one record. `record_type` or an exact/nested `subscription` tag identifies subscriptions; payment methods require `record_type: payment_method`. Derived forecasts live in memory. The pure domain module owns local-calendar recurrence and attention states. The data module normalizes frontmatter and resolves Obsidian links. The dashboard renders the index and opens source notes. The reminder service stores only snooze/acknowledgement keys in plugin data and emits in-app Notices while Obsidian runs.

No integration with Dataview, Tasks, Reminder or Bases is required. Bases registration is deferred until its runtime API can be checked; the installed Obsidian 1.12.3 type package provides the core APIs used here. Changes are debounced. A daily timer handles date rollover; vault and metadata events refresh the index. Large-vault indexing yields between batches.

## Phases

1. Typed normalization, recurrence, and tests.
2. Dedicated dashboard, filters, payment method relationships.
3. Confirmed payment writes and in-app reminder controls.
4. Runtime compatibility, performance, and Bases review.

## API compatibility decision

The installed `obsidian` 1.12.3 declarations inside this vault confirm `Plugin.registerView`, `FileManager.processFrontMatter`, `MetadataCache.getFirstLinkpathDest`, and `Plugin.registerBasesView`. Bases custom views subclass `BasesView`, receive a `QueryController`, and rerender in `onDataUpdated` when the query result changes. The dedicated ItemView remains the primary interface. A Bases view is deferred because it would duplicate this dashboard's actions and reminders; no `.base` YAML is parsed by Subloom.
