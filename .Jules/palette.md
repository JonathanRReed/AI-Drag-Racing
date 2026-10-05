## 2024-06-21 - Added Contextual Tooltips for Disabled States
**Learning:** When complex multi-step interactions exist (like needing to set up an API key, select a model, and enter a prompt before racing), users can get stuck if the primary action button is simply disabled. Providing contextual `title` text that explains *why* the button is disabled (e.g., "Enter a prompt to start" vs "No racers selected") significantly improves the discoverability of the required setup steps.
**Action:** Always verify if a disabled button can benefit from contextual help text explaining the missing prerequisite, especially in complex configuration flows.

## 2025-05-18 - API Key Password Input Visibility Toggle Pattern
**Learning:** When users input sensitive API keys in dialog modals, using `type="password"` prevents accidental shoulder surfing, but can lead to silent typos or copy-paste whitespace errors. Adding an inline visibility toggle with explicit `aria-label` ("Show API key" / "Hide API key"), `font-mono` typography, and full keyboard focus styling dramatically improves key verification while maintaining accessibility.
**Action:** Ensure secret/API key input fields include an accessible, toggleable password visibility button and monospaced font formatting.
