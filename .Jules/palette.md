## 2025-05-20 - Visual Keyboard Shortcut Hints for Input Focus
**Learning:** Highlighting existing global keyboard shortcuts (like `⌘L` or `Ctrl+L` for prompt focus) directly within input field labels using visual `<kbd>` elements with `aria-label` attributes improves discoverability for power users without creating visual clutter or accessibility issues for screen readers.
**Action:** When components listen for global key shortcuts, pair the event handler with a subtle `<kbd>` badge in the associated field label.

## 2024-06-21 - Added Contextual Tooltips for Disabled States
**Learning:** When complex multi-step interactions exist (like needing to set up an API key, select a model, and enter a prompt before racing), users can get stuck if the primary action button is simply disabled. Providing contextual `title` text that explains *why* the button is disabled (e.g., "Enter a prompt to start" vs "No racers selected") significantly improves the discoverability of the required setup steps.
**Action:** Always verify if a disabled button can benefit from contextual help text explaining the missing prerequisite, especially in complex configuration flows.
