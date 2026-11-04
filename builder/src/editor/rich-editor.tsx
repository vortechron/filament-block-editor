import '@blocknote/mantine/style.css';
import '@vortechron/blocknote-kit/style.css';
import '../styles/section-look.css';
import '../styles/section-look-style.css';
import type { BlockNoteEditor } from '@blocknote/core';
import type { Appearance } from '@vortechron/blocknote-kit';
import { type CSSProperties, useRef } from 'react';
import { useContentT, useT } from '@/lib/i18n';
import type { RichDocument, SectionData } from '@/types';
import { accentTokens } from './accent-tokens';
import { addLineBelowOnTap } from './add-line-below';
import { shopInfoSlashItems } from './dynamic-inline';
import { layoutSlashMenuItems } from './layout-slash-items';
import { PageBlockEditor } from './page-block-editor';
import {
    type PageBlocksInfo,
    PageBlocksContext,
    pageSlashMenuItems,
} from './page-blocks';

/**
 * The BlockNote editor from @vortechron/blocknote-kit (with the page
 * schema, see page-block-editor.tsx), for a section's words. It is a plain document on white, in the page's accent colour:
 * the page on the canvas already shows the section's real layout and
 * style, so the editor does not try to look like it (section-look.css
 * gives the page's own blocks their look).
 *
 * Loaded on its own in the builder's sidebar (see
 * builder/section-words.tsx), because BlockNote is large. It reads the
 * document once, when it opens.
 */
export default function RichEditor({
    data,
    accent,
    blocks,
    uploadFile,
    onDocumentChange,
    onEditorReady,
}: {
    data: SectionData;
    accent: string;
    blocks: PageBlocksInfo;
    uploadFile: (file: File) => Promise<string>;
    onDocumentChange: (document: RichDocument) => void;
    /** For the page builder, which adds and changes items from outside. */
    onEditorReady?: (editor: BlockNoteEditor) => void;
}) {
    const t = useT();
    const siteT = useContentT();
    const blockEditorRef = useRef<BlockNoteEditor | null>(null);

    return (
        <PageBlocksContext value={blocks}>
            <div
                className="nj-look nj-words"
                data-theme="classic"
                data-layout="plain"
                style={accentTokens(accent) as CSSProperties}
                onMouseDownCapture={(event) =>
                    addLineBelowOnTap(event, blockEditorRef.current)
                }
            >
                <PageBlockEditor
                    initialContent={data.document}
                    onEditorReady={(readyEditor) => {
                        blockEditorRef.current = readyEditor;
                        onEditorReady?.(readyEditor);
                    }}
                    onChange={onDocumentChange}
                    uploadFile={uploadFile}
                    appearance={WORDS_APPEARANCE}
                    slashMenuItems={(slashEditor) => [
                        ...pageSlashMenuItems(
                            slashEditor,
                            t,
                            blocks.ownBlocks.values(),
                            siteT,
                        ),
                        ...shopInfoSlashItems(
                            slashEditor,
                            t,
                            blocks.dynamicValues ?? [],
                        ),
                    ]}
                    slashMenuTopItems={(slashEditor) =>
                        layoutSlashMenuItems(slashEditor, data.layout, t)
                    }
                />
            </div>
        </PageBlocksContext>
    );
}

/** White, with little space around the words, to fit the sidebar. */
const WORDS_APPEARANCE: Appearance = {
    backgroundType: 'color',
    backgroundColor: null,
    padding: 'sm',
    contentWidth: 'full',
};
