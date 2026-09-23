# Changelog

Newest first. For the full record of modifications to Robert Scheitlin's original Enhanced
Locate widget, see `CHANGES.md`.

## 1.21.0 (2026-09-23)

- First release from GitHub, for Experience Builder Developer Edition 1.21 (Maps SDK 5.x).
- Fixed: coordinate precision 0, "No Results Found" never showing, the Results tab not opening
  on click, the tab snapping back after a settings change, a stuck progress bar, projected
  coordinate units, the `DrawGL` layer clash with Advanced Draw. Full list in `CHANGES.md`.
- Changed: coordinates rebuilt on the Maps SDK (coordinateFormatter, projectOperator, automatic
  datum transformations). Adds MGRS, USNG and UTM; any coordinate system by WKID or WKT; one paste
  box for every format but X and Y; an example that follows the map center; several coordinate
  lines per result. Settings are one table of standard formats plus a card per custom X and Y
  system. Global defaults, nothing regional. 1.9 configs keep working and offer a one-click switch.
- Fixed: address results on a map in any system other than WGS84 (UTM, state plane) landing at
  the North Pole; "NaN" in the popup for a place outside a coordinate system's area.
- Changed: the widget's own tab row replaces jimu-ui Tabs, which cut the labels short.
- Added: in-widget help guide with a **Show help guide** setting; messages for no map and no
  tabs; anonymous usage telemetry (off unless the portal publishes an `exb-beacon-sink` table).
- Packaging: `package.json`, license files, Visual Studio `tsconfig.json` and editor shims. The
  shims stay in the GitHub repo and are left out of the release zip.

## 1.20.0 (2026)

- Updated for the lazy popup of Maps SDK 4.27 and later, TypeScript fixes, and an accessibility
  pass. See `MIGRATION-1.20.md` and `WCAG-AUDIT.md`.

## 1.9.0 (2022-08-04), Robert Scheitlin

- Updated for Experience Builder 1.9. Earlier history is on Robert's Esri Community post.
