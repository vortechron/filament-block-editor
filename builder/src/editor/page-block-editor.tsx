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
    MediaFormattingToolbar,
    normalizeDocument,
    SpacingDragHandleMenu,
} from '@vortechron/blocknote-kit';
import { useEffect, useMemo } from 'react';
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
    onEditorReady?: (editor: BlockNoteEditor<any, any, any>) => void;
    slashMenuItems: SlashItems;
    slashMenuTopItems: SlashItems;
}) {
    const t = useT();
    const locale = useLocale();
    // Read once, like BlockNote does.
    const startingContent = useMemo(
        () => normalizeDocument(initialContent),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [],
    );
    const editor = useCreateBlockNote({
        schema: createPageSchema(),
        ...(kitEditorOptions() as Partial<BlockNoteEditorOptions<any, any, any>>),
        // BlockNote's own words in the builder's language.
        dictionary: blockNoteDictionary(locale) as never,
        initialContent: startingContent as never,
        uploadFile,
    });

    useEffect(() => {
        onEditorReady?.(editor as BlockNoteEditor<any, any, any>);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editor]);

    const look = appearanceToSurface(appearance);

    return (
        <div
            data-bnk-editor=""
            className={['bnk-blocknote', look.className].filter(Boolean).join(' ')}
            style={look.style}
        >
            <BlockNoteView
                editor={editor}
                theme="light"
                slashMenu={false}
                sideMenu={false}
                filePanel={false}
                formattingToolbar={false}
                onChange={() =>
                    onChange(editor.document as unknown as RichDocument)
                }
            >
                <FilePanelController />
                <FormattingToolbarController
                    formattingToolbar={(props) => (
                        <MediaFormattingToolbar
                            {...props}
                            fonts={[]}
                            useLibrary={false}
                        />
                    )}
                />
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
