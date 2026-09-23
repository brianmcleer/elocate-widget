# elocate-widget

[![License](https://img.shields.io/github/license/brianmcleer/elocate-widget)](LICENSE) [![Release](https://img.shields.io/github/v/release/brianmcleer/elocate-widget?display_name=tag)](https://github.com/brianmcleer/elocate-widget/releases) [![Issues](https://img.shields.io/github/issues/brianmcleer/elocate-widget)](https://github.com/brianmcleer/elocate-widget/issues)

GitHub home of the **Enhanced Locate (eLocate)** custom widget for ArcGIS Experience Builder
Developer Edition 1.21.

The widget finds a place by address, by coordinates in any configured coordinate system, or by
clicking the map to get the address at that spot, and lists the results.

**Enhanced Locate is Robert Scheitlin's widget.** He wrote it for Web AppBuilder, ported it to
Experience Builder, and shared version 1.9 on Esri Community in 2022. It stopped working around
Experience Builder 1.14, and people kept asking on his thread for a version that runs on the
current release. The City of Grand Junction GIS Division updated it for Experience Builder 1.21
(ArcGIS Maps SDK 5.x), fixed the bugs reported on that thread, and publishes it here under the
same Apache 2.0 license with full credit to Robert. See [`eLocate/CHANGES.md`](eLocate/CHANGES.md)
for exactly what changed.

- Robert's original post: https://community.esri.com/en/discussion/1141368/enhanced-locate-widget-1-9-8-4-22
- Esri Community post for this version: https://community.esri.com/ (link added once the post is up)

For features, install steps, settings and troubleshooting, see
[`eLocate/README.md`](eLocate/README.md).

## Download

Grab `eLocate.zip` from the [Releases](https://github.com/brianmcleer/elocate-widget/releases)
page, or clone this repository and use the `eLocate/` subfolder. The same zip is attached to the
Esri Community post.

### The release zip and the editor shims

The zip is the widget only. The Visual Studio type shims in the repo
(`eLocate/src/exb-editor-shims.d.ts`, `eLocate/src/vendor-shims.d.ts`,
`eLocate/src/runtime/esri.d.ts`) are left out on purpose: their ambient `declare module` blocks
are not file-scoped and would rewrite the react, jimu and esri types for every other widget in
your `your-extensions` folder.

If you clone the repository instead of using the zip, delete those three files before building;
nothing else depends on them.

## Install (downstream users)

1. Extract the zip so the result is `client/your-extensions/widgets/eLocate/manifest.json`. The
   manifest sits directly inside the `eLocate` folder, not nested a second level deep.
2. From the `client` folder, run your usual install (`pnpm install` on 1.21) and restart the
   client (`pnpm start`). The widget has no third-party dependencies.
3. Add **Enhanced Locate** to a page that has a Map widget and pick the map in its settings.

The folder and widget name stay `eLocate`, the same as Robert's release, so apps built with his
1.9 widget pick this version up without being rebuilt.

## Repository layout

```
elocate-widget/
├── README.md          <- this file (GitHub landing page)
├── LICENSE            <- Apache-2.0 (Robert Scheitlin, with City of Grand Junction portions)
├── .gitignore
├── publish.ps1        <- sync from Experience Builder, push, cut release
└── eLocate/           <- the widget; drop this folder into your-extensions/widgets
    ├── package.json
    ├── manifest.json
    ├── config.json
    ├── icon.svg
    ├── README.md      <- widget-level install and usage docs
    ├── CHANGES.md     <- every modification to Robert's original
    ├── CHANGELOG.md
    ├── LICENSE
    ├── NOTICE
    ├── tsconfig.json  <- Visual Studio type check only
    └── src/ ...
```

## Publishing (maintainer)

From a terminal opened in this folder (PowerShell, regular):

```
powershell -ExecutionPolicy Bypass -File .\publish.ps1 -Release v1.21.0
```

The first run initializes git, creates the public GitHub repo with `gh`, pushes, and cuts the
release. Later runs sync the widget from `C:\arcgis-experience-builder-1.21\client\your-extensions\widgets\eLocate`
and push; add `-Release vX.Y.Z` for a new downloadable version. The tag must match the version in
`manifest.json` and `package.json`, which are bumped together in the Experience Builder folder.

## License

Apache-2.0. Original widget Copyright 2022 Robert Scheitlin. Modifications Copyright 2026 City of
Grand Junction, CO. See [LICENSE](LICENSE) and [`eLocate/NOTICE`](eLocate/NOTICE).
