/**
  Coordinate unit helpers shared by the runtime and the settings panel. City of Grand Junction
  GIS Division, 2026, for the Enhanced Locate widget (original by Robert Scheitlin, Apache 2.0).

  No esri/* imports here: the settings bundle loads in the builder, which has no map, and a
  static esri import there fails the whole settings panel (WIDGETHANDOFF 12.1).
*/
import type { CoordFormat, pointunit, ResultFormat, TransformSetting } from './config'

export const COORD_FORMATS: CoordFormat[] = ['xy', 'dd', 'ddm', 'dms', 'mgrs', 'usng', 'utm']

/** Translation key for each format's full name (runtime and settings both carry these keys). */
export const FORMAT_NAME_KEY: Record<CoordFormat, string> = {
  xy: 'fmtXY',
  dd: 'fmtDD',
  ddm: 'fmtDDM',
  dms: 'fmtDMS',
  mgrs: 'fmtMGRS',
  usng: 'fmtUSNG',
  utm: 'fmtUTM'
}

export const isLatLonFormat = (f: CoordFormat): boolean => f === 'dd' || f === 'ddm' || f === 'dms'
export const isGridFormat = (f: CoordFormat): boolean => f === 'mgrs' || f === 'usng' || f === 'utm'
/** Formats that take a number of decimal places. */
export const hasDecimals = (f: CoordFormat): boolean => f === 'xy' || isLatLonFormat(f)

const toNum = (v: any): number | undefined => {
  const n = typeof v === 'number' ? v : parseInt(String(v ?? ''), 10)
  return isNaN(n) || n <= 0 ? undefined : n
}

/**
 * Read any unit, new or pre-1.21, as the current shape. Robert's 1.9 units carried
 * wgs84option ('', 'map', 'dd', 'dms', 'dm', 'ddm'), a wkid, and tfwkid + transformDirection.
 */
export function normalizeUnit (u: any): pointunit {
  const src: any = (u && typeof u.asMutable === 'function') ? u.asMutable({ deep: true }) : { ...(u || {}) }
  let format: CoordFormat = src.format
  if (!format || COORD_FORMATS.indexOf(format) === -1) {
    const opt = String(src.wgs84option || '').toLowerCase()
    if (opt === 'dd') format = 'dd'
    else if (opt === 'dms') format = 'dms'
    else if (opt === 'dm' || opt === 'ddm') format = 'ddm'
    else format = 'xy'
  }
  const out: pointunit = { name: src.name || '', format }
  if (format === 'xy') {
    const opt = String(src.wgs84option || '').toLowerCase()
    const wkid = toNum(src.wkid)
    if (wkid && opt !== 'map') out.wkid = wkid
    else if (typeof src.wkt === 'string' && src.wkt.trim() && opt !== 'map') out.wkt = src.wkt.trim()
    if (src.xlabel) out.xlabel = src.xlabel
    if (src.ylabel) out.ylabel = src.ylabel
    out.transformation = normalizeTransform(src.transformation, src.tfwkid, src.transformDirection)
  }
  if (src.example) out.example = src.example
  return out
}

export function normalizeTransform (t: any, legacyWkid?: any, legacyDirection?: string): TransformSetting {
  if (t === 'auto' || t === 'none') return t
  if (t && Array.isArray(t.steps) && t.steps.length > 0) {
    return { steps: t.steps.map((s: any) => ({ wkid: Number(s.wkid), isInverse: !!s.isInverse })).filter((s: any) => s.wkid > 0) }
  }
  const w = toNum(legacyWkid)
  // 1.9 applied tfwkid with transformForward = (direction === 'forward') on the way from the
  // unit to the map, which is isInverse = !forward on a step defined unit -> WGS84.
  if (w) return { steps: [{ wkid: w, isInverse: legacyDirection !== 'forward' }] }
  return 'auto'
}

export function normalizeUnits (units: any): pointunit[] {
  const arr: any[] = units ? ((typeof units.asMutable === 'function') ? units.asMutable({ deep: true }) : Array.from(units)) : []
  return arr.map(normalizeUnit)
}

/** Result formats from the config, or from the pre-1.21 coordinateWKID + coordinatePrecision. */
export function resultFormatsFromConfig (config: any): ResultFormat[] {
  const rf = config?.resultFormats
  if (rf && rf.length !== undefined) {
    const arr: any[] = (typeof rf.asMutable === 'function') ? rf.asMutable({ deep: true }) : Array.from(rf)
    return arr.filter((r: any) => r && COORD_FORMATS.indexOf(r.format) > -1)
  }
  const decimals = (config?.coordinatePrecision !== undefined && config?.coordinatePrecision !== null) ? Number(config.coordinatePrecision) : 2
  const wkid = toNum(config?.coordinateWKID)
  if (wkid === 4326) return [{ format: 'dd', decimals }]
  return [{ format: 'xy', wkid, decimals }]
}

export const clampDecimals = (d: any, fallback: number): number => {
  const n = Number(d)
  if (isNaN(n)) return fallback
  return Math.max(0, Math.min(12, Math.round(n)))
}

// ── Settings model: standard formats plus custom X and Y systems ─────────────

/** The standard entries, in the order they appear on the Coordinates tab. 'mapxy' is X and Y in the map's system. */
export type StdKey = 'dd' | 'ddm' | 'dms' | 'mgrs' | 'usng' | 'utm' | 'mapxy'
export const STD_KEYS: StdKey[] = ['dd', 'ddm', 'dms', 'mgrs', 'usng', 'utm', 'mapxy']
export const STD_NAME_KEY: Record<StdKey, string> = { ...FORMAT_NAME_KEY, mapxy: 'fmtXYMap' } as any

/** Defaults for a new widget and for "Use the standard formats". */
// Global defaults: nothing national (USNG) or regional is on until the builder turns it on,
// and the map's own X and Y covers whatever system the organization's map uses.
export const DEFAULT_TAB_KEYS: StdKey[] = ['dd', 'ddm', 'dms', 'mgrs', 'utm', 'mapxy']
export const DEFAULT_RESULT_KEYS: StdKey[] = ['dd', 'mgrs']
export const DEFAULT_DD_DECIMALS = 6
export const DEFAULT_XY_DECIMALS = 2

const keyOfUnit = (u: pointunit): StdKey | null => {
  if (u.format === 'xy') return (u.wkid || u.wkt) ? null : 'mapxy'
  return (u.format as StdKey) || null
}

/** Any unit still in Robert's 1.9 shape (no format field). */
export function hasLegacyUnits (rawUnits: any): boolean {
  const arr: any[] = rawUnits ? ((typeof rawUnits.asMutable === 'function') ? rawUnits.asMutable({ deep: true }) : Array.from(rawUnits)) : []
  return arr.some(u => u && !u.format)
}

export function splitUnits (rawUnits: any): { std: StdKey[], custom: pointunit[] } {
  const units = normalizeUnits(rawUnits)
  const std: StdKey[] = []
  const custom: pointunit[] = []
  units.forEach(u => {
    const k = keyOfUnit(u)
    if (k) { if (std.indexOf(k) === -1) std.push(k) } else custom.push(u)
  })
  return { std, custom }
}

/** Units in a fixed order: standard formats first (standard names), then the custom systems. */
export function buildUnits (std: StdKey[], custom: pointunit[], name: (key: string) => string): pointunit[] {
  const out: pointunit[] = []
  STD_KEYS.forEach(k => {
    if (std.indexOf(k) === -1) return
    out.push(k === 'mapxy' ? { name: name(STD_NAME_KEY[k]), format: 'xy', transformation: 'auto' } : { name: name(STD_NAME_KEY[k]), format: k as CoordFormat })
  })
  custom.forEach(c => { out.push({ ...c, format: 'xy', transformation: c.transformation || 'auto' }) })
  return out
}

/**
 * Identity of a coordinate system: its WKID, or its WKT for a system that has none. Any system
 * the projection engine knows works, so nothing here is tied to a region or a list.
 */
export const srKey = (o: { wkid?: number, wkt?: string } | undefined): string =>
  !o ? '' : o.wkid ? `wkid:${o.wkid}` : o.wkt ? `wkt:${o.wkt}` : ''

export function splitResults (config: any): { std: StdKey[], customKeys: string[], ddDecimals: number, xyDecimals: number } {
  const list = resultFormatsFromConfig(config)
  const std: StdKey[] = []
  const customKeys: string[] = []
  let ddDecimals = DEFAULT_DD_DECIMALS
  let xyDecimals = DEFAULT_XY_DECIMALS
  let xySeen = false
  list.forEach(f => {
    if (f.format === 'xy') {
      const key = srKey(f)
      if (key) { if (customKeys.indexOf(key) === -1) customKeys.push(key) } else if (std.indexOf('mapxy') === -1) std.push('mapxy')
      if (!xySeen && f.decimals !== undefined) { xyDecimals = clampDecimals(f.decimals, DEFAULT_XY_DECIMALS); xySeen = true }
    } else {
      if (std.indexOf(f.format as StdKey) === -1) std.push(f.format as StdKey)
      if (f.format === 'dd' && f.decimals !== undefined) ddDecimals = clampDecimals(f.decimals, DEFAULT_DD_DECIMALS)
    }
  })
  return { std, customKeys, ddDecimals, xyDecimals }
}

/** Result formats: standard ones in the fixed order, then the custom systems. DDM and DMS follow the DD decimals. */
export function buildResults (std: StdKey[], customSystems: pointunit[], ddDecimals: number, xyDecimals: number): ResultFormat[] {
  const out: ResultFormat[] = []
  STD_KEYS.forEach(k => {
    if (std.indexOf(k) === -1) return
    if (k === 'mapxy') out.push({ format: 'xy', decimals: xyDecimals })
    else if (k === 'dd') out.push({ format: 'dd', decimals: ddDecimals })
    else if (k === 'ddm') out.push({ format: 'ddm', decimals: Math.max(0, ddDecimals - 2) })
    else if (k === 'dms') out.push({ format: 'dms', decimals: Math.max(0, ddDecimals - 4) })
    else out.push({ format: k as CoordFormat })
  })
  customSystems.forEach(c => {
    if (c.wkid) out.push({ format: 'xy', wkid: c.wkid, decimals: xyDecimals })
    else if (c.wkt) out.push({ format: 'xy', wkt: c.wkt, decimals: xyDecimals })
  })
  return out
}
