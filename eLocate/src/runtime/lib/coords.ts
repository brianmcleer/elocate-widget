/**
  Coordinate parsing, formatting and projection for the Enhanced Locate widget.
  City of Grand Junction GIS Division, 2026. Original widget by Robert Scheitlin (Apache 2.0).

  Built on the ArcGIS Maps SDK the same way Esri's arcgis-coordinate-conversion component is:
  coordinateFormatter reads and writes DD, DDM, DMS, MGRS, USNG and UTM; projectOperator
  projects in the browser; geographicTransformationUtils picks the datum transformation. The
  geometry service is only the fallback for a browser where the projection engine cannot load.

  Runtime only. Never import this from src/setting (WIDGETHANDOFF 12.1).
*/
import { loadArcGISJSAPIModules } from 'jimu-arcgis'
import SpatialReference from 'esri/geometry/SpatialReference'
import Point from 'esri/geometry/Point'
import * as coordinateFormatter from 'esri/geometry/coordinateFormatter'
import * as projectOperator from 'esri/geometry/operators/projectOperator'
import * as geographicTransformationUtils from 'esri/geometry/operators/support/geographicTransformationUtils'
import * as webMercatorUtils from 'esri/geometry/support/webMercatorUtils'
import ProjectParameters from 'esri/rest/support/ProjectParameters'
import * as GeometryService from 'esri/rest/geometryService'
import esriConfig from 'esri/config'
import type { CoordFormat, pointunit, ResultFormat, TransformSetting, TransformStep } from '../../config'
import { clampDecimals, isGridFormat, isLatLonFormat } from '../../unitUtils'

const WGS84 = (): SpatialReference => new SpatialReference({ wkid: 4326 })

/**
 * The point cannot be expressed in that coordinate system, for example a place far outside a
 * projected zone's area: the projection engine returns NaN there. The
 * 1.9 widget printed "NaN" in the popup; now the line says the place is outside the area.
 */
export class OutOfAreaError extends Error {
  constructor (wkid?: number) { super(`outside the area of coordinate system ${wkid ?? ''}`); this.name = 'OutOfAreaError' }
}

/** A unit's or result format's coordinate system: its WKID, its WKT, or undefined for the map's own. */
export function srOf (o: { wkid?: number, wkt?: string } | undefined): SpatialReference | undefined {
  if (o?.wkid) return new SpatialReference({ wkid: o.wkid })
  if (o?.wkt) return new SpatialReference({ wkt: o.wkt })
  return undefined
}

const validPoint = (p: any): boolean => !!p && typeof p.x === 'number' && typeof p.y === 'number' && isFinite(p.x) && isFinite(p.y)

let loading: Promise<void> | null = null

/** Load the formatter, the projection engine and the transformation tables once per page. */
export function ready (): Promise<void> {
  if (!loading) {
    const tryLoad = async (mod: any): Promise<void> => {
      try {
        if (mod && typeof mod.isLoaded === 'function' && !mod.isLoaded() && typeof mod.load === 'function') await mod.load()
      } catch (e) {
        console.info('eLocate: a coordinate module did not load', e)
      }
    }
    loading = Promise.all([
      tryLoad(coordinateFormatter),
      tryLoad(projectOperator),
      tryLoad(geographicTransformationUtils)
    ]).then(() => undefined)
  }
  return loading
}

const formatterReady = (): boolean => {
  try {
    return typeof coordinateFormatter.isLoaded === 'function' && coordinateFormatter.isLoaded()
  } catch (e) { return false }
}

const sameSR = (a: any, b: any): boolean => {
  if (!a || !b) return false
  if (a.wkid && b.wkid && a.wkid === b.wkid) return true
  if (a.isWebMercator && b.isWebMercator) return true
  return typeof a.equals === 'function' && a.equals(b)
}

/** WGS84 and Web Mercator share a datum, so no transformation is ever needed between them. */
const wgsDatum = (sr: any): boolean => !!sr && (sr.isWGS84 || sr.isWebMercator || sr.wkid === 4326)

let gtClasses: Promise<{ GT: any, Step: any } | null> | null = null
const loadTransformationClasses = (): Promise<{ GT: any, Step: any } | null> => {
  if (!gtClasses) {
    // Loaded at use time rather than imported: a wrong static esri path would fail the whole widget.
    gtClasses = loadArcGISJSAPIModules([
      'esri/geometry/operators/support/GeographicTransformation',
      'esri/geometry/operators/support/GeographicTransformationStep'
    ]).then(([GT, Step]) => ({ GT, Step })).catch((e) => {
      console.info('eLocate: transformation classes did not load', e)
      return null
    })
  }
  return gtClasses
}

/**
 * The geographic transformation for one projection.
 * setting: the unit's transformation ('auto' by default). unitIsSource says which side of the
 * projection is the unit, because a configured transformation is stored as unit -> WGS84.
 */
async function transformationFor (inSR: any, outSR: any, setting: TransformSetting | undefined, unitIsSource: boolean, extent?: any): Promise<any> {
  if (setting === 'none') return undefined
  if (setting && typeof setting === 'object' && Array.isArray((setting as any).steps) && (setting as any).steps.length > 0) {
    // A stored transformation only fits a projection between the unit and a WGS84-datum map.
    const other = unitIsSource ? outSR : inSR
    if (wgsDatum(other)) {
      const cls = await loadTransformationClasses()
      if (cls) {
        let steps: TransformStep[] = (setting as any).steps
        if (!unitIsSource) steps = steps.slice().reverse().map(s => ({ wkid: s.wkid, isInverse: !s.isInverse }))
        try {
          return new cls.GT({ steps: steps.map(s => new cls.Step({ wkid: s.wkid, isInverse: !!s.isInverse })) })
        } catch (e) {
          console.info('eLocate: could not build the configured transformation, using automatic', e)
        }
      }
    }
  }
  try {
    if (typeof geographicTransformationUtils.isLoaded === 'function' && geographicTransformationUtils.isLoaded()) {
      return geographicTransformationUtils.getTransformation(inSR, outSR, extent) || undefined
    }
  } catch (e) { /* no transformation available for this pair */ }
  return undefined
}

/**
 * Project a point. Tries, in order: nothing to do, Web Mercator <-> WGS84 in place, the
 * browser projection engine with the right datum transformation, then the geometry service.
 */
export async function project (point: Point, outSR: SpatialReference, opts: { transformation?: TransformSetting, unitIsSource?: boolean, extent?: any, serviceWKID?: number } = {}): Promise<Point> {
  if (!point) return point
  if (!point.spatialReference && opts.serviceWKID) point.spatialReference = new SpatialReference({ wkid: opts.serviceWKID })
  const inSR: any = point.spatialReference
  if (sameSR(inSR, outSR)) return point
  // Degrees outside -180..180 / -90..90 are not a place. The engine would clamp them to a pole
  // and return a believable wrong answer, so stop here instead.
  if ((inSR?.isWGS84 || inSR?.wkid === 4326) && (Math.abs(point.x) > 180 || Math.abs(point.y) > 90)) {
    throw new OutOfAreaError(4326)
  }
  if (wgsDatum(inSR) && wgsDatum(outSR) && webMercatorUtils.canProject(point, outSR)) {
    const wm = webMercatorUtils.project(point, outSR) as Point
    if (validPoint(wm)) return wm
    throw new OutOfAreaError((outSR as any)?.wkid)
  }
  await ready()
  let engineRan = false
  try {
    if (typeof projectOperator.isLoaded === 'function' && projectOperator.isLoaded()) {
      const geographicTransformation = await transformationFor(inSR, outSR, opts.transformation, opts.unitIsSource !== false, opts.extent)
      const out = projectOperator.execute(point, outSR, geographicTransformation ? { geographicTransformation } : undefined) as Point
      engineRan = true
      if (validPoint(out)) return out
    }
  } catch (e) {
    console.info('eLocate: browser projection failed', e)
  }
  // The engine answered and the answer was not a number: the point is outside that system's
  // area. The geometry service runs the same engine, so asking it too would change nothing.
  if (engineRan) throw new OutOfAreaError((outSR as any)?.wkid)
  const url = (esriConfig as any)?.geometryServiceUrl
  if (!url) throw new Error('eLocate: the projection engine did not load and no geometry service is configured')
  const params = new ProjectParameters()
  params.geometries = [point]
  params.outSpatialReference = outSR
  const results = await GeometryService.project(url, params)
  if (!validPoint(results?.[0])) throw new OutOfAreaError((outSR as any)?.wkid)
  return results[0] as Point
}

// ── Reading what people type ─────────────────────────────────────────────────

/** "DD-MM-SS W", "DD MM SSW", "-DD.ddd" or "DD.dddW" style text to signed decimal degrees. */
export function parseDegrees (value: string): number {
  const s = (value || '').trim().toUpperCase()
  if (!s) return NaN
  const neg = /[WS]/.test(s) || /^-/.test(s)
  const nums = s.replace(/[NSEW°'"′″]/g, ' ').replace(/^-/, '').split(/[\s\-:]+/).filter(Boolean).map(Number)
  if (nums.length === 0 || nums.some(isNaN)) return NaN
  const deg = (nums[0] || 0) + (nums[1] || 0) / 60 + (nums[2] || 0) / 3600
  return neg ? -Math.abs(deg) : deg
}

/** Split "lat, lon" style text into two parts: on a comma or semicolon, else on the hemisphere letters, else on whitespace. */
function splitPair (text: string): [string, string] | null {
  const t = text.trim()
  if (/[,;]/.test(t)) {
    const parts = t.split(/[,;]/).map(p => p.trim()).filter(Boolean)
    return parts.length === 2 ? [parts[0], parts[1]] : null
  }
  const byLetter = t.match(/^(.*?\d.*?[NSEWnsew])\s*(.+)$/)
  if (byLetter && /\d/.test(byLetter[2])) return [byLetter[1].trim(), byLetter[2].trim()]
  const tokens = t.split(/\s+/)
  return tokens.length === 2 ? [tokens[0], tokens[1]] : null
}

/** Latitude and longitude text in any of DD, DDM or DMS to a WGS84 point. */
export function latLonFromText (text: string): Point | null {
  const raw = (text || '').trim()
  if (!raw) return null
  // Robert's examples used dashes between degrees, minutes and seconds ("85-50-1.45 W").
  let normalized = raw.replace(/(\d)-(\d)/g, '$1 $2')
  // The formatter expects latitude first; put an N/S part first when someone typed E/W first.
  const pair = splitPair(normalized)
  if (pair && /[EWew]/.test(pair[0]) && /[NSns]/.test(pair[1])) normalized = `${pair[1]} ${pair[0]}`
  if (formatterReady()) {
    try {
      const p = coordinateFormatter.fromLatitudeLongitude(normalized, WGS84())
      if (p && !isNaN(p.x) && !isNaN(p.y)) return p as Point
    } catch (e) { /* fall through to the plain reader */ }
  }
  const parts = splitPair(raw.replace(/(\d)-(\d)/g, '$1 $2'))
  if (!parts) return null
  let [a, b] = parts
  if (/[EWew]/.test(a) || /[NSns]/.test(b)) { const tmp = a; a = b; b = tmp }
  let lat = parseDegrees(a)
  let lon = parseDegrees(b)
  if (isNaN(lat) || isNaN(lon)) return null
  // Plain numbers typed longitude first: a latitude cannot pass 90.
  if (Math.abs(lat) > 90 && Math.abs(lon) <= 90) { const tmp = lat; lat = lon; lon = tmp }
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null
  return new Point({ x: lon, y: lat, spatialReference: WGS84() })
}

/** A grid reference (MGRS, USNG, UTM) to a WGS84 point. */
export function gridFromText (format: CoordFormat, text: string): Point | null {
  const t = (text || '').trim()
  if (!t || !formatterReady()) return null
  try {
    if (format === 'mgrs') return coordinateFormatter.fromMgrs(t, WGS84(), 'automatic') as Point
    if (format === 'usng') return coordinateFormatter.fromUsng(t, WGS84()) as Point
    if (format === 'utm') {
      return (coordinateFormatter.fromUtm(t, WGS84(), 'latitude-band-indicators') ||
        coordinateFormatter.fromUtm(t, WGS84(), 'north-south-indicators')) as Point
    }
  } catch (e) { /* not a valid reference */ }
  return null
}

/** Reads a plain number, tolerating spaces, thousands commas and a hemisphere letter. */
function readNumber (value: string): number {
  const s = (value || '').trim()
  if (!s) return NaN
  if (/[NSEWnsew°]/.test(s) || /\d-\d/.test(s)) return parseDegrees(s)
  return Number(s.replace(/[\s,]/g, ''))
}

/**
 * What the user typed, for one unit, as a point in the map's coordinate system.
 * xy units read the two boxes; every other format reads the single box.
 */
export async function parseUnitInput (unit: pointunit, x: string, y: string, single: string, mapSR: SpatialReference, extent?: any): Promise<Point | null> {
  await ready()
  const format: CoordFormat = unit.format || 'xy'
  let pt: Point | null = null
  if (format === 'xy') {
    const nx = readNumber(x)
    const ny = readNumber(y)
    if (isNaN(nx) || isNaN(ny)) return null
    const sr = srOf(unit) || mapSR
    pt = new Point({ x: nx, y: ny, spatialReference: sr })
    return project(pt, mapSR, { transformation: unit.transformation, unitIsSource: true, extent })
  }
  pt = isLatLonFormat(format) ? latLonFromText(single) : gridFromText(format, single)
  if (!pt) return null
  return project(pt, mapSR, { transformation: 'auto', unitIsSource: true, extent })
}

// ── Writing coordinates ──────────────────────────────────────────────────────

const pad = (n: number, d: number): string => n.toFixed(d)

/** Latitude and longitude text without the formatter (browsers without WebAssembly). */
function plainLatLon (p: Point, decimals: number): string {
  const lat = p.y
  const lon = p.x
  return `${pad(Math.abs(lat), decimals)}${lat >= 0 ? 'N' : 'S'} ${pad(Math.abs(lon), decimals)}${lon >= 0 ? 'E' : 'W'}`
}

/**
 * One coordinate string for a map point in a given format.
 * xy: "x, y" in the WKID (or the map's system). Lat/lon: the formatter's DD, DDM or DMS text.
 * Grids: MGRS and USNG to 1 meter, UTM with latitude bands, spaced for reading.
 */
export async function formatPoint (mapPoint: Point, fmt: { format: CoordFormat, wkid?: number, wkt?: string, decimals?: number, transformation?: TransformSetting }, extent?: any): Promise<string | null> {
  if (!validPoint(mapPoint)) return null
  await ready()
  const format = fmt.format || 'xy'
  try {
    if (format === 'xy') {
      const target = srOf(fmt) || mapPoint.spatialReference
      const pt = await project(mapPoint, target, { transformation: fmt.transformation, unitIsSource: false, extent })
      const d = clampDecimals(fmt.decimals, (target as any)?.isGeographic ? 6 : 2)
      return `${pad(pt.x, d)}, ${pad(pt.y, d)}`
    }
    const wgs = await project(mapPoint, WGS84(), { transformation: 'auto', unitIsSource: false, extent })
    if (isLatLonFormat(format)) {
      const d = clampDecimals(fmt.decimals, format === 'dd' ? 6 : format === 'ddm' ? 4 : 2)
      if (!formatterReady()) return plainLatLon(wgs, d)
      return coordinateFormatter.toLatitudeLongitude(wgs, format as any, d) || plainLatLon(wgs, d)
    }
    if (!formatterReady()) return null
    if (format === 'mgrs') return coordinateFormatter.toMgrs(wgs, 'automatic', 5, true) || null
    if (format === 'usng') return coordinateFormatter.toUsng(wgs, 5, true) || null
    if (format === 'utm') return coordinateFormatter.toUtm(wgs, 'latitude-band-indicators', true) || null
  } catch (e) {
    if (e instanceof OutOfAreaError) throw e
    console.info('eLocate: could not format coordinates as ' + format, e)
  }
  return null
}

/** The popup and Results lines for a point, one per configured result format. */
export async function resultLines (mapPoint: Point, formats: ResultFormat[], label: (f: ResultFormat) => string, outOfAreaText: string, extent?: any): Promise<string[]> {
  const lines = await Promise.all(formats.map(async (f) => {
    try {
      const value = await formatPoint(mapPoint, f, extent)
      return value ? `<em>${label(f)}</em>: ${value}` : null
    } catch (e) {
      return e instanceof OutOfAreaError ? `<em>${label(f)}</em>: ${outOfAreaText}` : null
    }
  }))
  return lines.filter(Boolean) as string[]
}

/** The map center written in a unit's format, for the clickable example under the boxes. */
export async function exampleFor (unit: pointunit, center: Point): Promise<{ x?: string, y?: string, single?: string } | null> {
  if (!center) return null
  const format = unit.format || 'xy'
  if (format === 'xy') {
    let value: string | null = null
    try { value = await formatPoint(center, { format: 'xy', wkid: unit.wkid, wkt: unit.wkt, transformation: unit.transformation }) } catch (e) { return null }
    if (!value) return null
    const [x, y] = value.split(',').map(v => v.trim())
    return { x, y }
  }
  const single = await formatPoint(center, { format, decimals: format === 'dd' ? 5 : format === 'ddm' ? 3 : 1 })
  return single ? { single } : null
}

/** Whether an xy unit's coordinate system is geographic (so its boxes read Longitude and Latitude). */
/** Whether an xy unit's coordinate system is geographic (so its boxes read Longitude and Latitude). */
export function isGeographicUnit (unit: { wkid?: number, wkt?: string }): boolean {
  try {
    const sr: any = srOf(unit)
    if (!sr) return false
    if (sr.isGeographic !== undefined) return !!sr.isGeographic
    return /^\s*(GEOGCS|GEOGCRS|GEODCRS)\b/i.test(unit.wkt || '')
  } catch (e) { return false }
}

export { isGridFormat, isLatLonFormat }
