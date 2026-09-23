/** @jsx jsx */
/**
  Enhanced Locate results list. Original by Robert Scheitlin (Apache License 2.0).
  Modified by the City of Grand Junction GIS Division: keyboard and screen reader support
  (2026, see WCAG-AUDIT.md), React keys, and a guard for content lines without a value.
  See CHANGES.md.
*/
import { jsx, React } from 'jimu-core';
import { Icon } from 'jimu-ui';
import { CloseOutlined } from 'jimu-icons/outlined/editor/close';
import { listItem, locateType } from '../../config';

const pinIcon = require('../assets/i_pin1.gif');
const mailboxIcon = require('../assets/i_mailbox.gif');
const houseIcon = require('../assets/i_house.gif');

interface ListProps {
    items: listItem[],
    removeResultMsg: string;
    onRecordClick: (e: React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>) => void;
    onRecordRemoveClick: (e: React.MouseEvent<HTMLElement>) => void;
    onRecordMouseOver: (e: React.MouseEvent<HTMLElement>) => void;
    onRecordMouseOut: (e: React.MouseEvent<HTMLElement>) => void;
}

export default class List extends React.Component<ListProps> {

    constructor(props) {
        super(props);
    }

    getAttributeElements = (item: listItem): React.JSX.Element[] => {
        const attEleArray = [];
        if (item.content !== "") {
            const itemId: string = item.id;
            const attArr = item.content.split('<br>');
            let attValArr: string[], tHasColor: boolean, btIndex: number, etIndex: number,
                bvIndex: number, evIndex: number, tColor: string,
                vHasColor: boolean, vColor: string;
            attArr.map((attr: string, index) => {
                attValArr = attr.split(': ');
                if (attValArr.length < 2) { attValArr = [attValArr[0] || '', 'null']; }

                //Work with Attribute Title
                tHasColor = (attValArr[0].toLowerCase().indexOf("<font color='") > -1) ? true : false;
                if (tHasColor) {
                    btIndex = attValArr[0].toLowerCase().indexOf("<font color='") + 13;
                    etIndex = attValArr[0].toLowerCase().indexOf("'>", btIndex);
                    tColor = attValArr[0].substr(btIndex, etIndex - btIndex);
                }

                //Work with Attribute Value
                vHasColor = (attValArr[1].toLowerCase().indexOf("<font color='") > -1) ? true : false;
                if (vHasColor) {
                    bvIndex = attValArr[1].toLowerCase().indexOf("<font color='") + 13;
                    evIndex = attValArr[1].toLowerCase().indexOf("'>", bvIndex);
                    vColor = attValArr[1].substr(bvIndex, evIndex - bvIndex);
                }

                let attrValueCont;
                if (attValArr[1] === 'null') {
                    attrValueCont = ": ";
                } else {
                    attrValueCont = attValArr[1].replace(/<[\/]{0,1}(em|EM|strong|STRONG|font|FONT|u|U)[^><]*>/g, "");
                }

                const attrib: React.JSX.Element = <p className='rlabel' id={itemId} key={`${itemId}-${index}`}
                    title={attValArr[0].replace(/<[\/]{0,1}(em|EM|strong|STRONG|font|FONT|u|U)[^><]*>/g, "") + ": " + attrValueCont}>
                    <span id={itemId}
                        style={{
                            fontStyle: attValArr[0].toLowerCase().indexOf('<em>') > -1 ? 'italic' : 'normal',
                            fontWeight: attValArr[0].toLowerCase().indexOf('<strong>') > -1 ? 'bold' : 'normal',
                            textDecoration: attValArr[0].toLowerCase().indexOf('<u>') > -1 ? 'underline' : 'initial',
                            color: tHasColor ? tColor : 'initial'
                        }}>{attValArr[0].replace(/<[\/]{0,1}(em|EM|strong|STRONG|font|FONT|u|U)[^><]*>/g, "") + ": "}</span>
                    <span style={{
                        fontStyle: attValArr[1].toLowerCase().indexOf('<em>') > -1 ? 'italic' : 'normal',
                        fontWeight: attValArr[1].toLowerCase().indexOf('<strong>') > -1 ? 'bold' : 'normal',
                        textDecoration: attValArr[1].toLowerCase().indexOf('<u>') > -1 ? 'underline' : 'initial',
                        color: vHasColor ? vColor : 'initial'
                    }}>{attrValueCont}</span>
                </p>;
                attEleArray.push(attrib);
            });
        } else {
            const nrattrib: React.JSX.Element = <p className='rlabel' key={`${item.id}-empty`}> </p>;
            attEleArray.push(nrattrib);
        }
        return attEleArray;
    }

    render() {
        return (
            <div className="search-list-container" role="list">
                {this.props.items.map((item: listItem, i) => {
                    const itemId: string = item.id;
                    let iconType;
                    switch (item.type) {
                        case locateType.address:
                            iconType = mailboxIcon;
                            break;
                        case locateType.coordinate:
                            iconType = pinIcon;
                            break;
                        case locateType.reverse:
                            iconType = houseIcon;
                            break;
                    }
                    const recordLabel = item.title + '. ' + (item.content || '').replace(/<br>/g, ', ').replace(/<[^>]*>/g, '');
                    return (
                        <div key={itemId} className={`search-list-item${item.selected ? ' selected' : ''}${(i % 2 === 0) ? ' alt' : ''}`} id={itemId}
                            role="listitem"
                            onMouseOver={this.props.onRecordMouseOver} onMouseOut={this.props.onRecordMouseOut}>
                            <div className={'search-list-item-btn'} id={itemId}
                                role="button" tabIndex={0}
                                aria-label={recordLabel}
                                aria-current={item.selected ? 'true' : undefined}
                                onClick={this.props.onRecordClick}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        this.props.onRecordClick(e);
                                    }
                                }}>
                                <div className='iconDiv'><Icon icon={iconType} width='26px' height='26px' /></div>
                                <p id={itemId} className={'_title'} title={item.title}>{item.title}</p>
                                {this.getAttributeElements(item)}
                            </div>
                            <div className='removediv'>
                                <button type='button' className='removedivImg' id={itemId}
                                    title={this.props.removeResultMsg} aria-label={this.props.removeResultMsg + ': ' + item.title}
                                    onClick={this.props.onRecordRemoveClick}><CloseOutlined size={12} /></button>
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }
}