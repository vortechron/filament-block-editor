import '@blocknote/mantine/style.css';
import {
    BlockNoteSchema,
    defaultBlockSpecs,
    defaultInlineContentSpecs,
    defaultStyleSpecs,
} from '@blocknote/core';
import { BlockNoteView } from '@blocknote/mantine';
import {
    useCreateBlockNote,
    FormattingToolbarController,
    FormattingToolbar,
    getFormattingToolbarItems,
    LinkToolbarController,
} from '@blocknote/react';
import { fontFamilyStyleSpec } from '@vortechron/blocknote-kit';
import { useEffect, useEffectEvent, useMemo, useRef } from 'react';
import { linkOrReference } from '@/blocks/button-url';
import { useLocale } from '@/lib/i18n';
import { blockNoteDictionary } from './blocknote-dictionary';
import { useHost } from '@/lib/host';
import { richContent, richValue } from '@/lib/rich-text';
import { dynamicInline } from './dynamic-inline';
import { CreatePageLinkButton, PageLinkToolbar } from './page-link-controls';
import { PageBlocksContext } from './page-blocks-context';

/** A complete inline field. This editor cannot add page blocks or change layout. */
export default function InlineWordsEditor({
    value,
    label,
    onChange,
}: {
    value: string;
    label: string;
    onChange: (value: string) => void;
}) {
    const { dynamicValues } = useHost();
    const locale = useLocale();
    const latest = useRef(value);
    const report = useEffectEvent(onChange);
    const initial = useMemo(() => richContent(value), []);
    const schema = useMemo(
        () =>
            BlockNoteSchema.create({
                blockSpecs: { paragraph: defaultBlockSpecs.paragraph },
                inlineContentSpecs: {
                    ...defaultInlineContentSpecs,
                    dynamic: dynamicInline,
                },
                styleSpecs: {
                    ...defaultStyleSpecs,
                    fontFamily: fontFamilyStyleSpec([]),
                },
            }),
        [],
    );
    const editor = useCreateBlockNote({
        schema,
        trailingBlock: false,
        links: { isValidLink: (href) => linkOrReference(href) !== null },
        dictionary: blockNoteDictionary(locale) as never,
        initialContent: [
            {
                id: 'inline-words',
                type: 'paragraph',
                content: initial as never,
            },
        ],
    });
    const syncing = useRef(false);
    useEffect(() => {
        editor.domElement?.setAttribute('aria-label', label);
        editor.domElement?.setAttribute('role', 'textbox');
        editor.domElement?.setAttribute('aria-multiline', 'true');
    }, [editor, label]);
    useEffect(() => {
        if (value === latest.current) return;
        syncing.current = true;
        editor.replaceBlocks(editor.document, [
            {
                id: 'inline-words',
                type: 'paragraph',
                content: richContent(value) as never,
            },
        ]);
        latest.current = value;
        syncing.current = false;
    }, [editor, value]);
    return (
        <PageBlocksContext value={{ ownBlocks: new Map(), dynamicValues }}>
            <div
                data-inline-words
                className="bg-card min-h-24 rounded-md border p-2 text-sm"
            >
                <BlockNoteView
                    editor={editor}
                    theme="light"
                    sideMenu={false}
                    slashMenu={false}
                    formattingToolbar={false}
                    linkToolbar={false}
                    emojiPicker={false}
                    filePanel={false}
                    onChange={() => {
                        if (syncing.current) return;
                        const content = editor.document.flatMap((block, i) => [
                            ...(i
                                ? [
                                      {
                                          type: 'text' as const,
                                          text: '\n',
                                          styles: {},
                                      },
                                  ]
                                : []),
                            ...block.content,
                        ]);
                        // Keep the complete draft even when the public save will refuse it.
                        // The field displays the validation message and Undo can restore it.
                        let next: string;
                        try {
                            next = richValue(content);
                        } catch {
                            next = JSON.stringify({ version: 1, content });
                        }
                        latest.current = next;
                        report(next);
                    }}
                >
                    <FormattingToolbarController
                        formattingToolbar={() => (
                            <FormattingToolbar>
                                {getFormattingToolbarItems()
                                    .filter((item) =>
                                        [
                                            'boldStyleButton',
                                            'italicStyleButton',
                                            'underlineStyleButton',
                                            'strikeStyleButton',
                                            'colorStyleButton',
                                            'createLinkButton',
                                        ].includes(String(item.key)),
                                    )
                                    .map((item) =>
                                        item.key === 'createLinkButton' ? (
                                            <CreatePageLinkButton
                                                key={item.key}
                                            />
                                        ) : (
                                            item
                                        ),
                                    )}
                            </FormattingToolbar>
                        )}
                    />
                    <LinkToolbarController linkToolbar={PageLinkToolbar} />
                </BlockNoteView>
            </div>
        </PageBlocksContext>
    );
}
