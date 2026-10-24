## 2024-06-21 - Added Contextual Tooltips for Disabled States
**Learning:** When complex multi-step interactions exist (like needing to set up an API key, select a model, and enter a prompt before racing), users can get stuck if the primary action button is simply disabled. Providing contextual `title` text that explains *why* the button is disabled (e.g., "Enter a prompt to start" vs "No racers selected") significantly improves the discoverability of the required setup steps.
**Action:** Always verify if a disabled button can benefit from contextual help text explaining the missing prerequisite, especially in complex configuration flows.

## 2026-10-14 - Keyboard Focus Ring States on Custom Card and Toggle Buttons
**Learning:** Custom styled card buttons (such as mode selectors) and toggle switches often override or lack default browser outline styles. Adding `focus-visible:ring-2` with `focus-visible:outline-hidden` ensures keyboard users have distinct, visible focus indicators without affecting pointer/click visual states.
**Action:** Always ensure custom button cards and switches include explicit `focus-visible:ring-2` focus states matching the component color theme.
