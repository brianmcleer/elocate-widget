/**
  Licensing

  Copyright 2020 Esri

  Licensed under the Apache License, Version 2.0 (the "License"); You
  may not use this file except in compliance with the License. You may
  obtain a copy of the License at
  http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
  implied. See the License for the specific language governing
  permissions and limitations under the License.

  A copy of the license is available in the repository's
  LICENSE file.

  Enhanced Locate settings by Robert Scheitlin (2022), built on Esri's sample code above.
  Modified 2026 by the City of Grand Junction GIS Division: coordinate precision 0 is kept,
  the tab switches keep Initial View valid, theme reads are guarded for Experience Builder
  1.21, and a Show help guide option was added. See CHANGES.md.
*/
/** @jsx jsx */
import {React, jsx, urlUtils, polished, loadArcGISJSAPIModules, defaultMessages as jimuCoreMessages, Immutable} from 'jimu-core'
import {AllWidgetSettingProps} from 'jimu-for-builder'
import { TextArea, TextInput, defaultMessages as jimuiDefaultMessage, Select, Checkbox, Button, Switch, NumericInput} from 'jimu-ui'
import {IMConfig, locateType} from '../config';
import defaultMessages from '../runtime/translations/default'
import settingsDefaultMessages from './translations/default'
import { WarningOutlined } from 'jimu-icons/outlined/suggested/warning'
import {MapWidgetSelector, SettingSection, SettingRow} from 'jimu-ui/advanced/setting-components'
import { getStyleForWidget } from './style'
import CoordUnitItem from './coordUnit-item'
import {
  STD_KEYS, STD_NAME_KEY, StdKey, DEFAULT_TAB_KEYS, DEFAULT_RESULT_KEYS, DEFAULT_DD_DECIMALS, DEFAULT_XY_DECIMALS,
  hasLegacyUnits, splitUnits, buildUnits, splitResults, buildResults, srKey
} from '../unitUtils'
import type { pointunit } from '../config'
import { PlusOutlined } from 'jimu-icons/outlined/editor/plus'
const DefaultGeocodeURL: string = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer';
const PinEsriOutlined2 = require('jimu-icons/svg/outlined/gis/pin-esri.svg')

export interface widgetSettingsState{
  geocodeURL: string
  urlCheckResult: UrlCheckResult
  isHadEnterGeocodeUrl: boolean
  countryCode: string
  initialView: locateType
  autoClose: number
  zoomScale: number
  forceScale: boolean
  keepInspectorActive: boolean
  limit2ViewExtent: boolean
  /** A new custom X and Y card with no WKID yet (nothing is saved until the WKID is). */
  pendingCustom: boolean
  addressDisabled: boolean
  coordinateDisabled: boolean
  reverseDisabled: boolean
  resultDisabled: boolean
  noVisibleTabs: boolean
}

enum UrlCheckResultType {
  Pass = 'Pass',
  NotHttps = 'Not_Https',
  InvalidURL = 'Invalid_URL'
}

interface UrlCheckResult {
  urlCheckResultType: UrlCheckResultType
  singleLineFieldName?: string
}

export default class Setting extends React.PureComponent<AllWidgetSettingProps<IMConfig>, widgetSettingsState>{
  constructor (props) {
    super(props)
    const {config} = this.props;
    this.state = {
      geocodeURL: config?.locator?.url,
      urlCheckResult: {urlCheckResultType: UrlCheckResultType.Pass},
      isHadEnterGeocodeUrl: false,
      countryCode: config?.locator?.countryCode,
      initialView: config?.initialView || locateType.address,
      autoClose: (config?.autoClosePopup /1000),
      zoomScale: config?.zoomscale,
      forceScale: config?.forcescale || false,
      keepInspectorActive: config?.keepinspectoractive || false,
      limit2ViewExtent: config?.limitsearchtoviewextentbydefault || false,
      pendingCustom: false,
      addressDisabled: config?.disabledtabs?.indexOf('address') > -1 || false,
      coordinateDisabled: config?.disabledtabs?.indexOf('coordinate') > -1 || false,
      reverseDisabled: config?.disabledtabs?.indexOf('reverse') > -1 || false,
      resultDisabled: config?.disabledtabs?.indexOf('result') > -1 || false,
      noVisibleTabs: ['address', 'coordinate', 'reverse'].every(n => config?.disabledtabs?.indexOf(n) > -1)
    }
    // (1.9 wrote a default coordinatePrecision here with a "!value" test, which also caught 0 and
    // reset a precision of 0 to 2 every time the panel opened. Result formats replace it.)
    this.validateGeocodeService(config?.locator?.url).then((urlCheckResult) => {
      !this.state.isHadEnterGeocodeUrl && this.setState({isHadEnterGeocodeUrl:true})
      this.setState({
        urlCheckResult: {urlCheckResultType: urlCheckResult?.urlCheckResultType}
      });
    }).catch(err => {
      this.setState({urlCheckResult: {urlCheckResultType: UrlCheckResultType.InvalidURL}});
    })
  }
  
  onMapWidgetSelected = (useMapWidgetsId: string[]) => {
    this.props.onSettingChange({
        id: this.props.id,
        useMapWidgetIds: useMapWidgetsId
    });
  }

  onGeocodeUrlChange = (e) => {
    const value = e.target.value;
    this.setState({geocodeURL: value});
    this.validateGeocodeService(value).then((urlCheckResult) => {
      !this.state.isHadEnterGeocodeUrl && this.setState({isHadEnterGeocodeUrl:true})
      this.setState({
        urlCheckResult: {urlCheckResultType: urlCheckResult?.urlCheckResultType}
      });
    }).catch(err => {
      this.setState({urlCheckResult: {urlCheckResultType: UrlCheckResultType.InvalidURL}});
    })
  }

  onGeocodeUrlInputBlur = (e) => {
    const value = e.target.value;
    this.validateGeocodeService(value).then((urlCheckResult) => {
      if (urlCheckResult?.urlCheckResultType === UrlCheckResultType.Pass) {
        this.setState({urlCheckResult: {urlCheckResultType: urlCheckResult?.urlCheckResultType}});
        this.updateGeocodeUrl(value, urlCheckResult?.singleLineFieldName)
      } else if (this.state.geocodeURL) {
        this.setState({
          urlCheckResult: {urlCheckResultType: UrlCheckResultType.Pass},
          geocodeURL: this.state.geocodeURL
        });
      }
    }).catch(err => {
      this.setState({
        urlCheckResult: {urlCheckResultType: UrlCheckResultType.Pass},
        geocodeURL: this.state.geocodeURL
      });
    })
  }

  updateGeocodeUrl = (geocodeServiceUrl: string, singleLineFieldName: string) => {
    const { config } = this.props
    let locator = config.locator.asMutable({ deep: true })
    locator.url = geocodeServiceUrl;
    locator.singleLineFieldName = singleLineFieldName;
    this.onPropertyChange('locator', locator)
  }

  validateGeocodeService = async (geocodeServiceUrl: string): Promise<UrlCheckResult> => {
    const httpsRex = '^(([h][t]{2}[p][s])?://)'
    const urlRegExString = new RegExp(httpsRex)
    if (geocodeServiceUrl && urlRegExString.test(geocodeServiceUrl)) {
      try {
        return loadArcGISJSAPIModules(['esri/request']).then(modules => {
          const [esriRequest] = modules
          return esriRequest(geocodeServiceUrl, {
            query: {
              f: 'json'
            },
            responseType: 'json'
          }).then(res => {
            const result = res?.data || {}
            if (result?.capabilities) {
              const singleLineAddressField = result?.singleLineAddressField || {}
              return Promise.resolve({ urlCheckResultType: UrlCheckResultType.Pass, singleLineFieldName: singleLineAddressField?.name })
            } else {
              return Promise.resolve({ urlCheckResultType: UrlCheckResultType.InvalidURL } as UrlCheckResult)
            }
          })
        })
      } catch (e) {
        return Promise.resolve({ urlCheckResultType: UrlCheckResultType.InvalidURL })
      }
    } else {
      return Promise.resolve({ urlCheckResultType: UrlCheckResultType.NotHttps })
    }
  }

  handleCCChange = (event) => {
    const { config } = this.props
    let locator = config.locator.asMutable({ deep: true })
    const value = event?.target?.value
    this.setState({countryCode: value})
    locator.countryCode = value
    this.onPropertyChange('locator', locator)
  }

  handleCCAccept = value => {
    if (value) {
      this.setState({countryCode: value?.trim()});
    }
  }

  onInitialViewChange = (event) => {
    const value = event?.target?.value
    this.setState({initialView: value})
    this.onPropertyChange('initialView', value)
  }

  onAutoClosePopupChange = (event) => {
    const value = event?.target?.value
    this.setState({autoClose: value})

    const n = parseInt(String(value ?? ''), 10)
    if(value === "" || isNaN(n) || n <= 0){
      let eConfig = Immutable(this.props.config).asMutable({ deep: true })
      delete eConfig.autoClosePopup
      this.props.onSettingChange({
        id: this.props.id,
        config: eConfig
      })
    } else {
      this.onPropertyChange('autoClosePopup', n * 1000)
    }
  }

  onZoomScaleChange = (event) => {
    const value = event?.target?.value
    this.setState({zoomScale: value})
    const n = parseInt(String(value ?? ''), 10)
    if (!isNaN(n) && n > 0) this.onPropertyChange('zoomscale', n)
  }

  handleCheckboxChange = (evt) => {
    const target = evt.currentTarget
    if (!target) return
    let cstate = {}
    cstate[target.dataset.state] = target.checked
    this.setState(cstate)
    this.onPropertyChange(target.dataset.field, target.checked)
  }

  formatMessage = (id: string, values?: { [key: string]: any }) => {
    const messages = Object.assign({}, settingsDefaultMessages, defaultMessages, jimuiDefaultMessage, jimuCoreMessages)
    return this.props.intl.formatMessage({ id: id, defaultMessage: messages[id] }, values)
  }

  onPropertyChange = (name, value) => {
    const { config } = this.props
    if (value === config[name]) {
      return
    }
    const newConfig = config.set(name, value)
    const alterProps = {
      id: this.props.id,
      config: newConfig
    }
    this.props.onSettingChange(alterProps)
  }

  onDTabChanged = (checked, name): void => {
    const { config } = this.props
    const dTabs: string[] = (config?.disabledtabs?.asMutable({deep: true}) || []).filter(t => t !== name)
    if (checked) dTabs.push(name)
    const stateName = name + 'Disabled'
    // The widget cannot do anything with Address, Coordinates and Inspector all off.
    const noVisibleTabs = ['address', 'coordinate', 'reverse'].every(n => dTabs.indexOf(n) > -1)
    this.setState({ [stateName]: checked, noVisibleTabs } as any)

    let eConfig: any = Immutable(config).asMutable({ deep: true })
    if (dTabs.length === 0) {
      delete eConfig.disabledtabs
    } else {
      eConfig.disabledtabs = dTabs
    }
    // Keep Initial View on a tab that is still on. (The 1.9 fallback tested indexOf() as a
    // boolean, so -1 counted as true, and it never saved the new value to the config.)
    if (dTabs.indexOf(eConfig.initialView) > -1) {
      const nVal = [locateType.address, locateType.coordinate, locateType.reverse].find(v => dTabs.indexOf(v) === -1) || null
      eConfig.initialView = nVal
      this.setState({ initialView: nVal })
    }
    this.props.onSettingChange({
      id: this.props.id,
      config: Immutable(eConfig)
    })
  }

  // ── Coordinates: standard formats and custom X and Y systems ─────────────────
  //
  // The panel shows one table of the standard formats (Coordinates tab and Results columns),
  // two decimal settings, and a card per custom X and Y system. Everything is written through
  // writeCoords(), which saves pointunits and resultFormats in the current shape and drops the
  // pre-1.21 coordinateWKID and coordinatePrecision.

  coordModel = () => {
    const units = splitUnits(this.props.config.pointunits)
    const results = splitResults(this.props.config)
    return { tab: units.std, custom: units.custom, res: results.std, resKeys: results.customKeys, dd: results.ddDecimals, xy: results.xyDecimals }
  }

  writeCoords = (m: { tab: StdKey[], custom: pointunit[], res: StdKey[], resKeys: string[], dd: number, xy: number }) => {
    const eConfig: any = Immutable(this.props.config).asMutable({ deep: true })
    eConfig.pointunits = buildUnits(m.tab, m.custom, (k) => this.formatMessage(k))
    eConfig.resultFormats = buildResults(m.res, m.custom.filter(c => m.resKeys.indexOf(srKey(c)) > -1), m.dd, m.xy)
    delete eConfig.coordinateWKID
    delete eConfig.coordinatePrecision
    this.props.onSettingChange({ id: this.props.id, config: Immutable(eConfig) })
  }

  toggleStd = (column: 'tab' | 'res', key: StdKey, on: boolean) => {
    const m = this.coordModel()
    const list = m[column].filter(k => k !== key)
    if (on) list.push(key)
    this.writeCoords({ ...m, [column]: list })
  }

  setDecimals = (kind: 'dd' | 'xy', value: any) => {
    const n = Math.max(0, Math.min(12, Math.round(Number(value) || 0)))
    this.writeCoords({ ...this.coordModel(), [kind]: n })
  }

  updateCustom = (index: number, patch: Partial<pointunit>) => {
    const m = this.coordModel()
    const custom = m.custom.map(c => ({ ...c }))
    const creating = index >= custom.length
    const before = creating ? undefined : custom[index]
    const next: pointunit = { ...(before || { name: '', format: 'xy', transformation: 'auto' }), ...patch, format: 'xy' }
    // A system is a WKID or a WKT, never both.
    if (patch.wkid) delete next.wkt
    if (patch.wkt) delete next.wkid
    let resKeys = m.resKeys.slice()
    if (creating) {
      custom.push(next)
      if (srKey(next)) resKeys.push(srKey(next))
      this.setState({ pendingCustom: false })
    } else {
      custom[index] = next
      // Keep "Show in results" attached to the system when its WKID or WKT changes.
      const was = srKey(before)
      if (was && srKey(next) !== was && resKeys.indexOf(was) > -1) resKeys = resKeys.map(k => (k === was ? srKey(next) : k))
    }
    this.writeCoords({ ...m, custom, resKeys })
  }

  removeCustom = (index: number) => {
    const m = this.coordModel()
    if (index >= m.custom.length) { this.setState({ pendingCustom: false }); return }
    const gone = m.custom[index]
    this.writeCoords({ ...m, custom: m.custom.filter((c, i) => i !== index), resKeys: m.resKeys.filter(k => k !== srKey(gone)) })
  }

  toggleCustomResult = (index: number, on: boolean) => {
    const m = this.coordModel()
    const k = srKey(m.custom[index])
    if (!k) return
    const resKeys = m.resKeys.filter(x => x !== k)
    if (on) resKeys.push(k)
    this.writeCoords({ ...m, resKeys })
  }

  /** Replace a 1.9-era unit list with the standard formats (custom systems are dropped too). */
  useStandardFormats = () => {
    this.writeCoords({ tab: DEFAULT_TAB_KEYS.slice(), custom: [], res: DEFAULT_RESULT_KEYS.slice(), resKeys: [], dd: DEFAULT_DD_DECIMALS, xy: DEFAULT_XY_DECIMALS })
  }

  renderCoordinateSections = () => {
    const { config, theme } = this.props
    const m = this.coordModel()
    const legacy = hasLegacyUnits(config.pointunits) || (config as any).coordinateWKID !== undefined
    const hint = theme.colors?.palette?.dark?.[500]
    const danger = theme.colors?.palette?.danger?.[500] || '#d64545'
    const noTabFormats = m.tab.length === 0 && m.custom.length === 0
    return (
      <React.Fragment>
        <SettingSection title={this.formatMessage('coordSectionTitle')}>
          {legacy &&
            <div className='legacy-note mb-3' role='note'>
              <div className='mb-2'>{this.formatMessage('legacyUnitsNote')}</div>
              <Button size='sm' type='primary' onClick={this.useStandardFormats}>{this.formatMessage('useStandardFormats')}</Button>
            </div>
          }
          <SettingRow flow='wrap' label={this.formatMessage('coordFormatsLabel')}>
            <table className='coord-format-table w-100'>
              <thead>
                <tr>
                  <th scope='col'>{this.formatMessage('coordFormat')}</th>
                  <th scope='col' className='text-center'>{this.formatMessage('colTab')}</th>
                  <th scope='col' className='text-center'>{this.formatMessage('colResults')}</th>
                </tr>
              </thead>
              <tbody>
                {STD_KEYS.map(k => {
                  const name = this.formatMessage(STD_NAME_KEY[k])
                  return (
                    <tr key={k}>
                      <th scope='row' title={this.formatMessage(`${STD_NAME_KEY[k]}Hint`)}>{name}</th>
                      <td className='text-center'>
                        <Checkbox checked={m.tab.indexOf(k) > -1} aria-label={this.formatMessage('offerOnTab', { name })}
                          onChange={(e) => { this.toggleStd('tab', k, e.target.checked) }} />
                      </td>
                      <td className='text-center'>
                        <Checkbox checked={m.res.indexOf(k) > -1} aria-label={this.formatMessage('showInResultsNamed', { name })}
                          onChange={(e) => { this.toggleStd('res', k, e.target.checked) }} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div className='mt-2 text-break'><i style={{ fontSize: polished.rem(12), color: hint }}>{this.formatMessage('coordFormatsHint')}</i></div>
            {noTabFormats &&
              <div className='d-flex align-items-center mt-2' role='alert'>
                <WarningOutlined size={16} color={danger} />
                <span style={{ marginLeft: '4px', color: danger, fontWeight: 'bold' }}>{this.formatMessage('noTabFormats')}</span>
              </div>
            }
          </SettingRow>
          <SettingRow label={this.formatMessage('ddDecimals')}>
            <NumericInput size='sm' style={{ width: '72px' }} min={0} max={12} showHandlers value={m.dd}
              aria-label={this.formatMessage('ddDecimals')} onChange={(v) => { this.setDecimals('dd', v) }} />
          </SettingRow>
          <SettingRow label={this.formatMessage('xyDecimals')}>
            <NumericInput size='sm' style={{ width: '72px' }} min={0} max={12} showHandlers value={m.xy}
              aria-label={this.formatMessage('xyDecimals')} onChange={(v) => { this.setDecimals('xy', v) }} />
          </SettingRow>
        </SettingSection>

        <SettingSection title={this.formatMessage('customSystemsTitle')}>
          <div className='mb-2 text-break'><i style={{ fontSize: polished.rem(12), color: hint }}>{this.formatMessage('customSystemsHint')}</i></div>
          {m.custom.map((c, i) => (
            <CoordUnitItem key={`${i}-${srKey(c)}`} index={i} unit={c}
              inResults={m.resKeys.indexOf(srKey(c)) > -1}
              onChange={(patch) => { this.updateCustom(i, patch) }}
              onToggleResults={(on) => { this.toggleCustomResult(i, on) }}
              onRemove={() => { this.removeCustom(i) }}
              intl={this.props.intl} theme={theme} />
          ))}
          {this.state.pendingCustom &&
            <CoordUnitItem key='pending' index={m.custom.length} inResults={true}
              onChange={(patch) => { this.updateCustom(m.custom.length, patch) }}
              onToggleResults={() => {}}
              onRemove={() => { this.setState({ pendingCustom: false }) }}
              intl={this.props.intl} theme={theme} />
          }
          {!this.state.pendingCustom &&
            <Button size='sm' type='default' className='w-100' onClick={() => { this.setState({ pendingCustom: true }) }}>
              <PlusOutlined className='mr-1' />{this.formatMessage('addSystem')}
            </Button>
          }
        </SettingSection>
      </React.Fragment>
    )
  }

  getInitialViewOptions = (): React.JSX.Element[] => {
    let opts = ['address', 'coordinate', 'reverse']
    let optsLbls = [this.formatMessage('addresslabel'),this.formatMessage('coordslabel'),this.formatMessage('addressinsplabel')]
    let dTabs:string[] = this.props.config?.disabledtabs?.asMutable({deep: true}) || []
    const optionsArray = [];
    opts.map((opt, index)=>{
      if(dTabs.indexOf(opt) === -1){
        optionsArray.push(<option key={opt} value={opt}>{optsLbls[index]}</option>);
      }
    })
    return optionsArray;
  }

  render() {
    const { config } = this.props
    const {geocodeURL, isHadEnterGeocodeUrl, urlCheckResult, countryCode, initialView, autoClose,
      zoomScale, forceScale, keepInspectorActive, limit2ViewExtent, addressDisabled,
      coordinateDisabled, reverseDisabled, resultDisabled, noVisibleTabs} = this.state;
      return (
      <div css={getStyleForWidget(this.props.theme)}>
        <div className='jimu-widget-setting widget-setting-elocate w-100' style={{height: 'calc(100% - 40px)',overflow: 'auto'}}>
          <SettingSection className="map-selector-section" title={this.formatMessage('configeLocate')}>
            <SettingRow label={this.formatMessage('selectMapWidget')} />
            <SettingRow>
              <MapWidgetSelector onSelect={this.onMapWidgetSelected} useMapWidgetIds={this.props.useMapWidgetIds} />
            </SettingRow>
          </SettingSection>
          <SettingSection>
            <SettingRow flow='wrap' label={this.formatMessage('locatorUrl')}>
              <TextArea
                placeholder={this.formatMessage('enterUrl')}
                value={geocodeURL || ''}
                style={{
                  minHeight: polished.rem(100)
                }}
                onChange={this.onGeocodeUrlChange}
                onBlur={this.onGeocodeUrlInputBlur}
              />
              <div className='mt-2 text-break'><i style={{ fontSize: polished.rem(12), color: this.props.theme.colors?.palette?.dark?.[500] }} dangerouslySetInnerHTML={{ __html: DefaultGeocodeURL }}/></div>
              {(urlCheckResult.urlCheckResultType !== UrlCheckResultType.Pass && isHadEnterGeocodeUrl) && <div className='d-flex w-100 align-items-center justify-content-between mt-1'>
                <WarningOutlined size={16} color={this.props.theme.colors?.palette?.danger?.[500]}/>
                <div
                  style={{
                    width: 'calc(100% - 20px)',
                    margin: '0 4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: this.props.theme.colors?.palette?.danger?.[500],
                    fontWeight: 'bold'
                  }}
                >
                  {urlCheckResult.urlCheckResultType === UrlCheckResultType.NotHttps ? this.formatMessage('onlySupportedHTTPS') : this.formatMessage('invalidUrlMessage')}
                </div>
              </div>}
            </SettingRow>
            {(urlCheckResult.urlCheckResultType === UrlCheckResultType.Pass) &&<SettingRow flow='wrap' label={this.formatMessage('contryCodeLbl')}>
              <TextInput size='sm' value={countryCode || ''} onChange={this.handleCCChange} onAcceptValue={this.handleCCAccept} className='w-100' placeholder={this.formatMessage('countryCodeExamples')}/>
              <div className='mt-2 text-break'><i style={{ fontSize: polished.rem(12), color: this.props.theme.colors?.palette?.dark?.[500] }}>{this.formatMessage('countryCodeBlank')}</i></div>
            </SettingRow>}
          </SettingSection>
          {this.renderCoordinateSections()}
          <SettingSection>
            <SettingRow flow='wrap' label={this.formatMessage('initView')}>
              <Select onChange={this.onInitialViewChange} className="top-drop" value={initialView}>
                {this.getInitialViewOptions()}
              </Select>
            </SettingRow>
            <SettingRow flow='wrap' label={this.formatMessage('infowindowautoclose')}>
              <TextInput size='sm' value={autoClose || ''} onChange={this.onAutoClosePopupChange} className='w-100'/>
              <div className='mt-2 text-break'><i style={{ fontSize: polished.rem(12), color: this.props.theme.colors?.palette?.dark?.[500] }}>{this.formatMessage('autoclosetip')}</i></div>
            </SettingRow>
            <SettingRow flow='wrap' label={this.formatMessage('zoomScale')}>
              <TextInput size='sm' value={zoomScale || ''} onChange={this.onZoomScaleChange} className='w-100'/>
            </SettingRow>
            <SettingRow>
              <div className='d-flex w-100'>
                <Checkbox
                  data-field='forcescale'
                  data-state='forceScale'
                  onClick={this.handleCheckboxChange}
                  checked={forceScale}
                />
                <div className='text-truncate ml-2' title={this.formatMessage('forcescale')}>{this.formatMessage('forcescale')}</div>
              </div>
            </SettingRow>
            <SettingRow>
              <div className='d-flex w-100'>
                <Checkbox
                  data-field='keepinspectoractive'
                  data-state='keepInspectorActive'
                  onClick={this.handleCheckboxChange}
                  checked={keepInspectorActive}
                />
                <div className='text-truncate ml-2' title={this.formatMessage('keepactive')}>{this.formatMessage('keepactive')}</div>
              </div>
            </SettingRow>
            <SettingRow>
              <div className='d-flex w-100'>
                <Checkbox
                  data-field='limitsearchtoviewextentbydefault'
                  data-state='limit2ViewExtent'
                  onClick={this.handleCheckboxChange}
                  checked={limit2ViewExtent}
                />
                <div className='text-truncate ml-2' title={this.formatMessage('limittoviewextent')}>{this.formatMessage('limittoviewextent')}</div>
              </div>
            </SettingRow>
          </SettingSection>
          <SettingSection title={this.formatMessage('editdisabledtaboptions')}>
            {noVisibleTabs && <div className='d-flex w-100 align-items-center justify-content-between mt-1'>
                <WarningOutlined size={16} color={this.props.theme.colors?.palette?.danger?.[500]}/>
                <div
                  style={{
                    width: 'calc(100% - 20px)',
                    margin: '0 4px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: this.props.theme.colors?.palette?.danger?.[500],
                    fontWeight: 'bold'
                  }}>
                  {this.formatMessage('noVisibleTabsWarning')}
                </div>
              </div>
            }
            <SettingRow label={this.formatMessage('addresslabel')}>
              <Switch className='can-x-switch' data-key='address' title={this.formatMessage('addresslabel')}
                onChange={evt => { this.onDTabChanged(evt.target.checked, 'address') }}
                checked={addressDisabled} ></Switch>
            </SettingRow>
            <SettingRow label={this.formatMessage('coordslabel')}>
              <Switch className='can-x-switch' data-key='coordinate' title={this.formatMessage('coordslabel')}
                onChange={evt => { this.onDTabChanged(evt.target.checked, 'coordinate') }}
                checked={coordinateDisabled} ></Switch>
            </SettingRow>
            <SettingRow label={this.formatMessage('addressinsplabel')}>
              <Switch className='can-x-switch' data-key='reverse' title={this.formatMessage('addressinsplabel')}
                onChange={evt => { this.onDTabChanged(evt.target.checked, 'reverse') }}
                checked={reverseDisabled} ></Switch>
            </SettingRow>
            <SettingRow label={this.formatMessage('resultslabel')}>
              <Switch className='can-x-switch' data-key='result' title={this.formatMessage('resultslabel')}
                onChange={evt => { this.onDTabChanged(evt.target.checked, 'result') }}
                checked={resultDisabled} ></Switch>
            </SettingRow>
          </SettingSection>
          <SettingSection title={this.formatMessage('helpSection')}>
            <SettingRow>
              <div className='d-flex w-100'>
                <Checkbox
                  checked={config?.showHelp !== false}
                  aria-label={this.formatMessage('showHelp')}
                  onChange={(evt) => { this.onPropertyChange('showHelp', evt.target.checked) }}
                />
                <div className='ml-2' title={this.formatMessage('showHelpTip')}>{this.formatMessage('showHelp')}</div>
              </div>
            </SettingRow>
          </SettingSection>
        </div>
      </div>
      )
  }
}