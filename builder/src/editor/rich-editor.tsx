import '@blocknote/mantine/style.css';
import '@vortechron/blocknote-kit/style.css';
import '../styles/section-look.css';
import '../styles/section-look-style.css';
import type { BlockNoteEditor } from '@blocknote/core';
import { type Appearance, BlockEditor } from '@vortechron/blocknote-kit';
import { type CSSProperties, useRef } from 'react';
import { useT } from '@/lib/i18n';
import type { RichDocument, SectionData } from '@/types';
import { accentTokens } from './accent-tokens';
import { addLineBelowOnTap } from './add-line-below';
import { layoutSlashMenuItems } from './layout-slash-items';
import {
    type PageBlocksInfo,
    PageBlocksContext,
    pageBlockSpecs,
    pageSlashMenuItems,
} from './page-blocks';

/**
 * The BlockNote editor from @vortechron/blocknote-kit, for a section's
 * words. It is a plain document on white, in the page's accent colour:
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
                <BlockEditor
                    initialContent={data.document}
                    onEditorReady={(readyEditor: BlockNoteEditor) => {
                        blockEditorRef.current = readyEditor;
                        onEditorReady?.(readyEditor);
                    }}
                    onChange={(document) =>
                        onDocumentChange(document as RichDocument)
                    }
                    uploadFile={uploadFile}
                    appearance={WORDS_APPEARANCE}
                    blockSpecs={pageBlockSpecs}
                    slashMenuItems={(slashEditor) =>
                        pageSlashMenuItems(
                            slashEditor,
                            t,
                            blocks.ownBlocks.values(),
                        )
                    }
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
