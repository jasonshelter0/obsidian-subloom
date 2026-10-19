# Test plan

Unit tests cover local calendar parsing, month-end clamping, leap years, intervals, due-day state, elapsed cycles, and verification. The sample vault contains shared payment methods, nested tags, and a missing link. Manual Obsidian checks: open the dashboard, rename a payment method note, inspect light/dark and narrow widths, record a payment after confirmation, snooze a notice, reopen the vault, and check that no duplicate notice appears. Test only against the included sample notes, never a real financial vault.
