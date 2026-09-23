/** @jsx jsx */
/*
  Enhanced Locate: one custom X and Y coordinate system in the settings panel.
  The original coordinate unit editor (WKID, format radio buttons, transform WKID and
  direction) is by Robert Scheitlin (Apache License 2.0).

  Rewritten 2026 by the City of Grand Junction GIS Division. The standard formats (DD, DDM, DMS,
  MGRS, USNG, UTM, map X and Y) need no editor at all and are switched on in a table in
  setting.tsx; this card is for any other X and Y coordinate system an organization uses, given
  as a WKID or, for a local or custom system with no WKID, as WKT. Nothing is tied to a region:
  the system is checked against the browser projection engine at sample points around the whole
  world, named from the bundled Esri list or the WKT itself, and the datum transformation is
  picked from the ones the projection engine offers for it. See CHANGES.md.

  No static esri/* imports here (WIDGETHANDOFF 12.1): the SDK is loaded with
  loadArcGISJSAPIModules only when a WKID needs checking.
*/
import { React, jsx, ThemeVariables, IntlShape, polished, loadArcGISJSAPIModules } from 'jimu-core'
import { TextInput, TextArea, Select, Checkbox, Button, Label } from 'jimu-ui'
import type { pointunit, TransformSetting } from '../config'
import settingsDefaultMessages from './translations/default'
import { WarningOutlined } from 'jimu-icons/outlined/suggested/warning'
import { CloseOutlined } from 'jimu-icons/outlined/editor/close'
const datumTrans = require('./transform.json')
const spatialRefs = require('./cs.json')

interface Props {
  intl: IntlShape
  theme: ThemeVariables
  /** Index in the list, for unique ids. */
  index: number
  /** The system being edited, or undefined for a new card that has no WKID yet. */
  unit?: pointunit
  inResults: boolean
  /** Writes a change. On a new card the first call (with a wkid) creates the system. */
  onChange: (patch: Partial<pointunit>) => void
  onToggleResults: (on: boolean) => void
  onRemove: () => void
}

interface TransformOption { value: string, label: string, steps: Array<{ wkid: number, isInverse: boolean }> }

interface State {
  name: string
  /** What the builder typed: a WKID number or a WKT string. */
  wkidText: string
  wkidStatus: 'empty' | 'checking' | 'valid' | 'invalid'
  srName: string
  transformOptions: TransformOption[]
}

/** The system's own name from WKT: the first quoted string, PROJCS["name", ... or PROJCRS["name", ... */
const wktName = (wkt: string): string => {
  const m = (wkt || '').match(/^\s*[A-Z]+\s*\[\s*"([^"]+)"/i)
  return m ? m[1].replace(/_/g, ' ') : ''
}

const looksLikeWkt = (text: string): boolean => /^\s*[A-Z_]+\s*\[/i.test(text || '')

/** Sample points on every continent and ocean: a system is usable if any of them projects. */
const SAMPLE_POINTS: Array<[number, number]> = (() => {
  const pts: Array<[number, number]> = []
  for (let lat = -75; lat <= 75; lat += 15) for (let lon = -180; lon < 180; lon += 15) pts.push([lon, lat])
  return pts
})()

const labelFor = (list: any, idKey: string, id: number): string => {
  const i = list?.[idKey]?.indexOf(id)
  return i > -1 ? String(list.labels[i]).replace(/_/g, ' ') : ''
}

export default class CoordUnitItem extends React.PureComponent<Props, State> {
  checkRequest = 0

  constructor (props) {
    super(props)
    const u: pointunit = props.unit
    this.state = {
      name: u?.name || '',
      wkidText: u?.wkid ? String(u.wkid) : (u?.wkt || ''),
      wkidStatus: (u?.wkid || u?.wkt) ? 'checking' : 'empty',
      srName: this.nameOf(u),
      transformOptions: []
    }
  }

  nameOf = (u?: { wkid?: number, wkt?: string }): string => {
    if (u?.wkid) return labelFor(spatialRefs, 'wkids', u.wkid)
    if (u?.wkt) return wktName(u.wkt)
    return ''
  }

  componentDidMount () {
    const u = this.props.unit
    if (u?.wkid || u?.wkt) this.checkSystem({ wkid: u.wkid, wkt: u.wkt })
  }

  msg = (id: string, values?: any): string => this.props.intl.formatMessage({ id, defaultMessage: settingsDefaultMessages[id] }, values)

  /**
   * Valid when the projection engine can project to it at any of the sample points around the
   * world (every system covers some part of the Earth), or when its WKID is in the bundled Esri
   * list. The same pass lists the datum transformations from this system to WGS84.
   */
  checkSystem = async (sys: { wkid?: number, wkt?: string }): Promise<void> => {
    const request = ++this.checkRequest
    const inList = !!sys.wkid && (spatialRefs.wkids as number[]).indexOf(sys.wkid) > -1
    this.setState({ wkidStatus: 'checking', srName: this.nameOf(sys) })
    let engineOk = false
    let options: TransformOption[] = []
    try {
      const [SpatialReference, Point, projectOperator, gtUtils] = await loadArcGISJSAPIModules([
        'esri/geometry/SpatialReference',
        'esri/geometry/Point',
        'esri/geometry/operators/projectOperator',
        'esri/geometry/operators/support/geographicTransformationUtils'
      ])
      if (!projectOperator.isLoaded()) await projectOperator.load()
      const sr = sys.wkid ? new SpatialReference({ wkid: sys.wkid }) : new SpatialReference({ wkt: sys.wkt })
      const wgs = new SpatialReference({ wkid: 4326 })
      for (const [x, y] of SAMPLE_POINTS) {
        try {
          const out = projectOperator.execute(new Point({ x, y, spatialReference: wgs }), sr)
          if (out && isFinite(out.x) && isFinite(out.y)) { engineOk = true; break }
        } catch (e) { /* this system does not reach that point; try the next one */ }
      }
      try {
        if (!gtUtils.isLoaded()) await gtUtils.load()
        const list: any[] = gtUtils.getTransformations(sr, wgs) || []
        options = list.map((gt: any, i: number) => {
          const steps = (gt.steps || []).map((s: any) => ({ wkid: Number(s.wkid), isInverse: !!s.isInverse }))
          const text = steps.map(s => (labelFor(datumTrans, 'tfWkids', s.wkid) || String(s.wkid)) + (s.isInverse ? ` (${this.msg('inverse')})` : '')).join(' + ')
          return { value: `t${i}`, label: text || String(i + 1), steps }
        }).filter(o => o.steps.length > 0)
      } catch (e) { options = [] }
    } catch (e) {
      console.info('eLocate settings: could not load the projection engine to check the WKID', e)
    }
    if (request !== this.checkRequest) return
    this.setState({ wkidStatus: (engineOk || inList) ? 'valid' : 'invalid', transformOptions: options })
  }

  /** Accepts a WKID (any number the projection engine knows) or a WKT string. */
  onSystemAccept = (value: string) => {
    const v = (value || '').trim()
    let sys: { wkid?: number, wkt?: string } | null = null
    if (/^\d+$/.test(v) && parseInt(v, 10) > 0) sys = { wkid: parseInt(v, 10) }
    else if (looksLikeWkt(v)) sys = { wkt: v }
    if (!sys) {
      this.setState({ wkidStatus: v ? 'invalid' : 'empty' })
      return
    }
    const srName = this.nameOf(sys)
    this.setState({ wkidText: sys.wkid ? String(sys.wkid) : sys.wkt })
    const patch: Partial<pointunit> = { ...sys, transformation: 'auto' }
    // A blank name, or one that was only the old system's name, follows the new system.
    const oldName = this.nameOf(this.props.unit)
    if (!this.state.name || this.state.name === oldName) {
      patch.name = srName || (sys.wkid ? `${this.msg('fmtXYShort')} ${sys.wkid}` : this.msg('customSystemNew'))
      this.setState({ name: patch.name })
    }
    this.props.onChange(patch)
    this.checkSystem(sys)
  }

  onNameAccept = (value: string) => {
    const v = (value || '').trim() || this.state.srName || `${this.msg('fmtXYShort')} ${this.props.unit?.wkid ?? ''}`.trim()
    this.setState({ name: v })
    if (this.props.unit) this.props.onChange({ name: v })
  }

  onTransformChange = (evt) => {
    const value: string = evt?.target?.value
    if (value === 'auto' || value === 'none') { this.props.onChange({ transformation: value }); return }
    const opt = this.state.transformOptions.find(o => o.value === value)
    if (opt) this.props.onChange({ transformation: { steps: opt.steps } })
  }

  transformValue = (t: TransformSetting | undefined): string => {
    if (!t || t === 'auto') return 'auto'
    if (t === 'none') return 'none'
    const key = JSON.stringify(t.steps)
    const match = this.state.transformOptions.find(o => JSON.stringify(o.steps) === key)
    return match ? match.value : 'custom'
  }

  render () {
    const { unit, theme, index, inResults } = this.props
    const { name, wkidText, wkidStatus, srName, transformOptions } = this.state
    const hint = theme?.colors?.palette?.dark?.[500]
    const danger = theme?.colors?.palette?.danger?.[500] || '#d64545'
    const tValue = this.transformValue(unit?.transformation)
    const id = (k: string) => `elocate-cs-${k}-${index}`

    return (
      <div className='custom-system-card' role='group' aria-label={name || this.msg('customSystemNew')}>
        <div className='d-flex align-items-center mb-2'>
          <strong className='flex-grow-1 text-truncate' title={name}>{name || this.msg('customSystemNew')}</strong>
          <Button size='sm' type='tertiary' icon className='p-0' title={this.msg('removeSystem')} aria-label={this.msg('removeSystem')} onClick={this.props.onRemove}>
            <CloseOutlined />
          </Button>
        </div>

        <Label for={id('wkid')} className='d-block mb-1'>{this.msg('wkidOrWkt')}</Label>
        <TextArea id={id('wkid')} className='w-100' value={wkidText} height={looksLikeWkt(wkidText) ? 96 : 32}
          placeholder={this.msg('wkidPlaceholder')}
          onChange={(e) => { this.setState({ wkidText: e.target.value }) }}
          onBlur={(e) => { this.onSystemAccept(e.target.value) }}
          onKeyDown={(e) => { if (e.key === 'Enter' && !looksLikeWkt(wkidText)) { e.preventDefault(); this.onSystemAccept(wkidText) } }} />
        <div className='text-break mt-1 mb-2' aria-live='polite'>
          {wkidStatus === 'empty' && <i style={{ fontSize: polished.rem(11), color: hint }}>{this.msg('wkidEnterHint')}</i>}
          {wkidStatus === 'checking' && <i style={{ fontSize: polished.rem(11), color: hint }}>{this.msg('wkidChecking')}</i>}
          {wkidStatus === 'valid' && <i style={{ fontSize: polished.rem(11), color: hint }}>{srName || this.msg('wkidValidNoName')}</i>}
          {wkidStatus === 'invalid' &&
            <span className='d-flex align-items-center' role='alert'>
              <WarningOutlined size={14} color={danger} />
              <span style={{ marginLeft: '4px', color: danger, fontWeight: 'bold' }}>{this.msg('invalidWKID')}</span>
            </span>
          }
        </div>

        {(unit?.wkid || unit?.wkt) &&
          <React.Fragment>
            <Label for={id('name')} className='d-block mb-1'>{this.msg('name')}</Label>
            <TextInput id={id('name')} size='sm' type='text' className='w-100 mb-2' value={name}
              onChange={(e) => { this.setState({ name: e.target.value }) }}
              onAcceptValue={this.onNameAccept} />

            <Label for={id('tf')} className='d-block mb-1'>{this.msg('datumTransform')}</Label>
            <Select id={id('tf')} size='sm' className='w-100' value={tValue} onChange={this.onTransformChange}>
              <option value='auto'>{this.msg('transformAuto')}</option>
              <option value='none'>{this.msg('transformNone')}</option>
              {tValue === 'custom' && <option value='custom'>{this.msg('transformCustom')}</option>}
              {transformOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </Select>

            <Label className='d-flex align-items-center mt-2 mb-0' style={{ cursor: 'pointer' }}>
              <Checkbox checked={inResults} onChange={(e) => { this.props.onToggleResults(e.target.checked) }} />
              <span className='ml-2'>{this.msg('showInResults')}</span>
            </Label>
          </React.Fragment>
        }
      </div>
    )
  }
}
