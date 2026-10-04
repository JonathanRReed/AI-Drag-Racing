## 2024-06-21 - Added Contextual Tooltips for Disabled States
**Learning:** When complex multi-step interactions exist (like needing to set up an API key, select a model, and enter a prompt before racing), users can get stuck if the primary action button is simply disabled. Providing contextual `title` text that explains *why* the button is disabled (e.g., "Enter a prompt to start" vs "No racers selected") significantly improves the discoverability of the required setup steps.
**Action:** Always verify if a disabled button can benefit from contextual help text explaining the missing prerequisite, especially in complex configuration flows.

## 2026-04-21 - Show/Hide Password Visibility Toggle for Tab-Scoped API Keys
**Learning:** Masked API key inputs without a show/hide toggle prevent users from verifying long opaque strings (like `sk-proj-...` or `gsk_...`) before submitting. Providing an inline eye toggle button with clear ARIA labels (`Show API key` / `Hide API key`) and keyboard focus rings allows quick verification and prevents subtle key copy-paste errors without sacrificing privacy.
**Action:** Include password visibility toggle controls on sensitive credential inputs in modal dialogs.
