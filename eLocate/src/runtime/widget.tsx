/** @jsx jsx */
/**
  Enhanced Locate widget for ArcGIS Experience Builder.
  Original widget Copyright 2022 Robert Scheitlin, licensed under the Apache License 2.0.

  Modified 2026 by the City of Grand Junction GIS Division for Experience Builder 1.21
  (ArcGIS Maps SDK 5.x). This file was changed; CHANGES.md lists every modification.

  Robert's notes from 2/25/2022:
   * Fixed 0 coordinate precision issue
   * Added warning if all tabs disabled
   * when popup wkid = 4326 then coordinates labeled as lat lon and x,y values swapped
   * example tooltip added to example values
   * Added widget info modal dialog (Alt + click anywhere in the widget)
*/
import { React, AllWidgetProps, jsx, classNames, IMState, WidgetState } from 'jimu-core'
import { IMConfig, listItem, locateType, pointunit } from '../config'
import {
  Button, Select, TextInput, Checkbox, Label,
  Modal, ModalBody, ModalFooter, ModalHeader
} from 'jimu-ui'
import { CalciteIcon } from 'calcite-components'
import defaultMessages from './translations/default'
import { JimuMapView, JimuMapViewComponent } from 'jimu-arcgis'
import { getStyle } from './lib/style'
import * as coords from './lib/coords'
import { FORMAT_NAME_KEY, normalizeUnits, resultFormatsFromConfig, isGridFormat, isLatLonFormat, srKey } from '../unitUtils'
import type { ResultFormat } from '../config'
import List from './components/list'
import HelpPopup from './components/HelpPopup'
import FirstRunHint from './components/FirstRunHint'
import { buildHelpSections } from './helpSections'
import type { HelpFeatures } from './helpSections'
import { beacon } from '../shared/beacon'
import type { BeaconHandle } from '../shared/beacon'
import * as locator from 'esri/rest/locator'
import GraphicsLayer from 'esri/layers/GraphicsLayer'
import esriRequest from 'esri/request'
import SpatialReference from 'esri/geometry/SpatialReference'
import Point from 'esri/geometry/Point'
import Graphic from 'esri/Graphic'
import PopupTemplate from 'esri/PopupTemplate'
import AddressCandidate from 'esri/rest/support/AddressCandidate'
import PictureMarkerSymbol from 'esri/symbols/PictureMarkerSymbol'
import SimpleMarkerSymbol from 'esri/symbols/SimpleMarkerSymbol'
import * as reactiveUtils from 'esri/core/reactiveUtils'

type TabId = 'addresslabel' | 'coordslabel' | 'addressinsplabel' | 'resultslabel'

interface State {
  jimuMapView: JimuMapView
  messageOpen: boolean
  messageTitle: string
  messageBody: string
  showBusy: boolean
  showProgress: boolean
  showClear: boolean
  resultListCnt: number
  resultMessage: string
  addressInputValue: string
  selectedUnits: string
  xValue: string
  yValue: string
  /** The one box used by every format except xy. */
  singleValue: string
  /** Clickable example: a fixed one from the builder, or the map center in the unit's format. */
  exampleX: string
  exampleY: string
  exampleSingle: string
  revBtnActive: boolean
  showExtentCbx: boolean
  addSearchExtent: boolean
  locating: boolean
  selTab: TabId | ''
  /** The locator could not be read, so the Address tab is hidden. */
  locatorFailed: boolean
  /** Whether the in-widget help guide is open. */
  helpOpen: boolean
  /** First-run hint, shown until dismissed once in this browser. */
  showFirstRunHint: boolean
}

interface Geocode {
  url: string
  singleLineFieldName: string
  version: number
}

const DEFAULT_LOCATOR = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer'

const pinIcon = require('./assets/i_pin1.gif')
const mailboxIcon = require('./assets/i_mailbox.gif')
const houseIcon = require('./assets/i_house.gif')

export default class Widget extends React.PureComponent<AllWidgetProps<IMConfig>, State> {
  static mapExtraStateProps = (state: IMState) => {
    return {
      widgetsRuntimeInfo: state.widgetsRuntimeInfo
    }
  }

  resultListRecords: listItem[] = []
  viewClickHandler: { remove: () => void }
  graphicsLayer: GraphicsLayer
  drawLayer: GraphicsLayer
  pointSymbol: SimpleMarkerSymbol
  geocode: Geocode = { url: '', singleLineFieldName: '', version: undefined }
  serviceWKID: number
  minscore: number = 40
  timer: ReturnType<typeof setTimeout>
  autoCloseNum: number = Number.NEGATIVE_INFINITY
  /** Units and result formats read through the migration helpers, cached per config object. */
  unitsCache: { config: any, units: pointunit[] } = { config: null, units: [] }
  exampleRequest = 0
  popupWatchHandle: { remove: () => void }
  /** Refreshes the Coordinates tab example each time the map stops moving. */
  exampleWatchHandle: { remove: () => void }
  popupContainer: HTMLElement
  beacon: BeaconHandle | null = null
  isMounted = false

  constructor (props) {
    super(props)
    const { config } = this.props
    const firstUnit: pointunit = normalizeUnits(config.pointunits)[0]
    this.state = {
      jimuMapView: undefined,
      messageOpen: false,
      messageTitle: '',
      messageBody: '',
      showBusy: true,
      showProgress: false,
      showClear: false,
      resultListCnt: 0,
      resultMessage: '',
      addressInputValue: '',
      selectedUnits: firstUnit?.name ?? '',
      xValue: '',
      yValue: '',
      singleValue: '',
      exampleX: '',
      exampleY: '',
      exampleSingle: '',
      revBtnActive: false,
      showExtentCbx: true,
      addSearchExtent: !!config.limitsearchtoviewextentbydefault,
      locating: false,
      selTab: '',
      locatorFailed: false,
      helpOpen: false,
      showFirstRunHint: false
    }
    this.applyConfig(config)
    this.state = { ...this.state, selTab: this.defaultTab() }
  }

  nls = (id: string): string => {
    return this.props.intl ? this.props.intl.formatMessage({ id: id, defaultMessage: defaultMessages[id] }) : (defaultMessages[id] ?? id)
  }

  /** Reads the config values the class keeps as fields. Called on mount and on every config change. */
  applyConfig = (config: IMConfig): void => {
    this.autoCloseNum = (config.autoClosePopup && config.autoClosePopup > 0) ? config.autoClosePopup : Number.NEGATIVE_INFINITY
    this.minscore = Number(config.minscore) || 40
  }

  // ── Tabs ───────────────────────────────────────────────────────────────────

  /** Which tabs are on, from the builder's "Choose tab(s) to disable" switches plus live locator status. */
  tabsEnabled = () => {
    const disabled: string[] = (this.props.config.disabledtabs as any) || []
    return {
      address: disabled.indexOf('address') === -1 && !this.state?.locatorFailed,
      // The tab needs at least one format or coordinate system to offer.
      coordinate: disabled.indexOf('coordinate') === -1 && this.units().length > 0,
      reverse: disabled.indexOf('reverse') === -1,
      result: disabled.indexOf('result') === -1
    }
  }

  /** The tab to show first: the builder's Initial View, or the first tab that is on. */
  defaultTab = (): TabId | '' => {
    const on = this.tabsEnabled()
    const wanted: TabId | '' = this.props.config.initialView === locateType.address
      ? 'addresslabel'
      : this.props.config.initialView === locateType.coordinate
        ? 'coordslabel'
        : this.props.config.initialView === locateType.reverse ? 'addressinsplabel' : ''
    if (wanted && this.isTabOn(wanted, on)) return wanted
    if (on.address) return 'addresslabel'
    if (on.coordinate) return 'coordslabel'
    if (on.reverse) return 'addressinsplabel'
    return ''
  }

  isTabOn = (tab: TabId | '', on = this.tabsEnabled()): boolean => {
    switch (tab) {
      case 'addresslabel': return on.address
      case 'coordslabel': return on.coordinate
      case 'addressinsplabel': return on.reverse
      // Results opens once there is something to show: results, a search running, or a message
      // such as "No Results Found" (which the original never displayed because the tab stayed shut).
      case 'resultslabel': return on.result && (this.state.resultListCnt > 0 || this.state.locating || !!this.state.resultMessage)
      default: return false
    }
  }

  /** Move to the Results tab when it is on; otherwise stay where the user is. */
  resultsTabOr = (fallback: TabId | ''): TabId | '' => {
    return this.tabsEnabled().result ? 'resultslabel' : fallback
  }

  onTabSelect = (tabTitle: TabId) => {
    // The Results tab only opens once there is something in it. (The 1.9 test here could never
    // be true for Results, so the tab did not open on click.)
    if (tabTitle !== 'resultslabel' || this.isTabOn(tabTitle)) {
      this.setState({ selTab: tabTitle })
    }
  }

  /** Left and right arrow keys move between the tabs that can open, like a standard tablist. */
  onTabKeyDown = (evt: React.KeyboardEvent<HTMLButtonElement>) => {
    if (evt.key !== 'ArrowRight' && evt.key !== 'ArrowLeft') return
    const order: TabId[] = ['addresslabel', 'coordslabel', 'addressinsplabel', 'resultslabel']
    const open = order.filter(tb => this.isTabOn(tb))
    const current = open.indexOf(this.state.selTab as TabId)
    if (open.length === 0) return
    const next = open[(current + (evt.key === 'ArrowRight' ? 1 : open.length - 1)) % open.length]
    evt.preventDefault()
    this.onTabSelect(next)
    const btn = document.getElementById(`${next}-tab-${this.props.id}`)
    if (btn) btn.focus()
  }

  // ── Map helpers (Maps SDK 5.x safe) ────────────────────────────────────────

  getView = (): __esri.MapView | null => this.state.jimuMapView?.view ?? null

  /** view.popup is created lazily on 5.x and may be undefined until a popup opens. */
  closeMapPopup = (): void => {
    const view: any = this.getView()
    if (!view) return
    try {
      if (typeof view.closePopup === 'function') view.closePopup()
      else if (view.popup) view.popup.visible = false
    } catch (e) { /* the popup may already be gone */ }
  }

  openMapPopup = (options: any): void => {
    const view: any = this.getView()
    if (!view) return
    try {
      if (typeof view.openPopup === 'function') view.openPopup(options)
      else if (view.popup && typeof view.popup.open === 'function') view.popup.open(options)
    } catch (e) {
      console.warn('eLocate: could not open the popup', e)
    }
  }

  /** Set the cursor on this widget's own map only, never on every map in the app. */
  setMapCursor = (cursor: string): void => {
    const view: any = this.getView()
    const container: HTMLElement = view?.container
    if (container && container.style) container.style.cursor = cursor
  }

  get resultsLayerId (): string { return `eLocateGL-${this.props.id}` }
  // Not "DrawGL": that id belongs to the Advanced Draw widget and sharing it clobbered its layer.
  get inspectLayerId (): string { return `eLocateInspect-${this.props.id}` }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  componentDidMount () {
    this.isMounted = true
    this.beacon = beacon.init(this.props)
    if (!this.readHintDismissed()) { this.setState({ showFirstRunHint: true }) }
    this.initLocator()
    this.graphicsLayer = new GraphicsLayer({ id: this.resultsLayerId, title: this.nls('resultsLayerTitle') })
    this.drawLayer = new GraphicsLayer({ id: this.inspectLayerId, listMode: 'hide' })
    this.pointSymbol = new SimpleMarkerSymbol({ style: 'cross', size: '14pt', color: 'red', outline: { color: 'red', width: 2 } })
  }

  componentDidUpdate (prevProps: AllWidgetProps<IMConfig>, prevState: State) {
    const { config } = this.props
    const view = this.getView()

    // Only react to an actual open or close, never to every re-render.
    if (view && prevProps.state !== this.props.state) {
      const widgetState: any = this.props.state
      if (widgetState === WidgetState.Closed) {
        this.closeMapPopup()
        view.map.remove(this.graphicsLayer)
        view.map.remove(this.drawLayer)
        if (this.state.revBtnActive) this.stopInspector()
        this.teardownPopupListeners()
      } else if (widgetState === WidgetState.Opened) {
        this.addLayersToMap()
        this.setupPopupWatch()
      }
    }

    if (prevState.selTab !== this.state.selTab && this.state.selTab === 'coordslabel') this.refreshExample()

    if (prevProps.config !== config) {
      this.applyConfig(config)
      // Keep the chosen unit if it still exists; otherwise start on the first one.
      const units = this.units()
      const still = units.find(u => u.name === this.state.selectedUnits)
      if (!still && units[0]) this.setState({ selectedUnits: units[0].name, xValue: '', yValue: '', singleValue: '' })
      if (prevProps.config.pointunits !== config.pointunits) this.refreshExample(still || units[0])
      if (prevProps.config?.locator?.url !== config?.locator?.url) this.initLocator()
      // Keep the tab the user is on unless the builder just turned it off.
      if (!this.isTabOn(this.state.selTab) || prevProps.config.initialView !== config.initialView) {
        this.setState({ selTab: this.defaultTab() })
      }
    }

    if (prevState.locatorFailed !== this.state.locatorFailed && !this.isTabOn(this.state.selTab)) {
      this.setState({ selTab: this.defaultTab() })
    }
  }

  componentWillUnmount () {
    this.isMounted = false
    clearTimeout(this.timer)
    this.teardownPopupListeners()
    this.popupWatchHandle?.remove()
    this.exampleWatchHandle?.remove()
    this.viewClickHandler?.remove()
    this.setMapCursor('default')
  }

  addLayersToMap = (): void => {
    const view = this.getView()
    if (!view) return
    if (this.graphicsLayer && !view.map.findLayerById(this.graphicsLayer.id)) view.map.add(this.graphicsLayer)
    if (this.drawLayer && !view.map.findLayerById(this.drawLayer.id)) view.map.add(this.drawLayer)
  }

  // ── Popup auto close ───────────────────────────────────────────────────────

  // Watch for the popup container to appear, then attach the mouseover and mouseout
  // handlers that pause and resume the auto-close timer.
  setupPopupWatch = () => {
    const view: any = this.getView()
    if (!view) return
    this.popupWatchHandle?.remove()
    this.attachPopupListeners()
    this.popupWatchHandle = reactiveUtils.watch(
      () => view.popup?.container,
      () => { this.attachPopupListeners() }
    )
  }

  attachPopupListeners = () => {
    const view: any = this.getView()
    if (!view) return
    const container = view.popup?.container as HTMLElement
    if (!container || typeof container.addEventListener !== 'function' || container === this.popupContainer) return
    this.teardownPopupListeners()
    this.popupContainer = container
    container.addEventListener('mouseover', this.popupMouseOverFunc)
    container.addEventListener('mouseout', this.popupMouseOutFunc)
  }

  teardownPopupListeners = () => {
    if (this.popupContainer) {
      this.popupContainer.removeEventListener('mouseover', this.popupMouseOverFunc)
      this.popupContainer.removeEventListener('mouseout', this.popupMouseOutFunc)
      this.popupContainer = null
    }
  }

  popupMouseOverFunc = () => { this.disableTimer() }

  popupMouseOutFunc = () => {
    if (this.autoCloseNum !== Number.NEGATIVE_INFINITY) this.timedClose()
  }

  timedClose = () => {
    clearTimeout(this.timer)
    this.timer = setTimeout(() => { this.closeMapPopup() }, this.autoCloseNum)
  }

  disableTimer = () => { clearTimeout(this.timer) }

  // ── Map connection ─────────────────────────────────────────────────────────

  activeViewChangeHandler = (jimuMapView: JimuMapView) => {
    if (jimuMapView === null || jimuMapView === undefined) {
      this.setState({ jimuMapView: null })
      return
    }
    this.setState({ jimuMapView: jimuMapView })
    jimuMapView.whenJimuMapViewLoaded().then(() => {
      if (!this.isMounted) return
      const { map } = jimuMapView.view
      // A previous copy of this widget (unmounted with its marks still on the map) left the
      // results layer behind: adopt it so the marks and the Results list stay together.
      const existing = map.findLayerById(this.resultsLayerId) as GraphicsLayer
      if (existing && existing !== this.graphicsLayer) {
        this.graphicsLayer = existing
        this.restoreResultsFromLayer()
      }
      const existingInspect = map.findLayerById(this.inspectLayerId) as GraphicsLayer
      if (existingInspect && existingInspect !== this.drawLayer) this.drawLayer = existingInspect
      this.addLayersToMap()
      this.setupPopupWatch()
      this.setState({ showBusy: false })
      this.watchMapForExample(jimuMapView.view)
      this.refreshExample()
    }).catch((err) => {
      console.error('eLocate: the map did not load', err)
      this.beacon?.error(err, 'map-load')
      this.setState({ showBusy: false })
    })
  }

  restoreResultsFromLayer = (): void => {
    const records: listItem[] = []
    this.graphicsLayer.graphics.forEach((gra: Graphic, i: number) => {
      const att: any = gra.attributes || {}
      records.push({
        title: att.title,
        content: att.content,
        type: att.type,
        point: gra.geometry as Point,
        graphic: gra,
        id: att.rid || `${att.type}_id_${i}`,
        selected: i === 0
      })
    })
    this.resultListRecords = records
    if (records.length > 0) {
      this.setState({
        resultListCnt: records.length,
        showClear: true,
        resultMessage: this.foundMessage(records.length),
        selTab: this.resultsTabOr(this.state.selTab)
      })
    }
  }

  // ── Results list ───────────────────────────────────────────────────────────

  foundMessage = (count: number): string => `${this.nls('resultsfoundlabel')} ${count}`

  onRecordRemoveClick = (evt) => {
    evt.stopPropagation()
    const id: string = evt.currentTarget.id
    const locResult: listItem = this.resultListRecords.find(item => item.id === id)
    if (!locResult) return
    if (locResult.graphic) this.graphicsLayer.remove(locResult.graphic)
    this.closeMapPopup()
    this.resultListRecords = this.resultListRecords.filter(item => item.id !== id)
    const count = this.resultListRecords.length
    if (count === 0) {
      this.setState({ resultListCnt: 0, resultMessage: '', showClear: false, selTab: this.defaultTab() })
      return
    }
    this.setState({ resultListCnt: count, resultMessage: this.foundMessage(count) })
  }

  onRecordClick = (evt) => {
    const view = this.getView()
    if (!view) return
    const id: string = evt.currentTarget.id
    let target: listItem
    this.resultListRecords.forEach(item => {
      item.selected = item.id === id
      if (item.selected) target = item
    })
    if (!target) return
    this.forceUpdate()
    this.zoomToResult(target, false)
  }

  onRecordMouseOver = (evt) => {}

  onRecordMouseOut = (evt) => {}

  clearResultsHandler = (evt?, resetTab?: boolean) => {
    if (evt) evt.preventDefault()
    this.graphicsLayer?.removeAll()
    this.drawLayer?.removeAll()
    this.resultListRecords = []
    this.closeMapPopup()
    const next: any = { resultListCnt: 0, resultMessage: '', locating: false, showProgress: false, showClear: false }
    if (resetTab) next.selTab = this.defaultTab()
    this.setState(next)
    if (resetTab) this.beacon?.action('clear')
  }

  // ── Projection and coordinates ─────────────────────────────────────────────

  /** Project to another coordinate system; see lib/coords.ts for the order of attempts. */
  toSR = (point: Point, outSR: SpatialReference): Promise<Point> => {
    return coords.project(point, outSR, { serviceWKID: this.serviceWKID, extent: this.getView()?.extent })
  }

  /** The configured units, with pre-1.21 units read as the current shape. */
  units = (): pointunit[] => {
    if (this.unitsCache.config !== this.props.config) {
      this.unitsCache = { config: this.props.config, units: normalizeUnits(this.props.config.pointunits) }
    }
    return this.unitsCache.units
  }

  selectedUnit = (): pointunit | undefined => {
    const units = this.units()
    return units.find(u => u.name === this.state.selectedUnits) || units[0]
  }

  formatName = (format: string): string => this.nls(FORMAT_NAME_KEY[format] || 'fmtXY')

  /** Standard formats read by their format name; custom X and Y systems by the builder's name. */
  unitLabel = (unit: pointunit): string => {
    if (unit.format !== 'xy') return this.formatName(unit.format)
    if (!unit.wkid && !unit.wkt) return this.nls('fmtXYMap')
    return unit.name || `${this.nls('fmtXYShort')} ${unit.wkid || ''}`.trim()
  }

  resultLabel = (f: ResultFormat): string => {
    if (f.label) return f.label
    if (f.format === 'xy') {
      const key = srKey(f)
      if (!key) return this.nls('fmtXYMap')
      const named = this.units().find(u => u.format === 'xy' && srKey(u) === key && u.name)
      return named ? named.name : (f.wkid ? `${this.nls('fmtXYShort')} (${f.wkid})` : this.nls('fmtXYShort'))
    }
    return this.nls(`${FORMAT_NAME_KEY[f.format]}Short`)
  }

  /** The popup and Results coordinate lines, one per result format the builder picked. */
  coordinateLines = async (mapPoint: Point): Promise<string> => {
    const lines = await coords.resultLines(mapPoint, resultFormatsFromConfig(this.props.config), this.resultLabel, this.nls('coordsOutOfArea'), this.getView()?.extent)
    return lines.join('<br>')
  }

  geometryService_faultHandler = (err) => {
    console.info(err)
    this.beacon?.error(err, 'project')
    this.setState({ showProgress: false, locating: false, resultMessage: this.nls('projectissue') })
  }

  // ── Graphics and zoom ──────────────────────────────────────────────────────

  makeGraphic = (locResult: listItem): Graphic => {
    const url = locResult.type === locateType.address ? mailboxIcon : locResult.type === locateType.coordinate ? pinIcon : houseIcon
    const ptGraphic = new Graphic({
      geometry: locResult.point,
      symbol: new PictureMarkerSymbol({ url: url, width: '24px', height: '24px' }),
      attributes: {
        content: locResult.content,
        title: locResult.title,
        rid: locResult.id,
        type: locResult.type
      },
      popupTemplate: new PopupTemplate({ title: locResult.title, content: locResult.content })
    })
    this.graphicsLayer.add(ptGraphic)
    locResult.graphic = ptGraphic
    return ptGraphic
  }

  /**
   * Zoom to a result and open its popup. Zooms in to the builder's Default Zoom Scale when Force
   * scale is on or the map is zoomed out past it; otherwise only recenters.
   */
  zoomToResult = (locResult: listItem, applyScale = true): void => {
    const view = this.getView()
    if (!view || !locResult?.point) return
    const { config } = this.props
    const zoomscale = Number(config.zoomscale) || 5000
    const useScale = applyScale && (config.forcescale === true || view.scale > zoomscale)
    const target: any = useScale ? { target: locResult.point, scale: zoomscale } : { target: locResult.point }
    const open = () => {
      this.openMapPopup({
        features: locResult.graphic ? [locResult.graphic] : undefined,
        location: locResult.point,
        updateLocationEnabled: true
      })
      if (this.autoCloseNum !== Number.NEGATIVE_INFINITY) this.timedClose()
    }
    view.goTo(target).then(open, open)
  }

  showLocation = (locResult: listItem) => {
    this.closeMapPopup()
    this.graphicsLayer.removeAll()
    this.makeGraphic(locResult)
    this.zoomToResult(locResult)
    this.setState({ showClear: true })
  }

  // ── Address search ─────────────────────────────────────────────────────────

  handleSearchBtnClick = () => {
    const view = this.getView()
    const address = (this.state.addressInputValue || '').trim()
    if (!view || !address || this.state.locating) return
    if (!this.geocode.singleLineFieldName) {
      this.showMessage(this.nls('locatorissue'), this.nls('locatorissuemessage'))
      return
    }
    const { config } = this.props
    this.beacon?.action('address-search', this.state.addSearchExtent ? 'extent' : 'all')
    this.clearResultsHandler(null, false)
    this.setState({ showProgress: true, locating: true, selTab: this.resultsTabOr(this.state.selTab) })
    const params: any = {
      address: { [this.geocode.singleLineFieldName]: address },
      outFields: ['Loc_name', 'Score', 'Addr_type', 'X', 'Y', 'DisplayX', 'DisplayY', 'LongLabel', 'ExInfo'],
      outSpatialReference: view.spatialReference
    }
    if (config.locator?.countryCode) params.countryCode = config.locator.countryCode
    if (this.state.addSearchExtent && this.state.showExtentCbx) params.searchExtent = view.extent
    locator.addressToLocations(this.geocode.url, params).then(this.addresslocateResult, this.onSearchError)
  }

  addresslocateResult = async (addresses: AddressCandidate[]) => {
    if (!this.isMounted) return
    const candidates = (addresses || []).filter(c => c && c.score >= this.minscore)
    if (candidates.length === 0) {
      // Before 2026 this path left the spinner running when every candidate scored below the
      // minimum, and never showed "No Results Found" because the Results tab did not open.
      this.setState({
        showProgress: false,
        locating: false,
        resultMessage: this.nls('noresultsfoundlabel'),
        selTab: this.state.selTab
      })
      if (!this.tabsEnabled().result) this.showMessage('', this.nls('noresultsfoundlabel'))
      return
    }
    try {
      const results = await Promise.all(candidates.map((c, i) => this.createLocateResults(c, i).catch((e) => {
        console.info('eLocate: skipped a candidate', e)
        return null
      })))
      if (!this.isMounted) return
      const good = results.filter(Boolean) as listItem[]
      if (good.length === 0) {
        this.geometryService_faultHandler(new Error('no candidate could be projected'))
        return
      }
      good.forEach(r => this.makeGraphic(r))
      good[0].selected = true
      this.resultListRecords = good
      this.setState({
        resultListCnt: good.length,
        showClear: true,
        showProgress: false,
        locating: false,
        resultMessage: this.foundMessage(good.length),
        selTab: this.resultsTabOr(this.state.selTab)
      })
      this.zoomToResult(good[0])
    } catch (err) {
      this.onSearchError(err)
    }
  }

  createLocateResults = async (addrCandidate: AddressCandidate, i: number): Promise<listItem> => {
    const view = this.getView()
    const att: any = addrCandidate.attributes || {}
    const title = addrCandidate.address ? String(addrCandidate.address) : att.Street ? String(att.Street) : this.nls('_widgetLabel')
    let pnt: Point = addrCandidate.location as Point
    if (att.DisplayX !== undefined && att.DisplayY !== undefined && att.DisplayX !== null && att.DisplayY !== null) {
      // DisplayX/DisplayY is the rooftop point; X/Y can sit on the street centerline. The locator
      // returns them in the requested outSpatialReference (the map's), the same system as the
      // location. The 1.9 code always read them as WGS84, which only worked on a WGS84 map: on a
      // UTM or state plane map the numbers were read as degrees and the result landed at a pole.
      // Take the location's system unless the numbers can only be degrees.
      const dx = Number(att.DisplayX)
      const dy = Number(att.DisplayY)
      const locSR: any = (addrCandidate.location as any)?.spatialReference || view.spatialReference
      const locIsDegrees = !!locSR?.isGeographic || locSR?.wkid === 4326
      const looksLikeDegrees = Math.abs(dx) <= 180 && Math.abs(dy) <= 90
      if (isFinite(dx) && isFinite(dy)) {
        pnt = new Point({ x: dx, y: dy, spatialReference: (locIsDegrees || !looksLikeDegrees) ? locSR : new SpatialReference({ wkid: 4326 }) })
      }
    }
    const mapPoint = await this.toSR(pnt, view.spatialReference as any)
    const score = addrCandidate.score % 1 === 0 ? addrCandidate.score : addrCandidate.score.toFixed(1)
    const lines = await this.coordinateLines(mapPoint)
    return {
      title: title,
      content: `<em>${this.nls('score')}</em>: ${score}${lines ? '<br>' + lines : ''}`,
      type: locateType.address,
      point: mapPoint,
      id: `${locateType.address}_id_${i}`
    }
  }

  onSearchError = (error) => {
    console.debug(error)
    this.beacon?.error(error, 'address-search')
    this.clearResultsHandler(null, false)
    this.setState({ selTab: this.defaultTab() })
    this.showMessage('', this.nls('searchError'))
  }

  // ── Coordinates ────────────────────────────────────────────────────────────

  /** X and Y box labels for an xy unit: the builder's, else Longitude/Latitude or X/Y by the system. */
  xyLabels = (unit: pointunit): { x: string, y: string } => {
    const geographic = (unit.wkid || unit.wkt) ? coords.isGeographicUnit(unit) : !!(this.getView()?.spatialReference as any)?.isGeographic
    return {
      x: unit.xlabel || this.nls(geographic ? 'xLabelGeo' : 'xLabelProj'),
      y: unit.ylabel || this.nls(geographic ? 'yLabelGeo' : 'yLabelProj')
    }
  }

  /**
   * The example is the middle of the map in the chosen format, so it always belongs to wherever
   * the user is looking: pan to another town or country and it follows. It refreshes when the map
   * stops moving, and only while the Coordinates tab is showing.
   */
  watchMapForExample = (view: any) => {
    this.exampleWatchHandle?.remove()
    if (!view) return
    this.exampleWatchHandle = reactiveUtils.watch(
      () => view.stationary,
      (stationary: boolean) => {
        if (stationary && this.isMounted && this.state.selTab === 'coordslabel') this.refreshExample()
      }
    )
  }

  /** Refresh the clickable example: the builder's fixed one, or the map center in this unit's format. */
  refreshExample = async (unit = this.selectedUnit()): Promise<void> => {
    if (!unit) return
    const request = ++this.exampleRequest
    if (unit.example) {
      if (unit.format === 'xy') {
        const [x, y] = unit.example.split(',').map(v => (v || '').trim())
        this.setState({ exampleX: x || '', exampleY: y || '', exampleSingle: '' })
      } else {
        this.setState({ exampleX: '', exampleY: '', exampleSingle: unit.example })
      }
      return
    }
    const view = this.getView()
    if (!view?.center) return
    try {
      const ex = await coords.exampleFor(unit, view.center as Point)
      if (!this.isMounted || request !== this.exampleRequest || !ex) return
      this.setState({ exampleX: ex.x || '', exampleY: ex.y || '', exampleSingle: ex.single || '' })
    } catch (e) {
      console.info('eLocate: no example for this unit', e)
    }
  }

  prelocateCoords = async () => {
    const view = this.getView()
    if (!view || this.state.locating) return
    const unit = this.selectedUnit()
    if (!unit) return
    const isXY = unit.format === 'xy'
    const rawX = (this.state.xValue || '').trim()
    const rawY = (this.state.yValue || '').trim()
    const rawSingle = (this.state.singleValue || '').trim()
    if (isXY ? (!rawX || !rawY) : !rawSingle) return
    this.beacon?.action('coordinate-locate', unit.format)
    this.clearResultsHandler(null, false)
    this.setState({ showProgress: true, locating: true })
    try {
      const mapPoint = await coords.parseUnitInput(unit, rawX, rawY, rawSingle, view.spatialReference as any, view.extent)
      if (!this.isMounted) return
      if (!mapPoint) {
        this.setState({ showProgress: false, locating: false })
        this.showMessage(this.nls('coordslabel'), this.nls('coordsInvalid'))
        return
      }
      const typed = isXY ? `${rawX}, ${rawY}` : rawSingle
      const lines = await this.coordinateLines(mapPoint)
      const li: listItem = {
        title: this.nls('coordslabel'),
        content: `<em>${this.nls('location')}</em>: ${typed}${lines ? '<br>' + lines : ''}`,
        type: locateType.coordinate,
        point: mapPoint,
        id: `${locateType.coordinate}_id_1`,
        selected: true
      }
      this.resultListRecords = [li]
      this.showLocation(li)
      this.setState({
        resultListCnt: 1,
        resultMessage: this.foundMessage(1),
        showProgress: false,
        showClear: true,
        locating: false,
        selTab: this.resultsTabOr(this.state.selTab)
      })
    } catch (err) {
      if (err instanceof coords.OutOfAreaError) {
        this.setState({ showProgress: false, locating: false })
        this.showMessage(this.nls('coordslabel'), this.nls('coordsOutOfAreaInput'))
        return
      }
      this.geometryService_faultHandler(err)
    }
  }

  handleOnUnitsChange = (evt) => {
    const value = evt?.target?.value
    const unit = this.units().find(u => u.name === value)
    if (!unit) return
    this.setState({ selectedUnits: value, xValue: '', yValue: '', singleValue: '', exampleX: '', exampleY: '', exampleSingle: '' })
    this.refreshExample(unit)
  }

  getUnitsOptions = (): React.JSX.Element[] => {
    return this.units().map((unit, index) => <option key={index} value={unit.name}>{this.unitLabel(unit)}</option>)
  }

  addressValueChange = (evt) => { this.setState({ addressInputValue: evt?.target?.value ?? '' }) }

  xValueChange = (evt) => { this.setState({ xValue: evt?.target?.value ?? '' }) }

  yValueChange = (evt) => { this.setState({ yValue: evt?.target?.value ?? '' }) }

  singleValueChange = (evt) => { this.setState({ singleValue: evt?.target?.value ?? '' }) }

  setExample = () => {
    const unit = this.selectedUnit()
    if (!unit) return
    if (unit.format === 'xy') this.setState({ xValue: this.state.exampleX, yValue: this.state.exampleY })
    else this.setState({ singleValue: this.state.exampleSingle })
  }

  // ── Address Inspector (reverse geocode) ────────────────────────────────────

  stopInspector = () => {
    this.viewClickHandler?.remove()
    this.viewClickHandler = null
    this.setMapCursor('default')
    this.setState({ revBtnActive: false })
  }

  handleRevGeocodeBtnClick = () => {
    const view = this.getView()
    if (!view) return
    if (this.state.revBtnActive) {
      this.stopInspector()
      return
    }
    this.setState({ revBtnActive: true })
    this.setMapCursor('crosshair')
    this.viewClickHandler = view.on('click', (event) => {
      event.stopPropagation()
      this.beacon?.action('inspect')
      const g = new Graphic({ geometry: event.mapPoint, symbol: this.pointSymbol })
      this.drawLayer.removeAll()
      this.drawLayer.add(g)
      locator.locationToAddress(this.geocode.url, { location: event.mapPoint, outSpatialReference: view.spatialReference })
        .then(this.rlocateResult, this.locateError)
      if (!this.props.config.keepinspectoractive) this.stopInspector()
    })
  }

  locateError = (info) => {
    console.error(info)
    this.drawLayer?.removeAll()
    if (!this.props.config.keepinspectoractive) this.stopInspector()
    this.showMessage(this.nls('reversegeocodefailtitle'), this.nls('reversegeocodefailmsg'))
  }

  rlocateResult = async (candidate: AddressCandidate) => {
    if (!this.isMounted) return
    this.clearResultsHandler(null, false)
    try {
      const result = await this.createAddressInspectorResult(candidate)
      if (!this.isMounted) return
      result.selected = true
      this.resultListRecords = [result]
      this.showLocation(result)
      this.setState({
        resultListCnt: 1,
        resultMessage: this.foundMessage(1),
        selTab: this.resultsTabOr(this.state.selTab)
      })
    } catch (err) {
      this.geometryService_faultHandler(err)
    }
  }

  createAddressInspectorResult = async (addrCandidate: AddressCandidate): Promise<listItem> => {
    const view = this.getView()
    const att: any = addrCandidate.attributes || {}
    const sAdd = addrCandidate.address
    const title = sAdd ? String(sAdd) : att.Street ? String(att.Street) : this.nls('_widgetLabel')
    const mapPoint = await this.toSR(addrCandidate.location as Point, view.spatialReference as any)
    const lines = await this.coordinateLines(mapPoint)
    return {
      title: title,
      content: `<em>${this.nls('address')}</em>: ${sAdd}${lines ? '<br>' + lines : ''}`,
      type: locateType.reverse,
      point: mapPoint,
      id: `${locateType.reverse}_id_1`
    }
  }

  // ── Locator ────────────────────────────────────────────────────────────────

  initLocator = () => {
    const { config } = this.props
    this.geocode = { url: config.locator?.url || DEFAULT_LOCATOR, singleLineFieldName: '', version: undefined }
    this.getLocatorInfo(this.geocode).then((ok) => {
      if (!this.isMounted) return
      if (ok) {
        this.setState({ locatorFailed: false, showExtentCbx: !(this.geocode.version < 10.1) })
      } else {
        this.setState({ locatorFailed: true })
        this.showMessage(this.nls('locatorissue'), this.nls('locatorissuemessage'))
      }
    })
  }

  getLocatorInfo = (geocode: Geocode): Promise<boolean> => {
    return esriRequest(geocode.url, {
      responseType: 'json',
      query: { f: 'json' },
      timeout: 10000
    }).then(response => {
      const data: any = response?.data || {}
      if (data.singleLineAddressField && data.singleLineAddressField.name) {
        this.geocode.singleLineFieldName = data.singleLineAddressField.name
        this.geocode.version = data.currentVersion
        this.serviceWKID = data.spatialReference?.wkid
        return true
      }
      console.warn(geocode.url + ' has no singleLineAddressField')
      return false
    }, (err) => {
      console.error(err)
      this.beacon?.error(err, 'locator-info')
      return false
    })
  }

  AddSearchExtentChange = (evt) => {
    const target = evt.currentTarget
    if (!target) return
    this.setState({ addSearchExtent: target.checked })
  }

  // ── Messages ───────────────────────────────────────────────────────────────

  showMessage = (title: string, body: string) => {
    if (!this.isMounted) return
    this.setState({ messageTitle: title, messageBody: body, messageOpen: true })
  }

  handlmessageOK = () => {
    this.setState({ messageOpen: false })
  }

  /** Alt + click anywhere in the widget shows the version dialog (Robert's original feature). */
  onRootClick = (evt: React.MouseEvent<HTMLDivElement>) => {
    if (!evt.altKey) return
    const manifest: any = this.props.manifest || {}
    const body = `${this.nls('widgetverstr')}: ${manifest.version}\n${this.nls('wabversionmsg')}: ${manifest.exbVersion}\n\n${manifest.description}`
    this.showMessage(this.nls('widgetversion'), body)
  }

  // ── In-widget help guide (shared pattern, see WIDGETHANDOFF Section 10) ────
  // Class component, so strings are read from defaultMessages directly and passed to
  // HelpPopup / FirstRunHint as props. Those two function components own the theme hook.

  /** Translate helper for the guide. Fills {tokens} with the values supplied. */
  t = (id: string, values?: Record<string, string>): string => {
    let text: string = (defaultMessages as any)[id] ?? id
    if (values) {
      Object.keys(values).forEach((k) => { text = text.split(`{${k}}`).join(values[k]) })
    }
    return text
  }

  /** Storage key for the first-run hint dismissal, namespaced by widget id so two copies in one app do not share it. */
  get firstRunHintKey (): string {
    return `eLocate.helpHintDismissed.${this.props.id}`
  }

  readHintDismissed (): boolean {
    try {
      return typeof window !== 'undefined' && !!window.localStorage && window.localStorage.getItem(this.firstRunHintKey) === '1'
    } catch (_) {
      // Private browsing can throw on read; the guide is not worth breaking the widget over.
      return false
    }
  }

  dismissFirstRunHint = (): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) window.localStorage.setItem(this.firstRunHintKey, '1')
    } catch (_) { /* private browsing */ }
    if (this.isMounted) this.setState({ showFirstRunHint: false })
  }

  /** Opening the guide counts as answering the hint, so it dismisses the hint too. */
  openHelp = (): void => {
    if (this.state.showFirstRunHint) this.dismissFirstRunHint()
    this.beacon?.action('help')
    if (this.isMounted) this.setState({ helpOpen: true })
  }

  closeHelp = (): void => {
    if (this.isMounted) this.setState({ helpOpen: false })
  }

  /**
   * Feature flags for the guide, computed with the same checks render() uses for each
   * control, so the guide never describes something that is not on screen.
   */
  helpFeatures (): HelpFeatures {
    const { config } = this.props
    const on = this.tabsEnabled()
    const units = this.units()
    return {
      mapConnected: this.props.useMapWidgetIds?.length === 1,
      addressTab: on.address,
      coordinateTab: on.coordinate,
      inspectorTab: on.reverse,
      resultsTab: on.result,
      locatorFailed: this.state.locatorFailed,
      limitExtent: on.address && this.state.showExtentCbx,
      severalUnits: units.length > 1,
      xyUnits: units.some(u => u.format === 'xy'),
      latLonUnits: units.some(u => isLatLonFormat(u.format)),
      gridUnits: units.some(u => isGridFormat(u.format)),
      keepInspector: config.keepinspectoractive === true,
      autoClose: this.autoCloseNum !== Number.NEGATIVE_INFINITY,
      // Names as the widget shows them, minus a trailing colon or full stop so they read inside a sentence.
      labels: {
        address: defaultMessages.addresslabel,
        coordinates: defaultMessages.coordslabel,
        inspector: defaultMessages.addressinsplabel,
        results: defaultMessages.resultslabel,
        locate: defaultMessages.locate,
        clear: defaultMessages.clear,
        units: defaultMessages.coordUnitLbl.replace(/[:.]\s*$/, ''),
        example: defaultMessages.example.replace(/[:.]\s*$/, ''),
        limit: defaultMessages.limittomapextent.replace(/[:.]\s*$/, ''),
        inspectButton: defaultMessages.revgeocodetip
      }
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  render () {
    const {
      messageOpen, messageTitle, messageBody, showBusy, selectedUnits,
      xValue, yValue, singleValue, exampleX, exampleY, exampleSingle, revBtnActive, showClear, addressInputValue, showProgress,
      addSearchExtent, showExtentCbx, resultMessage, locating, helpOpen, showFirstRunHint
    } = this.state
    const { config, theme } = this.props
    const on = this.tabsEnabled()
    const anyInputTab = on.address || on.coordinate || on.reverse
    const mapConnected = this.props.useMapWidgetIds?.length === 1
    const showHelp = config.showHelp !== false
    const selTab = this.isTabOn(this.state.selTab, on) ? this.state.selTab : this.defaultTab()
    const unit = this.selectedUnit()
    const isXY = unit?.format === 'xy'
    const labels = unit && isXY ? this.xyLabels(unit) : { x: '', y: '' }
    const exampleText = isXY ? (exampleX && exampleY ? `${exampleX}, ${exampleY}` : '') : exampleSingle

    const tabDefs: Array<{ id: TabId, label: string }> = [
      ...(on.address ? [{ id: 'addresslabel' as TabId, label: this.nls('addresslabel') }] : []),
      ...(on.coordinate ? [{ id: 'coordslabel' as TabId, label: this.nls('coordslabel') }] : []),
      ...(on.reverse ? [{ id: 'addressinsplabel' as TabId, label: this.nls('addressinsplabel') }] : []),
      ...(on.result ? [{ id: 'resultslabel' as TabId, label: this.nls('resultslabel') }] : [])
    ]

    const clearButton = showClear && (
      <Button type='tertiary' size='sm' style={{ float: 'right', marginRight: '10px' }}
        onClick={(e) => { this.clearResultsHandler(e, true) }}>{this.nls('clear')}</Button>
    )

    let body: React.ReactNode
    if (!mapConnected) {
      body = <div className='elocate-notice' role='status'>{this.nls('noMapConnected')}</div>
    } else if (!anyInputTab) {
      body = <div className='elocate-notice' role='status'>{this.nls('noTabsEnabled')}</div>
    } else {
      body = (
        <React.Fragment>
          {showBusy &&
            <div className='light-100' role='status' aria-live='polite'
              aria-label={this.nls('loading')} style={{ width: '100%', height: '100%' }}>
              <div className='jimu-secondary-loading'></div>
            </div>
          }
          <div className={showBusy ? 'hideTabs' : 'showTabs'}>
            {/* Own tab bar instead of jimu-ui Tabs: jimu-ui squeezed the four labels to "Addre..."
                at normal widget widths. Each tab keeps its full label and the row wraps if needed. */}
            <div className='elocate-tabs' role='tablist' aria-label={this.nls('_widgetLabel')}>
              {tabDefs.map((tb) => {
                const active = selTab === tb.id
                return (
                  <button key={tb.id} type='button' role='tab'
                    id={`${tb.id}-tab-${this.props.id}`}
                    aria-selected={active}
                    aria-controls={`${tb.id}-panel-${this.props.id}`}
                    tabIndex={active ? 0 : -1}
                    disabled={!this.isTabOn(tb.id)}
                    className={`elocate-tab${active ? ' active' : ''}`}
                    onClick={() => { this.onTabSelect(tb.id) }}
                    onKeyDown={this.onTabKeyDown}>
                    {tb.label}
                  </button>
                )
              })}
            </div>
            <div className='elocate-tab-content'>
              {on.address && selTab === 'addresslabel' &&
                <div role='tabpanel' id={`addresslabel-panel-${this.props.id}`} aria-labelledby={`addresslabel-tab-${this.props.id}`} className='elocate-panel'>
                  <div style={{ width: '100%', height: '100%', padding: '10px' }}>
                    {clearButton}
                    <Label for={`eloc-address-input-${this.props.id}`}>{this.nls('locateDescLabel')}</Label>
                    <TextInput id={`eloc-address-input-${this.props.id}`} size='sm' style={{ width: '100%' }} onChange={this.addressValueChange}
                      aria-label={this.nls('locateDescLabel')}
                      value={addressInputValue} onKeyDown={(e) => { if (e.key === 'Enter') { this.handleSearchBtnClick() } }} />
                    <div className='d-flex' style={{ margin: '0.5rem 0', flexWrap: 'wrap', gap: '6px' }}>
                      <div style={{ flexGrow: 1 }}>
                        {showExtentCbx &&
                          <Label style={{ cursor: 'pointer' }} className='d-flex align-items-center m-0'>
                            <Checkbox checked={addSearchExtent} style={{ cursor: 'pointer' }} onChange={this.AddSearchExtentChange} />
                            <span className='ml-2'>{this.nls('limittomapextent')}</span>
                          </Label>
                        }
                      </div>
                      <div>
                        <Button size='lg' type='primary' disabled={!addressInputValue.trim() || locating}
                          onClick={() => { this.handleSearchBtnClick() }}>{this.nls('locate')}</Button>
                      </div>
                    </div>
                  </div>
                </div>
              }
              {on.coordinate && selTab === 'coordslabel' &&
                <div role='tabpanel' id={`coordslabel-panel-${this.props.id}`} aria-labelledby={`coordslabel-tab-${this.props.id}`} className='elocate-panel'>
                  <div style={{ width: '100%', height: '100%', padding: '10px' }}>
                    {clearButton}
                    <Label>{this.nls('coordDescLabel')}</Label>
                    <div className='d-flex m-2'>
                      <Label for={`eloc-units-select-${this.props.id}`} style={{ width: '90px', lineHeight: '32px', flexShrink: 0 }}>{this.nls('coordUnitLbl') + ' '}</Label>
                      <Select id={`eloc-units-select-${this.props.id}`} aria-label={this.nls('coordUnitLbl')}
                        style={{ display: 'inline-block', flex: 1, minWidth: 0 }} onChange={this.handleOnUnitsChange}
                        className='top-drop' value={selectedUnits}>
                        {this.getUnitsOptions()}
                      </Select>
                    </div>
                    {unit && isXY &&
                      <React.Fragment>
                        <div className='d-flex m-2'>
                          <Label for={`eloc-x-input-${this.props.id}`} style={{ width: '90px', lineHeight: '32px', flexShrink: 0 }}>{labels.x}</Label>
                          <TextInput id={`eloc-x-input-${this.props.id}`} aria-label={labels.x} placeholder={exampleX}
                            style={{ display: 'inline-block', flex: 1, minWidth: 0 }} value={xValue}
                            onChange={this.xValueChange}
                            onKeyDown={(e) => { if (e.key === 'Enter') { this.prelocateCoords() } }} />
                        </div>
                        <div className='d-flex m-2'>
                          <Label for={`eloc-y-input-${this.props.id}`} style={{ width: '90px', lineHeight: '32px', flexShrink: 0 }}>{labels.y}</Label>
                          <TextInput id={`eloc-y-input-${this.props.id}`} aria-label={labels.y} placeholder={exampleY}
                            style={{ display: 'inline-block', flex: 1, minWidth: 0 }} value={yValue}
                            onChange={this.yValueChange}
                            onKeyDown={(e) => { if (e.key === 'Enter') { this.prelocateCoords() } }} />
                        </div>
                      </React.Fragment>
                    }
                    {unit && !isXY &&
                      <div className='m-2'>
                        <Label for={`eloc-single-input-${this.props.id}`} className='d-block'>{this.formatName(unit.format) + ':'}</Label>
                        <TextInput id={`eloc-single-input-${this.props.id}`} aria-label={this.formatName(unit.format)} placeholder={exampleSingle}
                          style={{ width: '100%' }} value={singleValue}
                          onChange={this.singleValueChange}
                          onKeyDown={(e) => { if (e.key === 'Enter') { this.prelocateCoords() } }} />
                      </div>
                    }
                    {exampleText &&
                      <div className='d-flex m-2'>
                        <span style={{ width: '90px', flexShrink: 0 }}>{this.nls('example')}</span>
                        <Button type='link' style={{ display: 'inline-block', flex: 1, minWidth: 0, textAlign: 'left', padding: 0, whiteSpace: 'normal' }}
                          title={this.nls('exampleClick')} aria-label={this.nls('exampleClick') + ': ' + exampleText}
                          onClick={this.setExample}>{exampleText}</Button>
                      </div>
                    }
                    <div className='d-flex m-2'>
                      <div style={{ flexGrow: 1 }}></div>
                      <div>
                        <Button size='lg' type='primary' disabled={!unit || locating || (isXY ? (!xValue?.trim() || !yValue?.trim()) : !singleValue?.trim())}
                          onClick={() => { this.prelocateCoords() }}>{this.nls('locate')}</Button>
                      </div>
                    </div>
                  </div>
                </div>
              }
              {on.reverse && selTab === 'addressinsplabel' &&
                <div role='tabpanel' id={`addressinsplabel-panel-${this.props.id}`} aria-labelledby={`addressinsplabel-tab-${this.props.id}`} className='elocate-panel'>
                  <div style={{ width: '100%', height: '100%', padding: '10px' }}>
                    <p>{this.nls('reverseDescLabel')}</p>
                    <div className='revGeocodeDiv'>
                      <Button size='sm' type={revBtnActive ? 'primary' : 'default'} active={revBtnActive} icon
                        aria-label={this.nls('revgeocodetip')} aria-pressed={revBtnActive}
                        onClick={this.handleRevGeocodeBtnClick} title={this.nls('revgeocodetip')}>
                        <CalciteIcon icon='pin' scale='s' />
                      </Button>
                    </div>
                  </div>
                </div>
              }
              {on.result && selTab === 'resultslabel' &&
                <div role='tabpanel' id={`resultslabel-panel-${this.props.id}`} aria-labelledby={`resultslabel-tab-${this.props.id}`} className='elocate-panel'>
                  <div className='d-flex flex-column' style={{ width: '100%', height: '100%', padding: '10px' }}>
                    <div className='pro-bar-container' role='progressbar' aria-label={this.nls('locating')}
                      aria-valuetext={this.nls('locating')} style={{ display: showProgress ? 'block' : 'none' }}>
                      <div className='pro-bar pro-bar-width' data-pro-bar-percent='100'>
                        <div className='pro-bar-candy'></div>
                      </div>
                    </div>
                    <div className='d-flex flex-row justify-content-between'>
                      <div style={{ lineHeight: '33px' }} role='status' aria-live='polite'>{resultMessage}</div>
                      {clearButton}
                    </div>
                    <div className='elocate-list'>
                      <List items={this.resultListRecords} removeResultMsg={this.nls('removeresultmessage')}
                        onRecordClick={this.onRecordClick}
                        onRecordRemoveClick={(e) => { this.onRecordRemoveClick(e) }}
                        onRecordMouseOver={this.onRecordMouseOver}
                        onRecordMouseOut={this.onRecordMouseOut} />
                    </div>
                  </div>
                </div>
              }
            </div>
          </div>
        </React.Fragment>
      )
    }

    return (
      <div className='widget-elocate jimu-widget' css={getStyle(theme, config)} onClick={this.onRootClick}>
        <Modal className={classNames('d-flex justify-content-center')} isOpen={messageOpen} centered={true} toggle={this.handlmessageOK}>
          <ModalHeader toggle={this.handlmessageOK}>{messageTitle}</ModalHeader>
          <ModalBody className='text-break' style={{ whiteSpace: 'pre-wrap' }}>
            {messageBody}
          </ModalBody>
          <ModalFooter>
            <Button type='primary' onClick={this.handlmessageOK}>
              {this.nls('ok')}
            </Button>
          </ModalFooter>
        </Modal>
        {mapConnected && (
          <JimuMapViewComponent
            useMapWidgetId={this.props.useMapWidgetIds?.[0]}
            onActiveViewChange={this.activeViewChangeHandler}
          />
        )}

        {/* Header row: Help button at the top right (shared help pattern). */}
        {showHelp && (
          <div className='elocate-header'>
            <Button size='sm' type='tertiary' icon onClick={this.openHelp} title={this.t('helpTitle')} aria-label={this.t('helpTitle')} style={{ flexShrink: 0 }}>
              <CalciteIcon icon='question' scale='s' />
            </Button>
          </div>
        )}
        {showHelp && showFirstRunHint && (
          <FirstRunHint
            title={this.t('firstRunTitle')}
            body={this.t('firstRunBody')}
            linkLabel={this.t('firstRunHelpLink')}
            dismissLabel={this.t('firstRunDismiss')}
            onOpenHelp={this.openHelp}
            onDismiss={this.dismissFirstRunHint}
          />
        )}

        <div className='elocate-body'>
          {body}
        </div>

        {showHelp && (
          <HelpPopup
            open={helpOpen}
            onClose={this.closeHelp}
            sections={buildHelpSections(this.t, this.helpFeatures())}
            title={this.t('helpTitle')}
            intro={this.t('helpIntro')}
            searchPlaceholder={this.t('helpSearchPlaceholder')}
            noMatches={this.t('helpNoMatches')}
            closeLabel={this.t('close')}
          />
        )}
      </div>
    )
  }
}
