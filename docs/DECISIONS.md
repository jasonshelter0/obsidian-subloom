# Decisions

- Forecasts are calculated from immutable anchors and never written as rolling properties.
- The currently due cycle remains visible until its charge date has passed; old unpaid cycles are represented by overdue verification attention.
- `paid_through` uses an exclusive local-date boundary.
- A regular monthly/yearly payment defaults to coverage until the following scheduled charge; the confirmation dialog exposes that date for correction.
- The dashboard groups expected amounts by currency; no implicit foreign exchange conversion.
- Notifications work only while Obsidian is running.
