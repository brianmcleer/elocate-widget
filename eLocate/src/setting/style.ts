/*
  Enhanced Locate settings styles by Robert Scheitlin (Apache License 2.0).
  Modified 2026 by the City of Grand Junction GIS Division: every theme read goes through
  pal() so a builder theme without the legacy colors.palette shape (Experience Builder 1.21)
  cannot blank the settings panel. See CHANGES.md.
*/
import { ThemeVariables, css, SerializedStyles, polished } from 'jimu-core'

/** Legacy palette color with a newer-theme and a fixed fallback. */
function pal (theme: any, group: string, shade: number, fallback: string): string {
  return theme?.colors?.palette?.[group]?.[shade] ??
    (group === 'primary' ? theme?.sys?.color?.primary?.main : undefined) ??
    (group === 'dark' ? theme?.sys?.color?.surface?.paperHint : undefined) ??
    fallback
}

export function getStyleForCUI (theme: ThemeVariables): SerializedStyles {
  return css`
    .filter-item-panel{
      .setting-header {
        padding: ${polished.rem(10)} ${polished.rem(16)} ${polished.rem(0)} ${polished.rem(16)}
      }

      .setting-title {
        font-size: ${polished.rem(16)};
        .filter-item-label{
          color: ${pal(theme, 'dark', 600, '#6a6a6a')};
        }
      }

      .setting-container {
        height: calc(100% - ${polished.rem(50)});
        overflow: auto;

        .title-desc{
          color: ${pal(theme, 'dark', 200, '#9a9a9a')};
        }


      }
    }
  `
}

export function getStyleForWidget (theme: ThemeVariables): SerializedStyles {
  return css`
    .widget-setting-elocate{
      .coordunit-item {
        display: flex;
        flex: 1;
        padding: ${polished.rem(7)} 0.25rem;
        cursor: pointer;

        .coordunit-item-icon{
          width: 14px;
          margin-right: 0.5rem;
        }
        .coordunit-item-tag{
          opacity: 0.7;
          font-size: 0.85em;
        }
        .coordunit-item-name{
          /* word-break: break-word; */
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          word-break: break-word;
          -webkit-line-clamp: 2;
          line-height: ${(theme as any)?.typography?.lineHeights?.sm ?? 1.3};
        }
      }

      .coord-format-table {
        border-collapse: collapse;
        font-size: ${polished.rem(13)};
        th, td {
          padding: 4px 2px;
          border-bottom: 1px solid rgba(127, 127, 127, 0.25);
          font-weight: normal;
          text-align: left;
          vertical-align: middle;
        }
        thead th {
          font-size: ${polished.rem(12)};
          opacity: 0.8;
        }
        .text-center { text-align: center; }
      }

      .custom-system-card {
        border: 1px solid rgba(127, 127, 127, 0.35);
        border-radius: 4px;
        padding: 8px;
        margin-bottom: 8px;
      }

      .legacy-note {
        padding: 8px 10px;
        border-left: 3px solid ${pal(theme, 'primary', 600, '#076fe5')};
        background: rgba(127, 127, 127, 0.12);
        font-size: ${polished.rem(12)};
        line-height: 1.5;
      }

      .arrange-style-container{

        .arrange_container, .trigger_container{
          margin-top: 10px;
          display: flex;
          justify-content: space-between;
          .jimu-btn {
            padding: 0;
            background: ${pal(theme, 'light', 200, 'transparent')};
            &.active{
              border: 2px solid ${pal(theme, 'primary', 600, '#076fe5')};
            }
          }
        }
        .trigger_container{
          justify-content: flex-start;
          .jimu-btn:last-of-type{
            margin-left: 0.5rem;
          }
        }

        .omit-label{
          color: ${pal(theme, 'dark', 400, '#828282')};
        }
      }

      .options-container {
        .use-wrap{
          .jimu-widget-setting--row-label{
            margin-right: 5px;
          }
        }
      }
    }
  `
}
