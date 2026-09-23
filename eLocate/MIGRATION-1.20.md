# eLocate: migration to Experience Builder 1.20

> Historical record of the 1.20 migration and accessibility pass that came before the 1.21.0
> standardization. Kept for reference; `CHANGES.md` is the current list of modifications to
> Robert Scheitlin's original widget.

This widget was originally built for ExB 1.9 and stopped working around ExB 1.14.
The following changes were made to bring it to 1.20 standards.

## Root cause of the break (ExB ~1.14 / JSAPI 4.27+)

The ArcGIS Maps SDK changed how the view popup works:

- `view.popup` is now **lazily created**: it is `null` until a popup is first
  opened (or `popupEnabled`/`openPopup()` triggers creation).
- The popup's `domNode` property was **removed** from the API.
- `view.popup.open()` / `view.popup.close()` were deprecated in favor of
  `view.openPopup()` / `view.closePopup()`.

The old code dereferenced `view.popup['domNode']` inside `componentDidUpdate`,
which runs on every render. Because `view.popup` is null at that point, this
threw and took the whole widget down.

## Changes

### manifest.json
- `version` and `exbVersion` bumped from `1.9.0` to `1.20.0`.

### src/runtime/widget.tsx
- Added `import * as reactiveUtils from "esri/core/reactiveUtils"`.
- Replaced every `view.popup.close()` with `view.closePopup()` and every
  `view.popup.open(...)` with `view.openPopup(...)` (8 call sites).
- Removed the direct `view.popup['domNode']` event-listener wiring.
- Added popup lifecycle helpers that are safe with the lazy popup:
  - `setupPopupWatch()`: watches `view.popup?.container` via `reactiveUtils`
    and attaches the auto-close mouseover/mouseout handlers once the popup
    container exists. Called when the map view finishes loading and when the
    widget transitions to the Opened state.
  - `attachPopupListeners()` / `teardownPopupListeners()`: attach/detach the
    handlers on the current popup container, guarding against duplicates.
  - `componentWillUnmount()`: cleans up the popup watch, listeners, and the
    reverse-geocode click handler.
- Type fixes for stricter typings in newer ExB:
  - Removed the unused `geomService: GeometryService` field. `GeometryService`
    is now a namespace/module (function-style `geometryService.project(url,
    params)`), not a constructable class, so using it as a type was invalid.
  - Changed `serviceWKID: null` to `serviceWKID: number` (it is assigned the
    service's spatial-reference WKID).

## Verified still valid in 1.20 (no change needed)
- `geometryService.project(url, params)` and `esriConfig.geometryServiceUrl`.
- `esri/rest/locator` `addressToLocations` / `locationToAddress`.
- `esri/rest/support/AddressCandidate`, `ProjectParameters`, `SpatialReference`,
  `webMercatorUtils`, `PictureMarkerSymbol`, `SimpleMarkerSymbol`.
- jimu-ui `Tabs` / `Tab` (`value` + `onChange` + tab `id`/`title`).

## Not build-verified
These are source-level edits. They were not compiled with `tsc`/webpack in this
environment because the ExB SDK is not installable here. Before deploying:
1. Drop the `eLocate` folder into `client/your-extensions/widgets/`.
2. Run `npm ci` then `npm start` in the ExB 1.20 dev edition `client` folder.
3. Confirm there are no TypeScript errors and test address geocode, coordinate
   locate, reverse geocode, the result list, and popup auto-close.

## Round 2: TypeScript compile errors fixed (against ExB 1.20 / @arcgis/core)

After a first compile in the 1.20 dev edition, these strict-typing errors were
resolved:

- **TS1192 (no default export):** `locator`, `webMercatorUtils`, and
  `geometryService` are namespace modules, not classes. Changed to
  `import * as locator from "esri/rest/locator"`,
  `import * as webMercatorUtils from "esri/geometry/support/webMercatorUtils"`,
  `import * as GeometryService from "esri/rest/geometryService"`.
- **TS2709 (config.ts, cannot use namespace as a type):** `Point` and `Graphic`
  are default-exported classes. Changed `import * as Point` / `import * as
  Graphic` back to default imports so they work as types in the interfaces.
- **TS2304 (Cannot find name 'IHandle'):** the old global `IHandle` ambient type
  is gone. `viewClickHandler` and `popupWatchHandle` are now typed
  `__esri.WatchHandle` (the global ambient namespace from @arcgis/core, which is
  what `view.on()` and `reactiveUtils.watch()` return).
- **TS2503 (Cannot find namespace 'JSX'):** `JSX.Element[]` annotations changed
  to `React.JSX.Element[]` in widget.tsx, list.tsx, and setting.tsx.
- **TS2339 ('font' not in JSX.IntrinsicElements):** the deprecated `<font>` JSX
  elements in list.tsx were replaced with `<span>` (identical styling, only
  style/id/font props were used). The `"<font color='..."` *string literals*
  used for parsing popup content HTML were left unchanged, as was the cleanup
  regex.
- **TS2339 ('Street'/'DisplayX'/'DisplayY' not on type 'Object'):**
  `AddressCandidate.attributes` is now loosely typed, so dotted access failed.
  Switched to bracket access: `attributes['Street']`, `attributes['DisplayX']`,
  `attributes['DisplayY']`.

Still recommend a clean `npm ci` + `npm start` and a functional test of all four
tabs before deploying.
