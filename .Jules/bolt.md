## 2025-05-18 - Guard DOM Attribute Writes in 60Hz SVG Animation Loops
**Learning:** In imperative SVG update loops driven by `requestAnimationFrame`, calling `setAttribute` or modifying `style` unconditionally on every frame forces unnecessary DOM mutations and triggers browser style/path re-parsing even when values have not changed. Guarding DOM mutations by checking the existing attribute value beforehand (`if (el.getAttribute(attr) !== val)`) eliminates redundant DOM updates during smooth 60fps streaming animations.
**Action:** Always check current DOM attribute/style values before executing `setAttribute` or style assignments inside continuous high-frequency update loops like `requestAnimationFrame`.

## 2025-05-18 - Reuse Cached Intl.Segmenter Instances in Keystroke Handlers
**Learning:** Constructing `new Intl.Segmenter(...)` inside high-frequency input handlers or text measurement helpers initializes native ICU locale data and allocates objects on every keystroke. Reusing a single cached segmenter instance eliminates this instantiation overhead and reduces garbage collection pressure during live text input.
**Action:** Cache instances of expensive native internationalization objects like `Intl.Segmenter`, `Intl.NumberFormat`, or `Intl.DateTimeFormat` when invoked repeatedly in render paths or event handlers.
