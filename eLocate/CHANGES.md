# Changes

Record of modifications made to the original Enhanced Locate widget by Robert Scheitlin
(Apache-2.0), as required by section 4(b) of the license. The original is version 1.9 for
Experience Builder 1.9, posted on Esri Community on 7 February 2022 and updated 4 August 2022:
https://community.esri.com/en/discussion/1141368/enhanced-locate-widget-1-9-8-4-22

Everything the widget does (address search, coordinate locate in user defined units, the
Address Inspector, the results list, popup auto close, the coordinate unit editor) is Robert's
design and most of the code is still his.

## City of Grand Junction modifications

### 1.20.0 (2026, before this repository)

- Popup code moved to the lazy `view.popup` of Maps SDK 4.27 and later (`view.openPopup`,
  `view.closePopup`, a `reactiveUtils` watch on the popup container). This is what broke the
  widget from about Experience Builder 1.14 on. See `MIGRATION-1.20.md`.
- TypeScript fixes for stricter typings (namespace imports for `locator`, `webMercatorUtils`,
  `geometryService`; no `IHandle`; no `<font>` elements).
- Accessibility pass to WCAG 2.1 AA: labelled inputs, real buttons for Clear, the example and
  the remove x, keyboard support in the results list, live regions. See `WCAG-AUDIT.md`.

### 1.21.0 (September 2026)

Experience Builder 1.21 and Maps SDK 5.x:

- `exbVersion` 1.21.0, targeting Experience Builder Developer Edition 1.21.
- Popup opened and closed through guarded helpers, because `view.popup` stays undefined on
  5.x until a popup has opened.
- Projection runs in the browser with `projectOperator` first and falls back to the geometry
  service, which is still used when a unit names a datum transformation.
- The Inspector button uses a Calcite `pin` icon instead of the `esri-icon-map-pin` font class.
- The results list remove button uses `jimu-icons` instead of the old `jimu-ui/lib/icons` path.
- Map cursor is set on this widget's own map (`view.container`), not on the first
  `.widget-map` element in the page.
- The tab row is the widget's own (buttons with the tab role and arrow key support) instead of
  jimu-ui Tabs, which cut the four labels to "Addre..." at normal widget widths.
- Settings panel theme reads are guarded so a builder theme without the legacy
  `colors.palette` shape cannot blank the panel.

Bug fixes:

- A coordinate precision of 0 reset itself to 2 each time the settings panel opened (reported by
  David Das on the original thread).
- "No Results Found" never showed, because the Results tab did not open (reported by Jacob
  Jackson on the original thread). The Results tab now opens for results, a running search or a
  message.
- The Results tab could not be opened by clicking it.
- After any settings change in the builder, the widget snapped back to the Initial View tab on
  every render.
- The open and close side effects ran on every render instead of only on an open or close.
- An address search where every candidate scored under the minimum left the progress bar
  running.
- A failed address search showed the Address Inspection failure message; it now has its own.
- Popup coordinates could be written before the projection finished, and a failed projection
  left the result hanging. Candidates are now built with `async`/`await` in one pass.
- Coordinates in a projected unit (state plane, UTM) were built with `longitude`/`latitude`,
  which leaves `x` and `y` empty outside WGS84 and Web Mercator. Every unit now uses `x`/`y`.
- Coordinates that cannot be read show a message instead of doing nothing. Degrees, minutes
  and seconds input accepts a plain number too.
- The Inspector drawing layer used the id `DrawGL`, which belongs to the Advanced Draw widget
  and clobbered its layer. Both layers now carry this widget's id, so two copies in one app do
  not share or delete each other's marks.
- A results layer left on the map by an unmounted copy of the widget is adopted on remount
  instead of being replaced by an empty one.
- Settings: turning a tab off now moves Initial View to a tab that is still on and saves it.
- Settings: an empty zoom scale, popup WKID or auto close box no longer writes `NaN` into the
  config.
- Results list: missing React keys, a color check that read the wrong variable, and a crash on
  a content line without a value.
- Coordinate unit editor: the WGS84 format choices hide again when the WKID changes away from
  4326.
- Default config: `initialView` was `COORDINATES`, which is not a valid value, so no tab was
  selected on first load; one unit had its X label under an empty key. Popup coordinates now
  default to WGS84 (4326) instead of Alabama State Plane.

Coordinate formats (modernized on the ArcGIS Maps SDK):

- Units are now one of the formats Esri's Coordinate Conversion component uses: X and Y in a WKID,
  decimal degrees, degrees decimal minutes, degrees minutes seconds, MGRS, USNG and UTM. MGRS,
  USNG and UTM are new.
- Input is read with `coordinateFormatter` (with a plain reader as the fallback), so people can
  paste coordinates the way they have them. X and Y keep two boxes; the other formats use one.
- The example under the boxes is the map center in the unit's format unless the builder sets one,
  and it follows the map: it refreshes each time the map stops moving while the tab is open.
- Projection uses `projectOperator` with `geographicTransformationUtils`, so datum
  transformations are picked automatically for the map area. The builder can pick None or one
  specific transformation from the list the projection engine offers, instead of typing a
  transform WKID and direction.
- Settings rebuilt: one table of the standard formats with a Coordinates tab column and a
  Results column, two decimal settings, and a card per custom X and Y system (WKID checked
  against the projection engine and the bundled list, named, datum transformation, show in
  results). Robert's side panel with drag-to-reorder units is gone; the standard formats always
  appear in the same order, then the custom systems. Apps still on 1.9 units get a note and a
  **Use the standard formats** button.
- Address results on a map in UTM, state plane or any system other than WGS84 landed at the North
  Pole: the locator returns DisplayX/DisplayY in the map's system, and the 1.9 code always read
  them as degrees. They are now read in the location's own system.
- A place outside a coordinate system's area (for example far outside a projected zone)
  now reads "outside this coordinate system's area" instead of "NaN, 0.000000".
- Results show every format the builder picks, one line each, replacing the single popup WKID
  and precision.
- Migration: units and popup settings saved by the 1.9 widget are read as the matching format
  (`wgs84option` dd, dms, dm/ddm, map; `tfwkid` and `transformDirection` become a one-step
  transformation) and are written in the new shape the first time they are edited.
- The hand-written DMS parser and the default Alabama example units were replaced; the new
  defaults are global: DD, DDM, DMS, MGRS, UTM and the map's own X and Y on the Coordinates tab,
  DD and MGRS in results. USNG and any organization's own systems are one click away.
- Coordinate systems are never regional or built in: any WKID the projection engine knows, or
  WKT for a local or custom system. The settings check runs at sample points around the world.

Additions:

- In-widget help guide (Help button at the top right, searchable guide, first-run hint), on
  the shared pattern of the GIS Division's widget family. A **Show help guide** setting turns
  it off.
- Clear messages when no map is connected or every tab is turned off, instead of a spinner or
  an empty panel.
- Anonymous usage and error telemetry through the shared `src/shared/beacon.ts` module. It sends
  nothing unless the app's portal publishes its own `exb-beacon-sink` item; `"telemetry": false`
  in the config turns it off.
- Packaging: `package.json`, `LICENSE`, `NOTICE`, this file, `CHANGELOG.md`, `.gitignore`,
  `.npmignore`, and the Visual Studio `tsconfig.json` with editor shims (left out of the release
  zip).
