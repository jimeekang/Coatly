# Design System Document: The Rugged Editorial

## 1. Overview & Creative North Star
**Creative North Star: "The Elevated Earth"**

This design system rejects the clinical, "blue-tinted" SaaS aesthetic in favor of a rugged, editorial experience tailored for the Australian landscape. It combines the utilitarian demands of a job site with the sophisticated polish of a high-end architectural firm. 

To move beyond "standard" UI, we employ **Organic Brutalism**. This means we use heavy typography and large touch targets (ruggedness) balanced against airy, expansive layouts and a sophisticated, warm palette (professionalism). We break the "template" look by using intentional asymmetryâ€”placing content off-center or overlapping elementsâ€”to create a sense of bespoke craftsmanship, much like a perfectly applied coat of premium paint.

---

## 2. Colors & Surface Philosophy
Our palette is rooted in the Australian outback and raw building materials. We avoid the common "safety blue" of SaaS to stand out as a premium tool.

### The Palette (Material Design Convention)
- **Primary (Terracotta):** `#9a442d` | **Container:** `#e07a5f`
- **Secondary (Charcoal):** `#5a5c79` | **Container:** `#dcddff`
- **Surface (Warm White):** `#fdfae7` | **Surface Variant:** `#e6e3d0`
- **Functional:** Error (`#ba1a1a`), Tertiary/Success (`#006b5b`)

### The "No-Line" Rule
**Explicit Instruction:** Do not use 1px solid borders to section content. Traditional "boxed" layouts feel cheap and cluttered. Instead, define boundaries through background shifts. A `surface-container-low` section sitting on a `surface` background provides all the separation a professional eye needs.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layersâ€”stacked sheets of fine paper or sanded timber.
- **Base Layer:** `surface` (#fdfae7)
- **Content Cards:** `surface-container-lowest` (#ffffff) for maximum pop.
- **Navigation/Sidebars:** `surface-container` (#f1eedb) to provide a grounded "recessed" feel.

### The "Glass & Gradient" Rule
For floating elements like "Add Job" buttons or high-priority modals, use **Glassmorphism**. Apply a semi-transparent `primary-container` with a `backdrop-filter: blur(12px)`. To provide "visual soul," use subtle linear gradients (e.g., `primary` to `primary-container`) on main CTAs rather than flat fills.

---

## 3. Typography: The Editorial Edge
We use a dual-font strategy to balance high-end branding with field-ready legibility.

*   **Display & Headlines (Manrope):** Our "Brand Voice." Manropeâ€™s geometric but warm curves feel architectural. Use `display-lg` (3.5rem) with tight letter-spacing for a bold, editorial look.
*   **Body & Labels (Inter):** Our "Workhorse." Inter is chosen for its exceptional x-height and readability in harsh Australian sunlight. 

**Hierarchy as Identity:** 
Large, asymmetrical headlines (`headline-lg`) should be paired with generous whitespace. This contrast conveys authority and organized calmâ€”essential for a business owner managing multiple job sites.

---

## 4. Elevation & Depth
We achieve depth through **Tonal Layering**, not structural lines.

*   **The Layering Principle:** Stack `surface-container` tiers. Place a `surface-container-lowest` card on a `surface-container-low` background to create a soft, natural lift.
*   **Ambient Shadows:** If an element must float (e.g., a bottom sheet), use a "Sun-Drenched Shadow": `color: on-surface` at 6% opacity, with a 32px blur and 8px offset. It should look like a soft shadow cast on a wall, not a digital drop-shadow.
*   **The "Ghost Border" Fallback:** If accessibility requires a stroke, use `outline-variant` at **20% opacity**. Never use 100% opaque borders.
*   **Glassmorphism:** Use for persistent overlays. It allows the rich terracotta and charcoal colors of the background to bleed through, making the app feel like one cohesive environment.

---

## 5. Components

### Buttons
*   **Primary:** Large (min 48px height), `rounded-md` (0.75rem), using a subtle gradient. Text is `label-md` in uppercase with slight tracking for a "rugged label" feel.
*   **Secondary:** Ghost style using the "Ghost Border" (20% opacity `outline-variant`).
*   **Touch Targets:** All interactive elements must maintain a **44px minimum** hit area to accommodate use by painters in the field.

### Input Fields
*   **Style:** Filled style using `surface-container-highest`. No bottom line.
*   **Focus:** Transition to a `primary` (Terracotta) "Ghost Border" at 40% opacity. 
*   **Context:** Use large `body-lg` text for input to ensure visibility in high-glare environments.

### Cards & Lists
*   **Forbidden:** Divider lines. 
*   **The Alternative:** Use vertical whitespace (Spacing Scale `6` or `8`) to separate list items. For complex data, use alternating tonal backgrounds (`surface` vs `surface-container-low`).

### Specialized Components
*   **Paint Swatch Chips:** Custom selection chips that utilize the `tertiary` (teal) and `primary` (terracotta) tokens to indicate color-matching status or paint types.
*   **Rugged Progress Bars:** Thicker (8px) bars with `rounded-full` corners, using `secondary-container` as the track and `primary` as the fill.

---

## 6. Doâ€™s and Donâ€™ts

### Do
*   **DO** use whitespace as a functional tool. Space = Clarity in the field.
*   **DO** use the Spacing Scale religiously (e.g., `3.5rem` for section margins) to maintain the editorial rhythm.
*   **DO** ensure high contrast ratios (minimum 4.5:1) for all text against backgrounds to combat sunlight glare.
*   **DO** overlap elements (e.g., a card partially hanging over a header color block) to create a custom, high-end feel.

### Donâ€™t
*   **DON'T** use pure black (#000000). Use `on-surface` (#1c1c11) for a softer, premium feel.
*   **DON'T** use default 1px dividers. If you feel the need for a line, increase the spacing or change the background tone instead.
*   **DON'T** use small, "finesse" icons. Use bold, thick-stroked icons that match the "Rugged" aesthetic.
*   **DON'T** crowd the screen. If a painter can't tap it with a thumb while walking, the layout is too dense.