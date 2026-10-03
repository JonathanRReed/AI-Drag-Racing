## 2024-06-21 - Added Contextual Tooltips for Disabled States
**Learning:** When complex multi-step interactions exist (like needing to set up an API key, select a model, and enter a prompt before racing), users can get stuck if the primary action button is simply disabled. Providing contextual `title` text that explains *why* the button is disabled (e.g., "Enter a prompt to start" vs "No racers selected") significantly improves the discoverability of the required setup steps.
**Action:** Always verify if a disabled button can benefit from contextual help text explaining the missing prerequisite, especially in complex configuration flows.

## 2025-05-15 - Interactive API Key Verification and Modal Accessibility
**Learning:** Masked sensitive inputs like API keys often lead to user error or hesitation when pasting secret strings. Providing a clear password visibility toggle alongside accessible dialog controls (`aria-describedby` and explicit close button) significantly improves user confidence and accessibility in modal entry forms.
**Action:** Always include a show/hide password toggle for API key inputs, and ensure modals contain explicit close buttons and `aria-describedby` links.
