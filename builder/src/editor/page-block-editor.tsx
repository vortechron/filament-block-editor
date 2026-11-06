import {
    type BlockNoteEditor,
    type BlockNoteEditorOptions,
    filterSuggestionItems,
} from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import {
    AddBlockButton,
    DragHandleButton,
    FilePanelController,
    FormattingToolbarController,
    FormattingToolbar,
    getFormattingToolbarItems,
    LinkToolbarController,
    SideMenu,
    SideMenuController,
    SuggestionMenuController,
    useCreateBlockNote,
} from '@blocknote/react';
import {
    type Appearance,
    appearanceToSurface,
    BlockItemControls,
    kitEditorOptions,
    normalizeDocument,
    SpacingDragHandleMenu,
} from '@vortechron/blocknote-kit';
import { linkOrReference } from '@/blocks/button-url';
import { CreatePageLinkButton, PageLinkToolbar } from './page-link-controls';
import { HostContext } from '@/lib/host';
import {
    retainTableIdentities,
    editTableCell,
    tableContent,
    copyTableIdentities,
    type IdentifiedTableEditor,
} from '@/lib/table-identities';
import {
    useEffect,
    useEffectEvent,
    useMemo,
    useRef,
    useState,
    useContext,
} from 'react';
import { useLocale, useT } from '@/lib/i18n';
import type { RichDocument } from '@/types';
import { blockNoteDictionary } from './blocknote-dictionary';
import { createPageSchema } from './page-schema';
import { pageSlashMenuItems } from './slash-menu';

type SlashItems = (editor: BlockNoteEditor<any, any, any>) => any[];

/**
 * blocknote-kit's BlockEditor, put together from the kit's own parts with
 * the page schema (page-schema.ts), so every block has the `look` prop,
 * and BlockNote's words in the builder's language (blocknote-dictionary.ts).
 * The kit's editor makes its schema inside, where the columns can not get
 * one more prop. No media library and no font picker: the builder uses
 * neither.
 *
 * BlockNote reads `initialContent` once. To show another document, mount
 * a new editor (give it a new `key`).
 */
export function PageBlockEditor({
    initialContent,
    onChange,
    uploadFile,
    appearance,
    onEditorReady,
    slashMenuItems,
    slashMenuTopItems,
}: {
    initialContent: RichDocument;
    onChange: (document: RichDocument) => void;
    uploadFile: (file: File) => Promise<string>;
    appearance: Appearance;
    onEditorReady?: (
        editor: BlockNoteEditor<any, any, any>,
        tables?: IdentifiedTableEditor,
    ) => void;
    slashMenuItems: SlashItems;
    slashMenuTopItems: SlashItems;
}) {
    const t = useT();
    const fieldLanguages = useContext(HostContext)?.fieldLanguages;
    const [tableError, setTableError] = useState<string | null>(null);
    const locale = useLocale();
    // Read once, like BlockNote does.
    const startingContent = useMemo(
        () => normalizeDocument(initialContent),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );
    const editor = useCreateBlockNote({
        schema: createPageSchema(),
        ...(kitEditorOptions() as Partial<
            BlockNoteEditorOptions<any, any, any>
        >),
        links: { isValidLink: (href) => linkOrReference(href) !== null },
        // BlockNote's own words in the builder's language.
        dictionary: blockNoteDictionary(locale) as never,
        initialContent: startingContent as never,
        uploadFile,
    });

    const look = appearanceToSurface(appearance);
    const safeEditor = useRef(editor.document as unknown as RichDocument);
    const canonical = useRef(initialContent);
    const restoring = useRef(false);
    const report = useEffectEvent(onChange);

    useEffect(() => {
        onEditorReady?.(
            editor as BlockNoteEditor<any, any, any>,
            fieldLanguages
                ? {
                      content: (id) => tableContent(canonical.current, id),
                      setCell: (edit) => {
                          const next = editTableCell(canonical.current, edit);
                          // Only this operation knows which cell was edited. Do not run
                          // native table identity inference for an explicitly named cell.
                          canonical.current = next;
                          restoring.current = true;
                          try {
                              editor.updateBlock(edit.tableId, {
                                  content: tableContent(next, edit.tableId),
                              } as never);
                          } finally {
                              restoring.current = false;
                          }
                          const document =
                              editor.document as unknown as RichDocument;
                          safeEditor.current = structuredClone(document);
                          const value = retainTableIdentities(
                              next,
                              document,
                              document,
                          );
                          canonical.current = value;
                          report(value);
                          setTableError(null);
                      },
                      copied: (mapping) => {
                        const next = copyTableIdentities(
                              canonical.current,
                              mapping,
                          );
                        if (next === canonical.current) return;
                        canonical.current = next;
                        report(next);
                      },
                  }
                : undefined,
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor]);

    return (
        <div
            data-bnk-editor=""
            className={['bnk-blocknote', look.className]
                .filter(Boolean)
                .join(' ')}
            style={look.style}
        >
            {tableError && (
                <p role="alert" className="text-destructive p-3 text-sm">
                    {t(tableError)}
                </p>
            )}
            <BlockNoteView
                editor={editor}
                theme="light"
                slashMenu={false}
                // No ":" emoji picker: its data is a quarter of the builder's
                // file (bin/build.js leaves it out). Phones and computers
                // have their own emoji keyboards.
                emojiPicker={false}
                sideMenu={false}
                filePanel={false}
                formattingToolbar={false}
                linkToolbar={false}
                onChange={() => {
                    if (restoring.current) return;
                    const document = editor.document as unknown as RichDocument;
                    try {
                        const next = fieldLanguages
                            ? retainTableIdentities(
                                  canonical.current,
                                  safeEditor.current,
                                  document,
                              )
                            : document;
                        safeEditor.current = structuredClone(document);
                        canonical.current = next;
                        onChange(next);
                    } catch (error) {
                        restoring.current = true;
                        editor.replaceBlocks(
                            editor.document,
                            safeEditor.current as never,
                        );
                        restoring.current = false;
                        setTableError(
                            error instanceof Error
                                ? error.message
                                : 'Table cells changed without stable identities. Restore the table and edit its identified fields, or rebuild its translations.',
                        );
                    }
                }}
            >
                <FilePanelController />
                <FormattingToolbarController
                    formattingToolbar={(props) => (
                        <FormattingToolbar {...props}>
                            {getFormattingToolbarItems(
                                props.blockTypeSelectItems,
                            ).map((item) =>
                                item.key === 'createLinkButton' ? (
                                    <CreatePageLinkButton key={item.key} />
                                ) : (
                                    item
                                ),
                            )}
                        </FormattingToolbar>
                    )}
                />
                <LinkToolbarController linkToolbar={PageLinkToolbar} />
                {/* The kit's side menu: the spacing entries in the drag
                    handle's dropdown. */}
                <SideMenuController
                    sideMenu={(props) => (
                        <SideMenu {...props}>
                            <AddBlockButton />
                            <DragHandleButton
                                {...props}
                                dragHandleMenu={SpacingDragHandleMenu}
                            />
                        </SideMenu>
                    )}
                />
                <SuggestionMenuController
                    triggerCharacter="/"
                    getItems={async (query) =>
                        filterSuggestionItems(
                            pageSlashMenuItems(
                                editor as never,
                                t,
                                slashMenuItems(editor as never),
                                slashMenuTopItems(editor as never),
                            ) as never,
                            query,
                        )
                    }
                />
                <BlockItemControls editor={editor} editable />
            </BlockNoteView>
        </div>
    );
}
