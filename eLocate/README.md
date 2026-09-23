# Enhanced Locate (eLocate)

An ArcGIS Experience Builder custom widget that finds a place three ways: by address, by
coordinates in any coordinate system you configure, or by clicking the map to get the address
at that spot.

**Enhanced Locate was written by Robert Scheitlin**, first for Web AppBuilder and then for
Experience Builder (version 1.9, 2022). This is his widget, brought up to date for Experience
Builder 1.21 by the City of Grand Junction GIS Division and shared under the same Apache 2.0
license. Robert's original post:
https://community.esri.com/en/discussion/1141368/enhanced-locate-widget-1-9-8-4-22

## Features

- **Address**: search a geocode service (the Esri World Geocoding Service by default, or your
  own locator), optionally limited to the current map extent and to one or more countries.
  Every match above the minimum score is marked on the map and listed with its score.
- **Coordinates**: go to coordinates in the same formats as Esri's Coordinate Conversion
  component: decimal degrees, degrees decimal minutes, degrees minutes seconds, MGRS, USNG, UTM,
  and X and Y in any coordinate system (the map's own, any WKID the projection engine knows, or
  WKT for a local or custom system). Nothing is regional or built in, so it fits any
  organization. X and Y get two boxes; every other format gets one box that takes what people
  paste. The example under the box is the middle of the map in that format and follows the map
  as it moves, so it always belongs to the area the user is looking at. Reading, writing and
  projecting use the Maps SDK in the browser (`coordinateFormatter`, `projectOperator`,
  `geographicTransformationUtils`), with the datum transformation picked automatically or by the
  app author.
- **Inspector**: click the map to get the nearest address (reverse geocode). The tool can turn
  itself off after one click or stay on.
- **Results**: a list of everything found, with zoom on click and remove per result. Popups
  show the location in every format the app author picks, one line each (for example decimal
  degrees, MGRS and the organization's own X and Y system).
- **Popup auto close** after a set number of seconds, paused while the mouse is over the popup.
- Any tab can be turned off, and the builder picks which tab opens first.
- **Help guide**: a question button at the top right opens a short, searchable, plain-language
  guide that only describes the tabs and options this app has turned on. A one-time hint points
  new users at it. A **Show help guide** setting turns both off.
- Keyboard and screen reader support (labelled inputs, a keyboard-operable results list, live
  status messages).

## Requirements

- ArcGIS Experience Builder **Developer Edition 1.21** (React 19, ArcGIS Maps SDK 5.x).
- A Map widget in the same app.
- Experience Builder 1.18 and earlier (React 18) are not supported. For Experience Builder 1.9
  to 1.13, use Robert's original 1.9 release from his post.

## Install

1. Download `eLocate.zip` from the latest GitHub release and extract it into:

   ```text
   client\your-extensions\widgets\
   ```

   The result must be `client\your-extensions\widgets\eLocate\manifest.json`. The
   `manifest.json` sits directly inside the `eLocate` folder, never nested a second level deep
   (for example `widgets\eLocate\eLocate`). Nesting is the usual cause of a widget not
   registering.

   The folder name stays `eLocate`, the same as Robert's release, so apps built with the 1.9
   widget pick this one up without being rebuilt.

2. The widget has no third-party dependencies. From the `client` folder, run the install you
   normally run (`pnpm install` on 1.21), then restart the client (`pnpm start`).
3. In the builder, add **Enhanced Locate** to a page, pick the Map widget in its settings, and
   set up the geocode service and coordinate units.

### The release zip and the editor shims

The zip is the widget only. The Visual Studio type shims in the repo
(`eLocate/src/exb-editor-shims.d.ts`, `eLocate/src/vendor-shims.d.ts` and
`eLocate/src/runtime/esri.d.ts`) are left out on purpose: their ambient `declare module` blocks
are not file-scoped and would rewrite the react, jimu and esri types for every other widget in
your `your-extensions` folder.

If you clone the repository instead of using the zip, delete those three files before building;
nothing else depends on them.

## Settings

| Setting | What it does |
|---|---|
| Select a Map widget | The map the widget searches and marks. Required. |
| Geocode service URL | Any GeocodeServer with a single line address field. HTTPS only. |
| Country Code(s) | Limits address searches to these countries, for example `USA` or `USA,CAN`. Blank searches everywhere. |
| Coordinate formats | A table of the standard formats (DD, DDM, DMS, MGRS, USNG, UTM, map X and Y) with two checkboxes each: offered on the Coordinates tab, and shown in results. Decimal places for decimal degrees (DDM and DMS follow it) and for X and Y. An app still on the 1.9 units shows a note with a **Use the standard formats** button. |
| Coordinate systems for X and Y | Add any coordinate system by WKID, or by WKT for a local or custom system with no WKID. Nothing is regional or built in: the system is checked against the browser projection engine at sample points around the world and named from the Esri list or its WKT; pick the datum transformation (Automatic, None, or one from the list) and whether it shows in results. It is offered on the Coordinates tab with X and Y boxes. |
| Initial View | The tab that opens first. |
| Popup Auto Close (seconds) | Closes the result popup after this many seconds. Blank keeps it open. |
| Default Zoom Scale | The scale the map zooms to for a result. |
| Force scale | Always zoom to the Default Zoom Scale. Off, the map only zooms in when it is zoomed out past that scale. |
| Keep address inspector tool active | The Inspector stays on after each click. |
| Enable geocoder limit to views extent by default | Ticks the "Limit address search to maps extent" box when the widget opens (locators 10.1 and later). |
| Choose tab(s) to disable | Hide Address, Coordinates, Inspector or Results. |
| Show help guide | The question button and the first-run hint. On by default. |

Two config values have no control in the panel: `minscore` (default 40, the lowest address
match score kept) and `telemetry` (see below).

## Usage telemetry

This widget records anonymous usage counts and errors so the GIS Division can see which widgets
and versions are in use and which errors users hit. It records the app id and title, widget name
and version, the action name, a truncated error message, the site host name and browser family.
It never records usernames, coordinates, addresses, attribute values or URLs with query strings.
Where the data goes: on page load the widget asks the app's portal for a public item tagged
`exb-beacon-sink` and posts to that table. If your portal has no such item, nothing is sent
anywhere. To turn it off for an app, set `"telemetry": false` in the widget's config, or users can
enable Do Not Track in their browser. The shared module is `src/shared/beacon.ts`.

## Troubleshooting

### `eLocate is duplicated`

Experience Builder throws this at `pnpm start` when the same widget name is registered more than
once, so a second copy is present somewhere. Check in this order:

1. A nested folder: `widgets\eLocate\eLocate`. Move it so the manifest sits directly inside the
   widget folder.
2. A leftover folder from an earlier version, including Robert's 1.9 copy under another name or
   any `-copy` folder.
3. A stale compiled build in `client\dist\widgets`. Stop the client, delete only
   `dist\widgets\eLocate` (never the whole `dist` folder, which also holds the builder), then
   restart. This is the common cause after moving a widget between Experience Builder versions.

If removing one copy makes the widget disappear from the Entrypoint list entirely, the copy that
remains is nested too deep.

### The widget panel is blank or says it is not connected to a map

Pick a Map widget in the widget settings. If every tab is turned off under "Choose tab(s) to
disable", the widget says so; turn at least one of Address, Coordinates or Inspector back on.

### The Address tab is missing

The geocode service could not be read when the widget opened, or it has no single line address
field. Check the URL in the settings and that the service is reachable from the browser.

### Coordinates are wrong or missing

- A line reads "outside this coordinate system's area": the place is outside that system's zone,
  for example a place far outside a projected zone's area. Remove or replace that system
  under Coordinate systems for X and Y. (The 1.9 widget printed NaN here.)
- An X and Y result off by about a meter: a datum transformation is missing.
  Leave the unit on Automatic, or pick the transformation your organization uses.
- MGRS, USNG and UTM need WebAssembly in the browser. Without it only X and Y and latitude and
  longitude work.

## Developer notes

- `npx tsc -p .` in the widget folder type checks the widget on its own with the self-contained
  `tsconfig.json` and reports 0 errors (add `--ignoreDeprecations 6.0` on TypeScript 6). It
  checks types, not webpack resolution, so confirm the build with `pnpm start` afterwards.
- `tsconfig.json` keeps `"jsx": "react-jsx"` and `"jsxImportSource": "@emotion/react"` to match
  the Experience Builder client; ts-loader reads this file when webpack builds the widget.
- ArcGIS Maps SDK modules are imported through Experience Builder's `esri/*` alias, never
  `@arcgis/core/*`, and nothing under `src/setting/` or `src/unitUtils.ts` imports `esri/*`
  statically. The settings panel loads `esri/request` and the projection engine with
  `loadArcGISJSAPIModules` only when a service URL or a coordinate system needs checking.
- Coordinate code lives in `src/runtime/lib/coords.ts` (runtime) and `src/unitUtils.ts` (shared:
  the unit model, the 1.9 migration, and the settings table model).

## Attribution

Original Enhanced Locate widget Copyright 2022 Robert Scheitlin, licensed under the Apache
License, Version 2.0. Modifications Copyright 2026 City of Grand Junction, CO. See `LICENSE`,
`NOTICE` and `CHANGES.md`.
