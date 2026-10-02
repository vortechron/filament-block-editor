import React from 'react';
import { insertOrUpdateBlockForSlashMenu } from '@blocknote/core';
import { FilePanelExtension } from '@blocknote/core/extensions';
import { createReactBlockSpec } from '@blocknote/react';

// "Card" block: a fold-out card like Qwilr's accordion. The block's own text
// is the title, `url` an optional banner picture, and the blocks nested under
// it (Tab) are the body the customer opens with the Show button. The customer
// page draws it in BlockNoteRenderer::card(); the editor always shows the body.

// Keep in sync with BlockNoteRenderer::CARD_BUTTON_COLOR in PHP.
export const CARD_BUTTON_COLOR = '#f6c343';

const BUTTON_SWATCHES = ['#f6c343', '#153b59', '#111827', '#ffffff'];

/**
 * The same brightness test as Vortechron\FilamentBlockEditor\Support\BlockColor::isDark(), so the
 * button text turns light or dark here exactly as it will for the customer.
 */
function isDark(hex) {
    const match = /^#?([0-9a-f]{6})$/i.exec(hex || '');

    if (!match) return false;

    const value = parseInt(match[1], 16);
    const red = (value >> 16) & 255;
    const green = (value >> 8) & 255;
    const blue = value & 255;

    return (red * 299 + green * 587 + blue * 114) / 1000 < 128;
}

function buttonColorOf(block) {
    const color = block.props.buttonColor;

    return /^#[0-9a-f]{6}$/i.test(color || '') ? color.toLowerCase() : CARD_BUTTON_COLOR;
}

// Pressing a control must not pull the caret out of the title, or
// editor.updateBlock has no selection to restore and the caret jumps.
const keepSelection = (event) => event.preventDefault();

function CardControls({ block, editor }) {
    const color = buttonColorOf(block);
    const update = (props) => editor.updateBlock(block, { props });

    return (
        <div className="fbe-card-controls" contentEditable={false}>
            <button
                type="button"
                onMouseDown={keepSelection}
                onClick={() => editor.getExtension(FilePanelExtension).showMenu(block.id)}
            >
                {block.props.url ? 'Change banner' : 'Add banner image'}
            </button>
            {block.props.url && (
                <button type="button" onMouseDown={keepSelection} onClick={() => update({ url: '' })}>
                    Remove banner
                </button>
            )}
            <span className="fbe-card-swatches" role="group" aria-label="Show button colour">
                {BUTTON_SWATCHES.map((swatch) => (
                    <button
                        key={swatch}
                        type="button"
                        title={swatch}
                        aria-label={`Button colour ${swatch}`}
                        className={swatch === color ? 'is-active' : ''}
                        style={{ backgroundColor: swatch }}
                        onMouseDown={keepSelection}
                        onClick={() => update({ buttonColor: swatch })}
                    />
                ))}
                <input
                    type="color"
                    value={color}
                    title="Any colour"
                    aria-label="Any button colour"
                    onChange={(event) => update({ buttonColor: event.target.value })}
                />
            </span>
            <button
                type="button"
                className={block.props.open ? 'is-active' : ''}
                onMouseDown={keepSelection}
                onClick={() => update({ open: !block.props.open })}
            >
                {block.props.open ? 'Starts open' : 'Starts closed'}
            </button>
        </div>
    );
}

export const cardSpec = createReactBlockSpec(
    {
        type: 'card',
        propSchema: {
            url: { default: '' },
            buttonColor: { default: CARD_BUTTON_COLOR },
            open: { default: false },
        },
        content: 'inline',
    },
    {
        render: ({ block, editor, contentRef }) => {
            const color = buttonColorOf(block);

            return (
                <div className="fbe-card">
                    <div className={`fbe-card-head${block.props.url ? ' has-image' : ''}`}>
                        {block.props.url && (
                            <img
                                className="fbe-card-image"
                                src={block.props.url}
                                alt=""
                                draggable={false}
                                contentEditable={false}
                            />
                        )}
                        <div className="fbe-card-title" ref={contentRef} />
                        <span
                            className="fbe-card-toggle"
                            contentEditable={false}
                            style={{ backgroundColor: color, color: isDark(color) ? '#ffffff' : '#111827' }}
                        >
                            Show →
                        </span>
                    </div>
                    {editor.isEditable && <CardControls block={block} editor={editor} />}
                    {/* Hidden by theme.css once the card has a body. */}
                    {editor.isEditable && (
                        <p className="fbe-card-hint" contentEditable={false}>
                            To put content inside, press Enter at the end of the title, then Tab. Everything
                            indented under this card opens when the customer presses Show.
                        </p>
                    )}
                </div>
            );
        },
    },
);

export function cardSlashMenuItem(editor) {
    return {
        title: 'Card',
        subtext: 'A banner that opens to show more',
        aliases: ['card', 'accordion', 'toggle', 'collapse', 'show', 'hide', 'faq', 'fold'],
        group: 'Basic blocks',
        icon: (
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <rect x="1.5" y="2.5" width="15" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 12h10M4 15h7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
        ),
        onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'card' }),
    };
}
