## 2024-06-21 - Added Contextual Tooltips for Disabled States
**Learning:** When complex multi-step interactions exist (like needing to set up an API key, select a model, and enter a prompt before racing), users can get stuck if the primary action button is simply disabled. Providing contextual `title` text that explains *why* the button is disabled (e.g., "Enter a prompt to start" vs "No racers selected") significantly improves the discoverability of the required setup steps.
**Action:** Always verify if a disabled button can benefit from contextual help text explaining the missing prerequisite, especially in complex configuration flows.

## 2026-10-08 - Accessible Secret Input Modals
**Learning:** When inputting sensitive keys into modals, users benefit greatly from an explicit show/hide password toggle to verify key entry before submission. Linking the modal dialog to its explanation text using `aria-describedby` ensures screen reader users hear crucial privacy/tab-scope context immediately when the dialog opens.
**Action:** Always include `aria-describedby` pointing to dialog descriptive copy, an explicit close button with `aria-label="Close dialog"`, and a visibility toggle for masked secret inputs.
