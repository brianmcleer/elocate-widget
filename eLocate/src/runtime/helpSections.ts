import type { HelpSection } from './components/HelpPopup'

/**
 * Flags the widget computes from config and live status. One per feature that has help text.
 * widget.tsx computes these with the same checks render() uses (tabsEnabled(), showExtentCbx,
 * the autoClose timer), so the guide never describes a control the widget is not showing.
 */
export interface HelpFeatures {
  mapConnected: boolean
  addressTab: boolean
  coordinateTab: boolean
  inspectorTab: boolean
  resultsTab: boolean
  /** The address service could not be read, so the Address tab was hidden at runtime. */
  locatorFailed?: boolean
  /** The "Limit address search to maps extent." box is on screen. */
  limitExtent: boolean
  /** More than one coordinate unit, so the Units list is worth explaining. */
  severalUnits: boolean
  /** Units by kind: two boxes (xy), latitude and longitude, grid references. */
  xyUnits: boolean
  latLonUnits: boolean
  gridUnits: boolean
  keepInspector: boolean
  autoClose: boolean
  /* control names exactly as the interface shows them */
  labels: HelpLabels
}

export interface HelpLabels {
  address: string
  coordinates: string
  inspector: string
  results: string
  locate: string
  clear: string
  units: string
  example: string
  limit: string
  inspectButton: string
}

type T = (id: string, values?: Record<string, string>) => string

export function buildHelpSections (t: T, f: HelpFeatures): HelpSection[] {
  const L = f.labels
  const when = (on: boolean, ...ids: string[]): string[] => (on ? ids.map((id: string) => t(id)) : [])
  const join = (parts: string[], word: string): string =>
    parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} ${word} ${parts[parts.length - 1]}`
  const oneOf = (parts: string[]): string => join(parts, t('helpOr'))

  const tabs: string[] = [
    ...(f.addressTab ? [L.address] : []),
    ...(f.coordinateTab ? [L.coordinates] : []),
    ...(f.inspectorTab ? [L.inspector] : [])
  ]
  const typed: string[] = [
    ...(f.addressTab ? [t('helpStart2WhatAddress')] : []),
    ...(f.coordinateTab ? [t('helpStart2WhatCoords')] : [])
  ]
  const actions: string[] = [
    ...(typed.length > 0 ? [t('helpStart2Type', { what: oneOf(typed), locate: L.locate })] : []),
    ...(f.inspectorTab ? [t('helpStart2Inspect', { inspector: L.inspector })] : [])
  ]
  // The extent box only exists on the Address tab.
  const limitExtent = f.addressTab && f.limitExtent

  const sections: HelpSection[] = [
    {
      key: 'start',
      icon: 'play',
      title: t('helpStartTitle'),
      ordered: true,
      body: [
        t('helpStart1', { tabs: oneOf(tabs) }),
        t('helpStart2', { actions: actions.join(t('helpStart2Join')) }),
        f.resultsTab ? t('helpStart3', { results: L.results }) : t('helpStart3NoResults')
      ]
    }
  ]

  if (f.addressTab) {
    sections.push({
      key: 'address',
      icon: 'search',
      title: t('helpAddressTitle'),
      intro: t('helpAddressIntro', { address: L.address }),
      body: [
        t('helpAddress1'),
        t('helpAddress2', { locate: L.locate }),
        ...(limitExtent ? [t('helpAddressExtent', { limit: L.limit })] : []),
        t('helpAddressScore')
      ]
    })
  }

  if (f.coordinateTab) {
    sections.push({
      key: 'coords',
      icon: 'globe',
      title: t('helpCoordsTitle'),
      intro: t('helpCoordsIntro', { coordinates: L.coordinates }),
      body: [
        ...(f.severalUnits ? [t('helpCoordsUnits', { units: L.units })] : []),
        ...when(f.xyUnits, 'helpCoordsXY'),
        ...when(f.latLonUnits, 'helpCoordsLatLon'),
        ...when(f.gridUnits, 'helpCoordsGrid'),
        t('helpCoordsExample', { example: L.example }),
        t('helpCoords2', { locate: L.locate })
      ]
    })
  }

  if (f.inspectorTab) {
    sections.push({
      key: 'inspect',
      icon: 'pin',
      title: t('helpInspectTitle'),
      intro: t('helpInspectIntro', { inspector: L.inspector }),
      body: [
        t('helpInspect1', { button: L.inspectButton }),
        t('helpInspect2'),
        f.keepInspector ? t('helpInspectKeep') : t('helpInspectOnce')
      ]
    })
  }

  if (f.resultsTab) {
    sections.push({
      key: 'results',
      icon: 'list',
      title: t('helpResultsTitle'),
      body: [
        t('helpResults1', { results: L.results }),
        t('helpResults2'),
        t('helpResults3', { clear: L.clear }),
        ...when(f.autoClose, 'helpResultsAutoClose')
      ]
    })
  }

  sections.push({
    key: 'trouble',
    icon: 'exclamation-mark-triangle',
    title: t('helpTroubleTitle'),
    body: [
      ...when(!f.mapConnected, 'helpTroubleNoMap'),
      ...when(f.addressTab, 'helpTroubleNoResults'),
      ...(limitExtent ? [t('helpTroubleExtent', { limit: L.limit })] : []),
      ...(f.locatorFailed ? [t('helpTroubleNoAddressTab', { address: L.address })] : []),
      ...(f.coordinateTab ? [t('helpTroubleCoords', { units: L.units })] : []),
      ...when(f.inspectorTab, 'helpTroubleInspect'),
      t('helpTroubleSpinner'),
      t('helpTroubleContact')
    ]
  })

  sections.push({
    key: 'tips',
    icon: 'lightbulb',
    title: t('helpTipsTitle'),
    body: [
      t('helpTips1', { clear: L.clear }),
      t('helpTips2'),
      t('helpTips3')
    ]
  })

  return sections
}
