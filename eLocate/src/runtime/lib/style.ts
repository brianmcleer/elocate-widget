/**
  Enhanced Locate widget styles. Original by Robert Scheitlin (Apache License 2.0).
  Modified 2026 by the City of Grand Junction GIS Division: header, notice and body layout for
  the help button, and list row colors that read in both light and dark themes. See CHANGES.md.
*/
import { ThemeVariables, css, SerializedStyles } from 'jimu-core';
import { IMConfig } from '../../config';

export function getStyle(theme: ThemeVariables, widgetConfig: IMConfig): SerializedStyles {

    const t = theme as any;

    // Theme structure changed across ExB versions. Resolve tokens defensively so
    // the widget works whether the theme exposes the old colors/surfaces shape or
    // the newer sys/ref shape, with sensible fallbacks.
    const root =
        t?.surfaces?.[1]?.bg ||
        t?.sys?.color?.surface?.background ||
        t?.ref?.palette?.neutral?.[200] ||
        t?.colors?.palette?.light?.[200] ||
        '#fff';

    const hintColor =
        t?.colors?.palette?.light?.[500] ||
        t?.sys?.color?.surface?.backgroundHint ||
        t?.ref?.palette?.neutral?.[600] ||
        '#aaa';

    const primaryColor =
        t?.colors?.primary ||
        t?.sys?.color?.primary?.main ||
        t?.ref?.palette?.primary?.[700] ||
        '#076fe5';

    return css`
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background-color: ${root};

    .elocate-header {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 2px 4px;
      flex-shrink: 0;
    }

    .elocate-body {
      flex: 1 1 auto;
      min-height: 0;
      overflow: auto;
    }

    .elocate-notice {
      margin: 14px;
      padding: 10px 12px;
      border-left: 3px solid ${primaryColor};
      font-size: 13px;
      line-height: 1.5;
    }
    .hintText {
      color: ${hintColor};
      margin-bottom: 0;
    }
    .label {
      display: inline-block;
      width: 110px;
      float: left;
    }
    .esri-icon-cursor {
      display: none;
    }
    .esri-sketch__section:first-child{
      padding: 0;
      margin: 0;
    }
    .pro-bar-container {
      background: #ccc;
      border: 2px solid ${primaryColor};
      height: 1.5em;
      overflow: hidden;
      width: 100%;
    }
    
    .pro-bar {
      background: ${primaryColor};
      height: inherit;
    }
    
    .pro-bar-width{
      /* Here is where you specify the width of ur progress-bar */
      width: 100%;
    }
    
    .pro-bar-candy {
      animation: progress .6s linear infinite;
      /* Don't touch this */
      background: linear-gradient(
        -45deg,
        rgba(255, 255, 255, 0.25) 25%,
        transparent 25%,
        transparent 50%,
        rgba(255, 255, 255, 0.25) 50%,
        rgba(255, 255, 255, 0.25) 75%,
        transparent 75%,
        transparent);
      /* Don't touch this */
      background-repeat: repeat-x;
      /* The size of the bars must match the background-position in the @keyframes */
      background-size: 2em 2em;
      height: inherit;
      width: 100%;
    }
    
    @keyframes progress {
      to { background-position: 2em 0; }
    }

    .search-list-item {
      line-height: 30px;
      font-size: 12px;
      white-space: pre;
      position: relative;
      min-height: 40px;
    }

    .search-list-item-btn {
      display: block;
      width: 100%;
      text-align: left;
      cursor: pointer;
      padding: 0;
      border: 0;
      background: transparent;
    }

    .search-list-item-btn:focus-visible {
      outline: 2px solid ${primaryColor};
      outline-offset: -2px;
    }

    .search-list-item .rlabel {
      padding-left: 40px;
      padding-right: 22px;
      padding-bottom: 3px;
      cursor: default;
      font-size: 1em;
      margin: 0;
      line-height: 1.5em;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .search-list-item ._title {
      padding-left: 40px;
      padding-right: 22px;
      padding-bottom: 3px;
      margin-right: 22px;
      cursor:default;
      font-weight: bolder;
      font-size: 1em;
      margin: 0;
      line-height: 1.5em;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .search-list-item .labellink{
      padding-left: 40px;
      padding-right: 10px;
      padding-bottom: 3px;
      cursor: pointer;
      outline: none;
    }
    
    .search-list-item .iconDiv {
      position: absolute;
      height: 100%;
      left: 0;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 40px;
    }
    
    .search-list-item .linksdiv {
      text-align: center;
      width: 100%;
      padding-left: 40px;
      padding-right: 5px;
      padding-top: 2px;
      padding-bottom: 5px;
    }
    
    .search-list-item .linkIcon {
      display: inline-block;
      padding-right: 4px;
    }
    
    .search-list-item.alt {
      background-color: rgba(127, 127, 127, 0.10);
    }
    
    .search-list-item.selected {
      background-color: rgba(127, 127, 127, 0.22);
    }
    
    .search-list-item.selected.alt {
      background-color: rgba(127, 127, 127, 0.22);
    }
    
    .search-list-item:hover {
      background-color: rgba(127, 127, 127, 0.16);
      box-shadow: inset 0px 0px 0px 1px ${primaryColor};
    }
    
    .search-list-item.alt:hover {
      background-color: rgba(127, 127, 127, 0.16);
      box-shadow: inset 0px 0px 0px 1px ${primaryColor};
    }
    
    .search-list-item.selected:hover {
      background-color: rgba(127, 127, 127, 0.16);
      box-shadow: inset 0px 0px 0px 1px ${primaryColor};
    }
    
    .search-list-item.selected.alt:hover {
      background-color: rgba(127, 127, 127, 0.16);
      box-shadow: inset 0px 0px 0px 1px ${primaryColor};
    }
    
    .search-list-item .removediv:before {
      content: '';
      display: inline-block;
      height: 100%;
      vertical-align: middle;
      margin-right: -0.25em;
    }
  
    .search-list-item .removediv {
      text-align: center;
      position: absolute;
      height: 100%;
      width: 22px;
      right: 0;
      padding-top: 4px;
    }

    .search-list-item .linksinnerdiv{
      width: 100%;
      border: thin solid #064B1F;
      border-radius: 4px;
      text-align: center;
      padding-top: 2px;
      background-color: #5A6B4D;
      color: white;
    }
    
    .search-list-item .linkIcon{
      display: inline-block;
      margin: 0 3px;
      cursor: pointer;
    }

    .search-list-item .removedivImg {
      display: inline-block;
      vertical-align: top;
      width: 16px;
      height: 16px;
      cursor: pointer;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
    }

    .search-list-item .removedivImg:focus-visible {
      outline: 2px solid ${primaryColor};
      outline-offset: 1px;
    }

    .jimu-tab {
      height: 100%;
    }

    /* Tab bar (own markup, see widget.tsx). A tab never shrinks below its label; the row
       wraps on a very narrow widget instead of cutting text. */
    .elocate-tabs {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 0 10px;
      border-bottom: 1px solid rgba(127, 127, 127, 0.35);
    }

    .elocate-tab {
      flex: 1 0 auto;
      padding: 5px 8px;
      font-size: 14px;
      line-height: 1.3;
      white-space: nowrap;
      text-align: center;
      cursor: pointer;
      color: inherit;
      background: transparent;
      border: 1px solid rgba(127, 127, 127, 0.35);
      border-bottom: none;
      border-radius: 4px 4px 0 0;
      margin-bottom: -1px;
    }

    .elocate-tab:hover:not(:disabled):not(.active) {
      background: rgba(127, 127, 127, 0.12);
    }

    .elocate-tab.active {
      background: ${primaryColor};
      border-color: ${primaryColor};
      color: #fff;
    }

    .elocate-tab:disabled {
      cursor: default;
      opacity: 0.55;
    }

    .elocate-tab:focus-visible {
      outline: 2px solid ${primaryColor};
      outline-offset: 1px;
    }

    .elocate-tab-content {
      height: calc(100% - 36px);
      overflow: auto;
    }

    .tab-content {
      height: calc(100% - 40px);
    }

    .tab-pane {
      width: 100%;
    }

    .elocate-list {
      overflow: auto;
      margin-top: 5px;
    }

    .search-list-container {
      height: 100%;
    }

    .hideTabs {
      display: none;
    }

    .showTabs {
      display: '';
      height: 100%;
    }

    .resultsMenu {
      cursor: pointer;
    }
  `;
}