# eLocate: WCAG 2.1 AA accessibility audit and remediation

> Historical record of the 1.20 migration and accessibility pass that came before the 1.21.0
> standardization. Kept for reference; `CHANGES.md` is the current list of modifications to
> Robert Scheitlin's original widget.

Scope: the runtime widget (`src/runtime/`), which is what end users interact
with. The builder settings panel (`src/setting/`) is noted separately at the end.

## Issues found and fixed

### 1. Form inputs had no programmatic labels (WCAG 1.3.1, 4.1.2)
- Address input, coordinate X/Y inputs, and the units `Select` had visible text
  but no `for`/`id` association, so screen readers announced them as unlabeled.
- Fix: each field now has an `id`, the visible `Label` uses matching `for=`, and
  the control carries an `aria-label` fallback.

### 2. "Clear" was a link that navigated (WCAG 2.1.1, 2.4.4, 4.1.2)
- `<a href="#" onClick=...>` is not a real control: it pushes a history entry
  and is announced as a link, not a button.
- Fix: replaced all three "Clear" anchors with `<Button type='tertiary'>`.
  They are now keyboard-operable and correctly announced as buttons. The
  show/hide is done with conditional rendering rather than `display:none`.

### 3. "Example" coordinates were a clickable `<label>` (WCAG 2.1.1)
- Could be clicked with a mouse but not reached or activated by keyboard.
- Fix: converted to `<Button type='link'>` with an `aria-label` describing the
  action and the example value.

### 4. Result list rows and the remove "X" were `<div onClick>` (WCAG 2.1.1, 4.1.2)
- Not focusable, not keyboard-operable, no role, no accessible name. This was
  the most significant barrier.
- Fix (in `components/list.tsx`):
  - The container is `role="list"`; each entry is `role="listitem"`.
  - The clickable record area is `role="button"`, `tabIndex={0}`, with an
    `aria-label` summarizing the record (title + de-tagged content), an
    `aria-current` when selected, and an `onKeyDown` handler that activates on
    Enter and Space.
  - The remove control is now a real `<button type="button">` with an
    `aria-label` ("Remove Result: <title>").
  - `onRecordClick` now calls `forceUpdate()` so the selected state (and thus
    `aria-current` / styling) is reflected immediately.

### 5. Status changes were not announced (WCAG 4.1.3)
- The results-found message is written via `innerHTML` to a plain `<div>`, and
  the progress bar had no role.
- Fix: the message `<div>` is `role="status" aria-live="polite"`; the busy
  spinner wrapper is `role="status" aria-live="polite"` with an
  `aria-label="Loading"`; the progress bar is `role="progressbar"` with an
  `aria-label`/`aria-valuetext` of "Locating, please wait".

### 6. Icon-only reverse-geocode button (WCAG 1.1.1, 4.1.2)
- Relied on `title` only and gave no pressed state.
- Fix: added `aria-label` and `aria-pressed={revBtnActive}` so the toggle state
  is exposed.

### 7. Visible keyboard focus (WCAG 2.4.7)
- The old rows had `outline:none` patterns and divs can't show focus.
- Fix: added `:focus-visible` outlines (2px, theme primary color) to the record
  button and the remove button in `lib/style.ts`.

### 8. Tab labels truncated (WCAG 1.4.4 / usability)
- `Tabs fill={true}` forced equal widths and clipped labels ("Coordinat…").
- Fix: switched to `scrollable` (no forced fill) plus CSS so `.nav-link` does
  not clip; tabs now size to content and scroll if needed. Also added an
  `aria-label` on the `Tabs` group.

### 9. New i18n strings
- Added `loading` and `locating` to `src/runtime/translations/default.ts` so the
  status/aria text is translatable. Translate these in any locale files you add.

## Known limitations / recommended manual checks
- **Color contrast (WCAG 1.4.3):** the list row background states
  (`#ebebeb`, `#d9dde0`, `#e3eefa`) and the hardcoded link/border colors should
  be verified against your deployed theme; they pass on white but if you change
  the widget background, recheck text/background ratios (target 4.5:1 for text,
  3:1 for UI components and focus outlines).
- **Popup content:** popup HTML comes from the geocode service / config; if you
  put color in `<font color>` tags, verify contrast yourself.
- **Settings panel (`src/setting/`):** the builder-side config UI was not part of
  this remediation pass. It relies on jimu's `SettingRow label` pattern (visible
  labels) and jimu-icon buttons; if you need the builder UI itself to be AA, the
  icon-only "delete coordinate unit" button and the geocode URL `TextArea` should
  get explicit `aria-label`/`for` associations. Tell me if you want that pass.
- **Testing:** automated checks (axe DevTools / Lighthouse) plus a manual
  keyboard-only pass and a screen-reader pass (NVDA or VoiceOver) are recommended
  before sign-off. Verify tab order: tabs → field(s) → Locate → result list rows
  → remove buttons.
