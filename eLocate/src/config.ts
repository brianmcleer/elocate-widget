/**
  Enhanced Locate widget for ArcGIS Experience Builder.
  Original widget Copyright 2022 Robert Scheitlin, Apache License 2.0.
  Modified 2026 by the City of Grand Junction GIS Division: showHelp and telemetry options,
  and the coordinate format model (CoordFormat, resultFormats). See CHANGES.md.
*/
import Point from "esri/geometry/Point";
import Graphic from "esri/Graphic";
import { ImmutableObject } from "seamless-immutable";

export enum locateType{
  address = 'address',
  coordinate = 'coordinate',
  reverse = 'reverse'
}

export interface listItem {
  id: string,
  title: string,
  content: string,
  type: locateType,
  graphic?: Graphic,
  point?: Point,
  selected?: boolean
}

export interface Config {
  autoClosePopup?: number,
  keepinspectoractive: boolean,
  initialView: locateType,
  zoomscale: number,
  forcescale: boolean,
  /** Pre-1.21: the one WKID and precision for popup coordinates. See resultFormats. */
  coordinateWKID?: number,
  coordinatePrecision?: number,
  limitsearchtoviewextentbydefault: boolean,
  minscore?: number,
  /** Coordinates shown in result popups, one line per entry. Replaces coordinateWKID and
   *  coordinatePrecision, which are still read when this is missing (older apps). */
  resultFormats?: ResultFormat[],
  locator: {
    url: string,
    singleLineFieldName: string,
    countryCode: string
  }
  pointunits: pointunit[],
  disabledtabs?: string[],
  /** Show the question-mark button that opens the help guide. Undefined means on,
   *  so apps configured before this setting existed keep their help button. */
  showHelp?: boolean,
  /** Anonymous usage telemetry (src/shared/beacon.ts). Undefined means on; false turns it off. */
  telemetry?: boolean
}

/**
 * Coordinate formats, the same set Esri's arcgis-coordinate-conversion component offers.
 * xy: two numbers in a coordinate system (a WKID, or the map's own when wkid is empty).
 * dd, ddm, dms: latitude and longitude. mgrs, usng, utm: grid references.
 */
export type CoordFormat = 'xy' | 'dd' | 'ddm' | 'dms' | 'mgrs' | 'usng' | 'utm'

/** One datum transformation step, as projectOperator's GeographicTransformation takes it. */
export interface TransformStep { wkid: number, isInverse?: boolean }

/**
 * Datum transformation for an xy unit: 'auto' picks the best equation-based transformation
 * for the area (geographicTransformationUtils.getTransformation), 'none' applies none, and a
 * steps list applies that exact transformation (defined from the unit's WKID to WGS84).
 */
export type TransformSetting = 'auto' | 'none' | { steps: TransformStep[] }

// eslint-disable-next-line  @typescript-eslint/naming-convention
export interface pointunit {
  name: string,
  /** Present on every unit saved by 1.21 and later. Older units are read through normalizeUnit(). */
  format?: CoordFormat,
  /** xy only. A WKID, or a WKT string for a system with no WKID. Neither means the map's own. */
  wkid?: number,
  wkt?: string,
  /** xy only. Blank uses Longitude/Latitude or X/Y by the kind of coordinate system. */
  xlabel?: string,
  ylabel?: string,
  /** Optional fixed example. Blank shows the map center in this format. */
  example?: string,
  /** xy only. */
  transformation?: TransformSetting,

  /* Pre-1.21 fields (Robert's 1.9 schema), read by normalizeUnit() and never written again. */
  wgs84option?: string,
  tfwkid?: number,
  transformDirection?: string
}

/** One line of coordinates in a result popup and the Results list. */
export interface ResultFormat {
  format: CoordFormat,
  /** xy only. A WKID or a WKT string; neither means the map's own coordinate system. */
  wkid?: number,
  wkt?: string,
  /** dd, ddm, dms and xy. */
  decimals?: number,
  /** Optional label; blank uses the format's name. */
  label?: string
}

export type IMConfig = ImmutableObject<Config>;
