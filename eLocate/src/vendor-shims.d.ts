// vendor-shims.d.ts
// City of Grand Junction GIS Division
//
// Widget-specific editor declarations for the Enhanced Locate widget. Sits beside the
// untouched master copy of exb-editor-shims.d.ts (copied from widgets\_vs) so the
// master can stay byte-identical across widgets. Editor only: emits nothing, the
// Experience Builder webpack build never reads this file, and publish.ps1 leaves it
// out of the release zip (src\*-shims.d.ts).
//
// Keep this file a script (no top-level import/export) so every block below stays
// ambient and merges with the master shim's declarations. tsconfig.json lists this
// file before the master in "files" so its full declarations win over the master's
// shorthand ones (jimu-for-builder, jimu-ui/*).

// The master shim declares 'jimu-for-builder' in shorthand form, which makes
// AllWidgetSettingProps a namespace rather than a type (TS2709). Give it a shape.
declare module 'jimu-for-builder' {
    export type AllWidgetSettingProps<T = any> = {
        id: string
        config: T & { set: (key: any, value: any) => any; [key: string]: any }
        onSettingChange: (settings: any, ...rest: any[]) => void
        useDataSources?: any
        useMapWidgetIds?: any
        intl?: any
        theme?: any
        portalUrl?: string
        [key: string]: any
    }
    export const getAppConfigAction: any
    export const builderAppSync: any
}

// Calcite wrapper supplied by Experience Builder (used by the help guide and the pin button).
declare module 'calcite-components' {
    export const CalciteIcon: any
    export const CalciteChip: any
    const mod: any
    export default mod
}

// Harmless under react-jsx; kept so the file matches the family's vendor-shims shape.
declare namespace JSX {
    type Element = any
    interface IntrinsicElements { [elemName: string]: any }
    interface ElementClass { render (): any }
    interface ElementAttributesProperty { props: {} }
    interface ElementChildrenAttribute { children: {} }
    interface IntrinsicAttributes { [key: string]: any }
    interface IntrinsicClassAttributes<T> { [key: string]: any }
}

// jimu-core members the master shim does not list.
declare module 'jimu-core' {
    export type SerializedStyles = any
    export type IntlShape = any
}

// config.ts imports ImmutableObject directly. The master's ImmutableObject is shallow, but
// the real seamless-immutable type is deep (config.pointunits.asMutable() and so on), so the
// members are widened to any here rather than editing the byte-locked master.
declare module 'seamless-immutable' {
    export type ImmutableObject<T> = import('jimu-core').ImmutableObject<T> & { readonly [K in keyof T]: any }
    export type ImmutableArray<T> = import('jimu-core').ImmutableArray<T>
    const Immutable: any
    export default Immutable
}

// CommonJS require() used for the gif markers and the settings JSON (webpack supplies it).
declare function require (id: string): any

// ArcGIS Maps SDK modules this widget uses as a value and as a type, or through a namespace
// import. The master shim's 'esri/*' wildcard exposes only a default `any` value, so these
// specific declarations (which win over the wildcard) declare classes and named exports.
declare module 'esri/geometry/Point' {
    export default class Point { constructor (properties?: any); x: number; y: number; spatialReference: any; [key: string]: any }
}
declare module 'esri/geometry/SpatialReference' {
    export default class SpatialReference { constructor (properties?: any); wkid: number; isWebMercator: boolean; equals (other: any): boolean; [key: string]: any }
}
declare module 'esri/Graphic' {
    export default class Graphic { constructor (properties?: any); geometry: any; attributes: any; symbol: any; [key: string]: any }
}
declare module 'esri/layers/GraphicsLayer' {
    export default class GraphicsLayer { constructor (properties?: any); id: string; graphics: any; add (g: any): void; remove (g: any): void; removeAll (): void; [key: string]: any }
}
declare module 'esri/PopupTemplate' {
    export default class PopupTemplate { constructor (properties?: any); [key: string]: any }
}
declare module 'esri/rest/support/ProjectParameters' {
    export default class ProjectParameters { constructor (properties?: any); geometries: any[]; outSpatialReference: any; transformation: any; transformForward: boolean; [key: string]: any }
}
declare module 'esri/rest/support/AddressCandidate' {
    export default class AddressCandidate { constructor (properties?: any); address: string; attributes: any; location: any; score: number; [key: string]: any }
}
declare module 'esri/symbols/PictureMarkerSymbol' {
    export default class PictureMarkerSymbol { constructor (properties?: any); [key: string]: any }
}
declare module 'esri/symbols/SimpleMarkerSymbol' {
    export default class SimpleMarkerSymbol { constructor (properties?: any); [key: string]: any }
}
declare module 'esri/rest/locator' {
    export function addressToLocations (url: string, params: any, requestOptions?: any): Promise<any[]>
    export function locationToAddress (url: string, params: any, requestOptions?: any): Promise<any>
}
declare module 'esri/rest/geometryService' {
    export function project (url: string, params: any, requestOptions?: any): Promise<any[]>
}
declare module 'esri/geometry/support/webMercatorUtils' {
    export function canProject (source: any, target: any): boolean
    export function project (geometry: any, target: any): any
}
declare module 'esri/geometry/operators/projectOperator' {
    export function execute (geometry: any, outSpatialReference: any, options?: any): any
    export function isLoaded (): boolean
    export function load (): Promise<void>
}
declare module 'esri/core/reactiveUtils' {
    export function watch (getValue: () => any, callback: (value: any, old?: any) => void, options?: any): { remove: () => void }
    export function when (getValue: () => any, callback: (value: any) => void, options?: any): { remove: () => void }
}
declare module 'esri/geometry/coordinateFormatter' {
    export function isLoaded (): boolean
    export function isSupported (): boolean
    export function load (): Promise<void>
    export function fromLatitudeLongitude (coordinates: string, spatialReference?: any): any
    export function toLatitudeLongitude (point: any, format: 'dd' | 'ddm' | 'dms', decimalPlaces?: number): string
    export function fromMgrs (coordinates: string, spatialReference: any, conversionMode: string): any
    export function toMgrs (point: any, conversionMode: string, precision?: number, addSpaces?: boolean): string
    export function fromUsng (coordinates: string, spatialReference?: any): any
    export function toUsng (point: any, precision?: number, addSpaces?: boolean): string
    export function fromUtm (coordinates: string, spatialReference: any, conversionMode: string): any
    export function toUtm (point: any, conversionMode: string, addSpaces?: boolean): string
}
declare module 'esri/geometry/operators/support/geographicTransformationUtils' {
    export function isLoaded (): boolean
    export function load (): Promise<void>
    export function getTransformation (inSpatialReference: any, outSpatialReference: any, areaOfInterestExtent?: any): any
    export function getTransformations (inSpatialReference: any, outSpatialReference: any, areaOfInterestExtent?: any): any[]
}
