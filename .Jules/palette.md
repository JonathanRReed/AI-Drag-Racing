## 2024-06-21 - Added Contextual Tooltips for Disabled States
**Learning:** When complex multi-step interactions exist (like needing to set up an API key, select a model, and enter a prompt before racing), users can get stuck if the primary action button is simply disabled. Providing contextual `title` text that explains *why* the button is disabled (e.g., "Enter a prompt to start" vs "No racers selected") significantly improves the discoverability of the required setup steps.
**Action:** Always verify if a disabled button can benefit from contextual help text explaining the missing prerequisite, especially in complex configuration flows.

## 2025-05-18 - Visibility Toggle for Sensitive Modal Inputs
**Learning:** For tab-scoped API key and password inputs in modal dialogs, users frequently paste keys that may contain unintended spaces or truncation. Providing a clear show/hide toggle with dynamic ARIA labels (`Show API key` / `Hide API key`), `type="button"`, and keyboard focus rings allows quick verification without sacrificing tab privacy or keyboard navigation.
**Action:** Include a accessible visibility toggle on password/token modal inputs while keeping explicit `type="button"` and `aria-hidden` SVGs.
