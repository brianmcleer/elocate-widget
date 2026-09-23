/**
  Enhanced Locate widget strings. Original strings by Robert Scheitlin (Apache License 2.0).
  Modified 2026 by the City of Grand Junction GIS Division: status strings, the help guide
  keys and the first-run hint added; typos fixed. See CHANGES.md.
*/
export default {
  _widgetLabel: 'Enhanced Locate',
  zoom2message: 'Click to Zoom to Result',
  addresslabel: 'Address',
  coordslabel: 'Coordinates',
  addressinsplabel: 'Inspector',
  resultslabel: 'Results',
  locateDescLabel: 'Enter an address:',
  coordDescLabel: 'Enter the coordinates:',
  reverseDescLabel: 'Use the inspect address tool to click on the map and locate the address.',
  removeresultmessage: 'Remove Result',
  noresultsfoundlabel: 'No Results Found',
  resultsfoundlabel: 'Results found:',
  resultsLayerTitle: 'Enhanced Locate results',
  clear: 'Clear',
  ok: 'OK',
  widgetversion: 'Enhanced Locate Widget Version Info',
  widgetverstr: 'Widget Version',
  wabversionmsg: 'Widget is designed to run in Experience Builder version',
  revgeocodetip: 'Inspect Address by Point',
  coordUnitLbl: 'Units:',
  example: 'Example:',
  locate: 'Locate',
  drawpointtooltip: 'Inspect Locations Address',
  longitude: 'Longitude (X)',
  latitude: 'Latitude (Y)',
  coordinates: 'Coordinates',
  llcoordinates: 'Lat Lon Coordinates',
  location: 'Location',
  address: 'Address',
  exampleClickTooltip: 'Click to add the example coordinates above',
  score: 'Score',
  locatorissue: 'GeocodeServer Issue',
  locatorissuemessage: 'The geocode service could not be read, or it has no single line address field. The Address tab is hidden until it is fixed in the widget settings.',
  limittomapextent: 'Limit address search to maps extent.',
  reversegeocodefailtitle: 'Address Inspection Failed',
  reversegeocodefailmsg: 'Failed to find an address at the location clicked. Please try again.',
  searchError: 'The address search failed. Check the geocode service in the widget settings, then try again.',
  projectissue: 'An issue occurred while projecting the location.',
  exampleClick: 'Click to move example values into input fields',
  coordsInvalid: 'Those coordinates could not be read. Click the example under the box to see the format this unit expects.',
  xLabelGeo: 'Longitude:',
  yLabelGeo: 'Latitude:',
  xLabelProj: 'X (Easting):',
  yLabelProj: 'Y (Northing):',

  /* Coordinate formats, the same set as Esri's Coordinate Conversion component. */
  fmtXY: 'X and Y',
  fmtDD: 'Decimal degrees',
  fmtDDM: 'Degrees decimal minutes',
  fmtDMS: 'Degrees minutes seconds',
  fmtMGRS: 'MGRS',
  fmtUSNG: 'USNG',
  fmtUTM: 'UTM',
  fmtXYShort: 'X, Y',
  fmtXYMap: 'Map X and Y',
  coordsOutOfArea: 'outside this coordinate system\'s area',
  coordsOutOfAreaInput: 'Those coordinates are outside the area of the coordinate system picked in Units. Pick the system the numbers came from.',
  fmtDDShort: 'Lat Lon',
  fmtDDMShort: 'Lat Lon (DDM)',
  fmtDMSShort: 'Lat Lon (DMS)',
  fmtMGRSShort: 'MGRS',
  fmtUSNGShort: 'USNG',
  fmtUTMShort: 'UTM',
  noMapConnected: 'This widget is not connected to a map yet. Open the widget settings and choose a Map widget.',
  noTabsEnabled: 'Every tab in this widget is turned off. Turn at least one of Address, Coordinates or Inspector back on in the widget settings.',
  loading: 'Loading',
  locating: 'Locating, please wait',

  /*
    In-widget help guide. Keys follow the shared pattern used by the GIS Division's other
    widgets (WIDGETHANDOFF Section 10). {tokens} in braces are filled in by helpSections.ts
    with the button and tab names exactly as the widget shows them.
  */
  helpTitle: 'Help',
  close: 'Close',
  helpIntro: 'Find a place on the map by its address, by its coordinates, or by clicking the map to get the address there.',
  helpSearchPlaceholder: 'Search the guide (try "address" or "latitude")',
  helpNoMatches: 'Nothing in the guide matches that word. Try another, or open the sections above.',
  helpAnd: 'and',
  helpOr: 'or',
  firstRunTitle: 'New here?',
  firstRunBody: 'Pick a tab at the top, type an address or coordinates and click Locate, and the place is marked on the map.',
  firstRunHelpLink: 'Open the guide.',
  firstRunDismiss: 'Dismiss',

  /* Start here */
  helpStartTitle: 'Start here: three steps',
  helpStart1: 'Pick a tab at the top: {tabs}.',
  helpStart2: 'Then {actions}.',
  helpStart2Type: 'type {what} and click {locate}',
  helpStart2WhatAddress: 'an address',
  helpStart2WhatCoords: 'the coordinates',
  helpStart2Inspect: 'click the pin button on {inspector} and then click the map',
  helpStart2Join: ', or ',
  helpStart3: 'The place is marked on the map and a box opens with its details. The {results} tab lists everything you found.',
  helpStart3NoResults: 'The place is marked on the map and a box opens with its details.',

  /* Address */
  helpAddressTitle: 'Finding an address',
  helpAddressIntro: 'On the {address} tab.',
  helpAddress1: 'Type the address in the box the way you would write it on an envelope, including the house number and street, and the town if the map covers more than one.',
  helpAddress2: 'Press Enter or click {locate}. Every good match gets a mailbox mark on the map.',
  helpAddressExtent: 'Tick "{limit}" to look only inside the area the map shows now. This helps when the same street name is in another town.',
  helpAddressScore: 'Each match has a score out of 100. The higher the score, the closer the match. The best match is first.',

  /* Coordinates */
  helpCoordsTitle: 'Going to coordinates',
  helpCoordsIntro: 'On the {coordinates} tab.',
  helpCoordsUnits: 'Pick the kind of coordinates you have in {units}. The boxes below change to match.',
  helpCoordsXY: 'For X and Y there are two boxes. The label beside each box says which number goes there.',
  helpCoordsLatLon: 'For latitude and longitude there is one box. Paste them the way you have them: decimal numbers, or degrees, minutes and seconds with N, S, E or W. Latitude comes first.',
  helpCoordsGrid: 'For a grid reference (MGRS, USNG or UTM) there is one box. Paste the whole reference, zone and all.',
  helpCoordsExample: 'Not sure of the format? The blue text next to {example} is the middle of the map in that format, and it changes as you move the map. Click it to fill in the box, then change it.',
  helpCoords2: 'Click {locate} or press Enter. A pin marks the spot on the map.',

  /* Inspector */
  helpInspectTitle: 'Getting the address of a spot',
  helpInspectIntro: 'On the {inspector} tab.',
  helpInspect1: 'Click the pin button ({button}), then click a spot on the map.',
  helpInspect2: 'The widget looks up the nearest address and marks it with a house.',
  helpInspectKeep: 'The pin button stays on, so you can keep clicking spots. Click it again to stop.',
  helpInspectOnce: 'The pin button turns itself off after one click. Click it again for the next spot.',

  /* Results */
  helpResultsTitle: 'Your results',
  helpResults1: 'The {results} tab lists everything you found, with a count at the top.',
  helpResults2: 'Click a result to move the map to it and open its details.',
  helpResults3: 'The x at the right of a result takes that one away. {clear} takes them all away.',
  helpResultsAutoClose: 'The details box closes by itself after a few seconds. Keep the mouse over it and it stays open.',

  /* Trouble */
  helpTroubleTitle: 'If something looks wrong',
  helpTroubleNoMap: 'The widget asks for a map: it is not connected to one yet. Ask whoever built this app to pick a map in the widget settings.',
  helpTroubleNoResults: 'No Results Found: the address was not found. Check the spelling, leave out any unit or suite number, and try again.',
  helpTroubleExtent: 'No Results Found with "{limit}" ticked: the address is outside the area the map shows. Untick it or zoom out, then try again.',
  helpTroubleNoAddressTab: 'The {address} tab is missing: the address service could not be reached when the widget opened. Reload the page, and if it is still missing, contact the GIS Division.',
  helpTroubleCoords: 'The pin lands in the wrong place: the wrong kind of coordinates is picked in {units}, or X and Y are in the wrong boxes. Pick another kind or swap the numbers.',
  helpTroubleInspect: 'Address Inspection Failed: there is no address close to that spot. Click nearer to a street.',
  helpTroubleSpinner: 'The widget keeps spinning: the map is still loading. Give it a moment, then reload the page.',
  helpTroubleContact: 'Still stuck? Contact the GIS Division and mention the Enhanced Locate widget and this app.',

  /* Tips */
  helpTipsTitle: 'Good to know',
  helpTips1: 'Close the widget and its marks leave the map. Open it again and they come back, until you click {clear}.',
  helpTips2: 'Each new search replaces the marks from the one before.',
  helpTips3: 'Hold Alt and click anywhere in the widget to see which version you have.'
}
