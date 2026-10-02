import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import {
    BlockNoteSchema,
    combineByGroup,
    defaultBlockSpecs,
    defaultStyleSpecs,
    filterSuggestionItems,
    insertOrUpdateBlockForSlashMenu,
} from '@blocknote/core';
import { en as coreEn } from '@blocknote/core/locales';
import {
    AddBlockButton,
    DragHandleButton,
    FormattingToolbarController,
    SideMenu,
    SideMenuController,
    SuggestionMenuController,
    createReactBlockSpec,
    getDefaultReactSlashMenuItems,
    useCreateBlockNote,
} from '@blocknote/react';
import { BlockNoteView } from '@blocknote/mantine';
import {
    insertColumnList,
    locales as multiColumnLocales,
    multiColumnDropCursor,
    withMultiColumn,
} from '@blocknote/xl-multi-column';
import { BlockItemControls, columnListWithItemProps, withItemProps } from './block-width.jsx';
import { SpacingDragHandleMenu } from './block-spacing.jsx';
import { cardSlashMenuItem, cardSpec } from './card-block.jsx';
import { fontFamilyStyleSpec } from './font-family.jsx';
import { withVideoEmbeds } from './video-embed.js';
import { registerEditor } from './variables.js';
import { MediaFilePanelController, MediaFormattingToolbar, MediaLibraryDialog } from './media-library.jsx';

// Livewire round-trips JSON through PHP, where empty JS objects ({}) become
// empty arrays ([]). BlockNote requires `props`/`styles` to be objects, so
// restore them before handing a document back as initialContent.
const OBJECT_KEYS = new Set(['props', 'styles']);

function normalize(value, key = null) {
    if (Array.isArray(value)) {
        if (value.length === 0 && OBJECT_KEYS.has(key)) {
            return {};
        }

        return value.map((item) => normalize(item));
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([childKey, childValue]) => [childKey, normalize(childValue, childKey)]),
        );
    }

    return value;
}

function readXsrfToken() {
    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);

    return match ? decodeURIComponent(match[1]) : '';
}

// "Spacer" block: adjustable empty vertical space, like Qwilr's spacers.
// Keep the size map in sync with BlockNoteRenderer::spacerHeight() in PHP.
const SPACER_SIZES = { sm: '1rem', md: '2.5rem', lg: '5rem', xl: '8rem' };

const spacerSpec = createReactBlockSpec(
    {
        type: 'spacer',
        propSchema: {
            size: { default: 'md', values: Object.keys(SPACER_SIZES) },
        },
        content: 'none',
    },
    {
        render: ({ block, editor }) => (
            <div
                className="fbe-spacer"
                style={{ height: SPACER_SIZES[block.props.size] ?? SPACER_SIZES.md }}
            >
                <div className="fbe-spacer-controls" contentEditable={false}>
                    {Object.keys(SPACER_SIZES).map((size) => (
                        <button
                            key={size}
                            type="button"
                            className={size === block.props.size ? 'is-active' : ''}
                            onClick={() => editor.updateBlock(block, { props: { size } })}
                        >
                            {size.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>
        ),
    },
);

function spacerSlashMenuItem(editor) {
    return {
        title: 'Spacer',
        subtext: 'Adjustable empty vertical space',
        aliases: ['spacer', 'space', 'gap', 'padding', 'margin'],
        group: 'Basic blocks',
        icon: <span style={{ fontSize: '14px' }}>↕</span>,
        onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: 'spacer' }),
    };
}

/**
 * How many columns each entry inserts, keyed by the dictionary entry that
 * names it. The package ships no icons for a rebuilt schema, so draw them.
 */
const COLUMN_MENU_ENTRIES = { two_columns: 2, three_columns: 3 };

function ColumnsIcon({ count }) {
    const gap = 2;
    const width = (17 - gap * (count - 1)) / count;

    return (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            {Array.from({ length: count }, (_, index) => (
                <rect
                    key={index}
                    x={0.5 + index * (width + gap)}
                    y="2.5"
                    width={width}
                    height="13"
                    rx="1.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                />
            ))}
        </svg>
    );
}

/**
 * "Two Columns" / "Three Columns" entries for the slash menu.
 *
 * The package's own getMultiColumnSlashMenuItems() cannot be used here. It
 * hides both entries unless `editor.schema.blockSchema.columnList` is the very
 * same object the package exports, and columnListWithItemProps() replaces that
 * object to add the width and spacing props. Build the entries from the
 * package's own insertColumnList() and dictionary instead.
 */
function columnSlashMenuItems(editor) {
    return Object.entries(COLUMN_MENU_ENTRIES).map(([entry, count]) => ({
        ...multiColumnLocales.en.slash_menu[entry],
        icon: <ColumnsIcon count={count} />,
        onItemClick: () => insertColumnList(editor, count),
    }));
}

function Editor({ initialContent, onChange, uploadUrl, mediaUrl, fonts, readOnly, mountElement }) {
    const editor = useCreateBlockNote({
        // withMultiColumn adds its own columnList spec, so the extended one has
        // to replace it afterwards.
        schema: withMultiColumn(BlockNoteSchema.create({
            blockSpecs: withItemProps(withVideoEmbeds({
                ...defaultBlockSpecs,
                spacer: spacerSpec(),
            card: cardSpec(),
            })),
            // The typeface picker's inline style. See resources/js/font-family.jsx.
            styleSpecs: {
                ...defaultStyleSpecs,
                fontFamily: fontFamilyStyleSpec(fonts),
            },
        })).extend({
            blockSpecs: {
                columnList: columnListWithItemProps(),
            },
        }),
        dropCursor: multiColumnDropCursor,
        dictionary: {
            ...coreEn,
            multi_column: multiColumnLocales.en,
        },
        initialContent,
        uploadFile: async (file) => {
            const body = new FormData();
            body.append('file', file);

            const response = await fetch(uploadUrl, {
                method: 'POST',
                headers: {
                    'X-XSRF-TOKEN': readXsrfToken(),
                    Accept: 'application/json',
                },
                body,
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error('Upload failed');
            }

            const json = await response.json();

            return json.url;
        },
    });

    // Register this editor so the Variables panel can insert tokens into it
    // once the user has clicked inside.
    useEffect(() => registerEditor(mountElement, editor), [editor, mountElement]);

    return (
        <>
        {!readOnly && <MediaLibraryDialog editor={editor} mediaUrl={mediaUrl} uploadUrl={uploadUrl} csrfToken={readXsrfToken} />}
        <BlockNoteView
            editor={editor}
            editable={!readOnly}
            theme="light"
            slashMenu={false}
            sideMenu={false}
            filePanel={false}
            formattingToolbar={false}
            onChange={() => onChange(editor.document)}
        >
            <MediaFilePanelController />
            <FormattingToolbarController
                formattingToolbar={(props) => <MediaFormattingToolbar {...props} fonts={fonts} />}
            />
            {/* The stock side menu, but with the spacing entries added to the
                drag handle's dropdown. See resources/js/block-spacing.jsx. */}
            <SideMenuController
                sideMenu={(props) => (
                    <SideMenu {...props}>
                        <AddBlockButton {...props} />
                        <DragHandleButton {...props} dragHandleMenu={SpacingDragHandleMenu} />
                    </SideMenu>
                )}
            />
            <SuggestionMenuController
                triggerCharacter="/"
                getItems={async (query) =>
                    filterSuggestionItems(
                        combineByGroup(
                            getDefaultReactSlashMenuItems(editor),
                            columnSlashMenuItems(editor),
                            [spacerSlashMenuItem(editor), cardSlashMenuItem(editor)],
                        ),
                        query,
                    )
                }
            />
            <BlockItemControls editor={editor} editable={!readOnly} />
        </BlockNoteView>
        </>
    );
}

/**
 * Mount the editor into an element and return the React root, so the caller
 * can unmount it again. `options.get()` / `options.set()` read and write the
 * Livewire-entangled document.
 */
export function mountBlockNote(el, options) {
    if (el.dataset.blocknoteMounted) {
        return null;
    }

    el.dataset.blocknoteMounted = '1';

    const raw = options.get();
    const initialContent = Array.isArray(raw) && raw.length > 0 ? normalize(raw) : undefined;
    const root = createRoot(el);

    root.render(
        <Editor
            initialContent={initialContent}
            onChange={(document) => options.set(document)}
            uploadUrl={options.uploadUrl}
            mediaUrl={options.mediaUrl}
            fonts={options.fonts ?? []}
            readOnly={options.readOnly}
            mountElement={el}
        />,
    );

    return root;
}
