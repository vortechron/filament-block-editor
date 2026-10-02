import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createBlockSpecFromTiptapNode, propsToAttributes } from '@blocknote/core';
import { ColumnListBlock } from '@blocknote/xl-multi-column';
import { SPACING_PROP_SCHEMA } from './block-spacing.jsx';

/**
 * Per-item width, counted in twelfths of the row the item sits on. Dragging
 * snaps to one of these columns, the way Qwilr's grid does.
 *
 * Keep in sync with BlockNoteRenderer::WIDTH_COLUMNS in PHP.
 */
export const WIDTH_COLUMNS = 12;

/**
 * Steps above WIDTH_COLUMNS. These stretch the item past the block's padding,
 * out towards the edge of the block. The last step reaches the edge exactly.
 *
 * Keep in sync with BlockNoteRenderer::BLEED_STEPS in PHP.
 */
export const BLEED_STEPS = 6;

const MAX_COLUMNS = WIDTH_COLUMNS + BLEED_STEPS;

/**
 * The narrowest an item may be dragged. Below this a paragraph is one word
 * per line and there is no way to grab it again.
 */
const MIN_COLUMNS = 2;

/**
 * How far outside the tracked item the pointer may stray before the frame is
 * dropped, in pixels. The handles sit on the item's own edge, so without this
 * the frame vanished the moment the pointer moved towards one of them.
 */
const HOVER_SLACK = 28;

/**
 * Block types the user can size and space individually. List items are left out
 * on purpose: a list reads as one group, so resizing or spacing a single bullet
 * looks broken. The spacer block is left out because it is already only space.
 */
const RESIZABLE_TYPES = new Set([
    'paragraph',
    'heading',
    'quote',
    'codeBlock',
    'image',
    'video',
    'audio',
    'file',
    'table',
]);

/**
 * Add the per-item `width`, `spaceTop` and `spaceBottom` props to every default
 * block the user may size and space.
 *
 * BlockNote builds each block's TipTap node from `config.propSchema` when the
 * schema is created, so a prop added here is saved in the document JSON and
 * rendered as `data-width` / `data-space-top` / `data-space-bottom` on the
 * block element. Blocks left at the default get no attribute at all, so
 * existing documents are untouched.
 */
export function withItemProps(blockSpecs) {
    return Object.fromEntries(
        Object.entries(blockSpecs).map(([type, spec]) => {
            if (! RESIZABLE_TYPES.has(type)) {
                return [type, spec];
            }

            return [
                type,
                {
                    ...spec,
                    config: {
                        ...spec.config,
                        propSchema: {
                            ...spec.config.propSchema,
                            width: { default: WIDTH_COLUMNS },
                            ...SPACING_PROP_SCHEMA,
                        },
                    },
                },
            ];
        }),
    );
}

/**
 * A column layout renders as its own element rather than as block content, so
 * both shapes have to be looked for.
 */
const RESIZABLE_SELECTOR = '.bn-block-content, .bn-block-column-list';

/**
 * The element under the pointer, if it is a block we let the user resize.
 */
function resizableElementAt(node, container) {
    const element = node instanceof Element ? node.closest(RESIZABLE_SELECTOR) : null;

    if (! element || ! container.contains(element)) {
        return null;
    }

    if (element.classList.contains('bn-block-column-list')) {
        return element;
    }

    return RESIZABLE_TYPES.has(element.getAttribute('data-content-type')) ? element : null;
}

function blockIdOf(element) {
    return element.closest('[data-id]')?.getAttribute('data-id') ?? null;
}

/**
 * The column layout block with the per-item props, so a two- or three-column
 * layout stretches and spaces like any other item.
 *
 * The multi-column package builds `columnList` straight from a TipTap node, so
 * withItemProps() cannot reach it: the node itself has to declare the
 * attributes. Hand the result to schema.extend() to replace the stock spec.
 */
export function columnListWithItemProps() {
    const extraProps = { width: { default: WIDTH_COLUMNS }, ...SPACING_PROP_SCHEMA };

    const node = ColumnListBlock.implementation.node.extend({
        addAttributes() {
            return {
                ...this.parent?.(),
                ...propsToAttributes(extraProps),
            };
        },
    });

    return createBlockSpecFromTiptapNode(
        { node, type: 'columnList', content: 'none' },
        { ...ColumnListBlock.config.propSchema, ...extraProps },
        ColumnListBlock.extensions,
    );
}

/**
 * The row an item is laid out in. `.bn-block` always spans the full text
 * column, even when the content inside it has been resized, so it is the
 * reference for turning a pointer position into a number of grid columns.
 */
function rowRectOf(element) {
    return (element.parentElement ?? element).getBoundingClientRect();
}

/**
 * Is the pointer still on, or just outside, the frame being shown? Both the
 * pointer and `box` are put in the layer's own coordinates first.
 */
function pointerNearBox(event, layer, box) {
    if (! box || ! layer) {
        return false;
    }

    const base = layer.getBoundingClientRect();
    const x = event.clientX - base.left;
    const y = event.clientY - base.top;

    return x >= box.left - HOVER_SLACK
        && x <= box.left + box.width + HOVER_SLACK
        && y >= box.top - HOVER_SLACK
        && y <= box.top + box.height + HOVER_SLACK;
}

/**
 * How wide, in pixels, an item is at a given number of grid columns. Up to
 * WIDTH_COLUMNS that is a share of the text column; above it the item eats into
 * the block's padding until it is as wide as the block.
 */
function widthForColumns(columns, rowWidth, blockWidth) {
    if (columns <= WIDTH_COLUMNS) {
        return (columns / WIDTH_COLUMNS) * rowWidth;
    }

    const stretch = Math.max(0, blockWidth - rowWidth);

    return rowWidth + ((columns - WIDTH_COLUMNS) / BLEED_STEPS) * stretch;
}

/**
 * The nearest grid column for a width in pixels. The reverse of
 * widthForColumns, so grabbing a handle never makes the item jump.
 */
function columnsForWidth(width, rowWidth, blockWidth, canStretch) {
    if (rowWidth <= 0) {
        return WIDTH_COLUMNS;
    }

    const stretch = blockWidth - rowWidth;

    if (width <= rowWidth || ! canStretch || stretch <= 0) {
        return Math.min(WIDTH_COLUMNS, Math.max(MIN_COLUMNS, Math.round((width / rowWidth) * WIDTH_COLUMNS)));
    }

    const step = Math.round(((width - rowWidth) / stretch) * BLEED_STEPS);

    return WIDTH_COLUMNS + Math.min(BLEED_STEPS, Math.max(0, step));
}

/**
 * What the chip above the item says while dragging.
 */
function readoutFor(columns) {
    if (columns === MAX_COLUMNS) {
        return 'Edge to edge';
    }

    if (columns > WIDTH_COLUMNS) {
        return `Past padding ${columns - WIDTH_COLUMNS} / ${BLEED_STEPS}`;
    }

    return `${columns} / ${WIDTH_COLUMNS}`;
}

/**
 * Drag handles on the left and right edge of the item under the pointer, plus
 * the column guide that appears while dragging.
 *
 * Rendered inside BlockNoteView, so it sits in `.bn-container`, which the admin
 * theme makes a positioned ancestor.
 */
export function BlockItemControls({ editor, editable }) {
    // A state ref, not useRef: the effects below must re-run once the overlay
    // is in the DOM. The editor's own element does not exist yet on first
    // render, so listening on it there would attach nothing.
    const [layer, setLayer] = useState(null);
    // The tracked item is held by block id, not by element. Editing a block
    // replaces its DOM node, so a stored element goes stale on every drag step.
    const blockIdRef = useRef(null);
    const draggingRef = useRef(false);
    const [box, setBox] = useState(null);
    // The last measured box, readable from event handlers without re-binding
    // them on every measurement.
    const boxRef = useRef(null);
    // Clicking an item pins the frame to it, so the handles stay put while the
    // pointer travels to them. Escape, or clicking another item, releases it.
    const [pinnedId, setPinnedId] = useState(null);
    const pinnedRef = useRef(null);
    const [dragColumns, setDragColumns] = useState(null);

    pinnedRef.current = pinnedId;

    const wrapper = layer?.closest('.fbe-blocknote') ?? null;

    // Publish the block's outer width so the stylesheet can work out how far a
    // stretched item may reach. A CSS container query would do this without
    // JavaScript, but `container-type` also turns on layout containment, which
    // moves BlockNote's floating menus off their anchors.
    useEffect(() => {
        if (! wrapper) {
            return undefined;
        }

        const sync = () => {
            wrapper.style.setProperty('--fbe-bleed-full', `${wrapper.getBoundingClientRect().width}px`);
        };

        sync();

        const observer = new ResizeObserver(sync);
        observer.observe(wrapper);

        return () => observer.disconnect();
    }, [wrapper]);

    const elementForBlock = useCallback(
        (blockId) => {
            const container = layer?.parentElement;

            if (! blockId || ! container) {
                return null;
            }

            const id = CSS.escape(blockId);

            return container.querySelector(
                `[data-id="${id}"] > .bn-block-content, .bn-block-column-list[data-id="${id}"]`,
            );
        },
        [layer],
    );

    // Put the overlay over the tracked item, in the layer's own coordinates.
    // The box is state, so the handles move with it.
    const measure = useCallback(() => {
        const element = elementForBlock(blockIdRef.current);

        if (! element || ! layer) {
            boxRef.current = null;
            setBox(null);

            return;
        }

        const item = element.getBoundingClientRect();
        const row = rowRectOf(element);
        const base = layer.getBoundingClientRect();
        const block = wrapper ? wrapper.getBoundingClientRect() : row;

        const next = {
            left: item.left - base.left,
            top: item.top - base.top,
            width: item.width,
            height: item.height,
            rowWidth: row.width,
            blockLeft: block.left - base.left,
            blockWidth: block.width,
        };

        boxRef.current = next;
        setBox(next);
    }, [elementForBlock, layer, wrapper]);

    const track = useCallback(
        (element) => {
            blockIdRef.current = element ? blockIdOf(element) : null;
            measure();
        },
        [measure],
    );

    useEffect(() => {
        // The overlay does not take pointer events, so these bubble up from
        // the editor to the container the overlay sits in.
        const container = layer?.parentElement;

        if (! container || ! editable) {
            return undefined;
        }

        const onPointerMove = (event) => {
            if (draggingRef.current || pinnedRef.current) {
                return;
            }

            // Moving onto a handle must not clear the frame that handle
            // belongs to, or the frame flickers and the handle is unclickable.
            if (event.target instanceof Element && event.target.closest('.fbe-width-layer')) {
                return;
            }

            const element = resizableElementAt(event.target, container);

            // The gap between the item's edge and its handle is not part of
            // the item, so keep the frame while the pointer is crossing it.
            if (! element && blockIdRef.current && pointerNearBox(event, layer, boxRef.current)) {
                return;
            }

            track(element);
        };

        const onPointerLeave = () => {
            if (! draggingRef.current && ! pinnedRef.current) {
                track(null);
            }
        };

        container.addEventListener('pointermove', onPointerMove);
        container.addEventListener('pointerleave', onPointerLeave);

        return () => {
            container.removeEventListener('pointermove', onPointerMove);
            container.removeEventListener('pointerleave', onPointerLeave);
        };
    }, [layer, editable, track]);

    // Clicking inside the text area pins the frame to the item clicked, or
    // clears the pin when the click lands on an item that cannot be resized.
    // Clicks on the toolbars, the side menu and the handles are left alone so
    // they do not drop a pin the user just set.
    useEffect(() => {
        const container = layer?.parentElement;

        if (! container || ! editable) {
            return undefined;
        }

        const onPointerDown = (event) => {
            if (! (event.target instanceof Element) || ! event.target.closest('.bn-editor')) {
                return;
            }

            const element = resizableElementAt(event.target, container);

            setPinnedId(element ? blockIdOf(element) : null);

            // Releasing the pin on an item that cannot be resized must also
            // take the frame away, even if the pointer never moves again.
            if (! element) {
                track(null);
            }
        };

        const onKeyDown = (event) => {
            if (event.key === 'Escape' && pinnedRef.current) {
                setPinnedId(null);
                track(null);
            }
        };

        document.addEventListener('pointerdown', onPointerDown, true);
        document.addEventListener('keydown', onKeyDown);

        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [layer, editable, track]);

    // A pinned frame outlives the pointer, so it has to be re-measured itself:
    // typing, an image loading or the panel resizing all move the item.
    useEffect(() => {
        if (! pinnedId) {
            return undefined;
        }

        blockIdRef.current = pinnedId;
        measure();

        const remeasure = () => requestAnimationFrame(measure);
        const unsubscribe = editor.onChange(remeasure);
        const observer = wrapper ? new ResizeObserver(remeasure) : null;

        observer?.observe(wrapper);

        return () => {
            unsubscribe?.();
            observer?.disconnect();
        };
    }, [pinnedId, editor, measure, wrapper]);

    const onHandleDown = useCallback(
        (event) => {
            const blockId = blockIdRef.current;
            const element = elementForBlock(blockId);

            if (! element) {
                return;
            }

            event.preventDefault();
            event.stopPropagation();

            try {
                event.currentTarget.setPointerCapture(event.pointerId);
            } catch {
                // Nothing to capture (a synthetic event has no real pointer).
                // The window listeners below still follow the drag.
            }

            draggingRef.current = true;
            // Keep the frame after the drag so the item can be nudged again.
            setPinnedId(blockId);

            // Everything the drag measures against is fixed for its duration:
            // resizing the item changes neither its row nor the block's edge.
            const rowWidth = rowRectOf(element).width;
            const blockWidth = wrapper ? wrapper.getBoundingClientRect().width : rowWidth;
            // An item inside a multi-column layout can only be centred on its
            // own column, so stretching it would hang off to one side.
            const canStretch = ! element.closest('.bn-block-column');
            // A centred item grows from both edges at once, so one pixel of
            // pointer travel is two pixels of width.
            const scale = element.getAttribute('data-text-alignment') === 'center' ? 2 : 1;
            // Dragging the left handle outwards means left, not right.
            const direction = event.currentTarget.classList.contains('is-start') ? -1 : 1;
            const startX = event.clientX;

            let current = Number(element.getAttribute('data-width')) || WIDTH_COLUMNS;

            // Measured from where the item is now, so grabbing a handle never
            // makes it jump before you have moved.
            const startWidth = widthForColumns(current, rowWidth, blockWidth);

            setDragColumns(current);

            const stop = () => {
                draggingRef.current = false;
                setDragColumns(null);
                window.removeEventListener('pointermove', onMove);
                window.removeEventListener('pointerup', stop);
                window.removeEventListener('pointercancel', stop);
                requestAnimationFrame(measure);
            };

            const onMove = (moveEvent) => {
                // Re-read the element: updating the block replaced the old one.
                if (! elementForBlock(blockId)) {
                    stop();

                    return;
                }

                const width = startWidth + direction * (moveEvent.clientX - startX) * scale;
                const columns = columnsForWidth(width, rowWidth, blockWidth, canStretch);

                if (columns === current) {
                    return;
                }

                current = columns;
                setDragColumns(columns);

                try {
                    editor.updateBlock(blockId, { props: { width: columns } });
                } catch (error) {
                    // The block went away mid-drag (an undo, a Livewire
                    // re-render). Stop rather than throw at the user.
                    console.error('Could not resize block:', error);
                    stop();

                    return;
                }

                requestAnimationFrame(measure);
            };

            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', stop);
            window.addEventListener('pointercancel', stop);
        },
        [editor, elementForBlock, measure, wrapper],
    );

    const dragging = dragColumns !== null;
    const pinned = pinnedId !== null && pinnedId === blockIdRef.current;
    // The layer is always rendered, even read-only: the width effect hangs off
    // it, and a read-only editor still has to show stretched items correctly.
    const showFrame = Boolean(editable && box);
    const gutter = box ? Math.max(0, (box.blockWidth - box.rowWidth) / 2) : 0;

    return (
        <div className="fbe-width-layer" ref={setLayer}>
            {showFrame && (
                <div
                    className={['fbe-width-frame', dragging ? 'is-dragging' : '', pinned ? 'is-pinned' : '']
                        .filter(Boolean)
                        .join(' ')}
                    style={{
                        left: `${box.left}px`,
                        top: `${box.top}px`,
                        width: `${box.width}px`,
                        height: `${box.height}px`,
                    }}
                >
                    <span className="fbe-width-handle is-start" onPointerDown={onHandleDown} />
                    <span className="fbe-width-handle is-end" onPointerDown={onHandleDown} />
                    {dragging && <span className="fbe-width-readout">{readoutFor(dragColumns)}</span>}
                </div>
            )}

            {showFrame && dragging && (
                <div
                    className="fbe-width-grid"
                    style={{
                        left: `${box.blockLeft}px`,
                        top: `${box.top}px`,
                        width: `${box.blockWidth}px`,
                        height: `${box.height}px`,
                    }}
                >
                    <span className="fbe-width-grid-part is-gutter" style={{ width: `${gutter}px` }}>
                        {Array.from({ length: BLEED_STEPS }, (_, index) => (
                            <span key={index} />
                        ))}
                    </span>
                    <span className="fbe-width-grid-part" style={{ width: `${box.rowWidth}px` }}>
                        {Array.from({ length: WIDTH_COLUMNS }, (_, index) => (
                            <span key={index} />
                        ))}
                    </span>
                    <span className="fbe-width-grid-part is-gutter" style={{ width: `${gutter}px` }}>
                        {Array.from({ length: BLEED_STEPS }, (_, index) => (
                            <span key={index} />
                        ))}
                    </span>
                </div>
            )}
        </div>
    );
}
