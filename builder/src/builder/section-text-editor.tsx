import { useEffect, useEffectEvent, useState } from 'react';
import { serializeForm } from '@/lib/form-definition';
import { starterForm } from '@/lib/form-starter';
import { newItemWords } from '@/lib/new-item-words';
import { useContentT, useT } from '@/lib/i18n';
import type { RichDocument, SectionData } from '@/types';
import type { PageBlocksInfo } from '../editor/page-blocks';
import RichEditor from '../editor/rich-editor';
import { createSectionEditorHandle } from './section-editor-handle';
import type { SectionEditorHandle } from './types';

/**
 * The picked section's words, in the sidebar. Loaded on its own with
 * BlockNote (see section-words.tsx), and tells the builder how to reach
 * the editor while it is open.
 *
 * An undo or a redo opens it again with the restored words. Every change
 * it reports then still counts; one that only writes back the words the
 * page already holds records nothing (usePageState skips the same page).
 */
export default function SectionTextEditor({
    data,
    accent,
    blocks,
    uploadFile,
    onDocumentChange,
    onHandle,
}: {
    data: SectionData;
    accent: string;
    blocks: PageBlocksInfo;
    uploadFile: (file: File) => Promise<string>;
    onDocumentChange: (document: RichDocument) => void;
    onHandle: (handle: SectionEditorHandle | null) => void;
}) {
    const t = useT();
    const siteT = useContentT();
    const [handle, setHandle] = useState<SectionEditorHandle | null>(null);
    const report = useEffectEvent(onHandle);

    useEffect(() => {
        if (handle === null) {
            return;
        }

        report(handle);

        return () => report(null);
    }, [handle]);

    return (
        <RichEditor
            data={data}
            accent={accent}
            blocks={blocks}
            uploadFile={uploadFile}
            onDocumentChange={onDocumentChange}
            onEditorReady={(editor) =>
                setHandle(
                    createSectionEditorHandle(editor, {
                        button: siteT('Read more'),
                        form: serializeForm(starterForm(t, siteT)),
                        words: newItemWords(siteT),
                    }),
                )
            }
        />
    );
}
