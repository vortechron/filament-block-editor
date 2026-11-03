import { type BlockNoteEditor as Editor, BlockNoteEditor } from '@blocknote/core';
import { render, waitFor } from '@testing-library/react';
import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { createPageSchema } from './page-schema';
import RichEditor from './rich-editor';
import { normalizeSectionData } from '@/lib/page-value';

const LOOK = JSON.stringify({ style: { desktop: { padding_top: '12px' } } });

/** One block of every kind the builder offers, each with a look. */
const DOCUMENT = [
    { type: 'heading', props: { level: 2, look: LOOK }, content: 'Tajuk' },
    { type: 'paragraph', props: { look: LOOK }, content: 'Ayat' },
    { type: 'quote', props: { look: LOOK }, content: 'Petikan' },
    { type: 'bulletListItem', props: { look: LOOK }, content: 'Poin' },
    { type: 'toggleListItem', props: { look: LOOK }, content: 'Soalan' },
    { type: 'image', props: { url: '/a.jpg', look: LOOK } },
    { type: 'video', props: { url: '/a.mp4', look: LOOK } },
    { type: 'divider', props: { look: LOOK } },
    { type: 'spacer', props: { look: LOOK } },
    { type: 'card', props: { look: LOOK }, content: 'Kad' },
    { type: 'gallery', props: { images: '/a.jpg', look: LOOK } },
    { type: 'button', props: { text: 'Beli', url: '#', look: LOOK } },
    { type: 'ownBlock', props: { kind: 'map', values: '{}', look: LOOK } },
    {
        type: 'columnList',
        props: { look: LOOK },
        children: [
            {
                type: 'column',
                props: { look: LOOK },
                children: [{ type: 'paragraph', content: 'Kiri' }],
            },
            {
                type: 'column',
                props: {},
                children: [{ type: 'paragraph', content: 'Kanan' }],
            },
        ],
    },
];

type Looked = { type: string; props: { look?: unknown }; children: Looked[] };

function looks(blocks: Looked[]): [string, unknown][] {
    return blocks.flatMap((block) => [
        [block.type, block.props.look] as [string, unknown],
        ...looks(block.children),
    ]);
}

describe('the look prop on every block', () => {
    it('survives a trip through the section editor, on every kind of block', async () => {
        let editor: Editor<any, any, any> | null = null;

        render(
            createElement(RichEditor, {
                data: normalizeSectionData({ document: DOCUMENT as never }),
                accent: '#2563eb',
                blocks: { ownBlocks: new Map() },
                uploadFile: async () => '/a.jpg',
                onDocumentChange: () => {},
                onEditorReady: (ready) => {
                    editor = ready;
                },
            }),
        );

        await waitFor(() => expect(editor).not.toBeNull());
        // Every block is drawn, the page's own ones too.
        await waitFor(() =>
            expect(document.querySelector('[data-content-type="button"]')).not.toBeNull(),
        );

        expect(looks(editor!.document as unknown as Looked[])).toEqual([
            ['heading', LOOK],
            ['paragraph', LOOK],
            ['quote', LOOK],
            ['bulletListItem', LOOK],
            ['toggleListItem', LOOK],
            ['image', LOOK],
            ['video', LOOK],
            ['divider', LOOK],
            ['spacer', LOOK],
            ['card', LOOK],
            ['gallery', LOOK],
            ['button', LOOK],
            ['ownBlock', LOOK],
            ['columnList', LOOK],
            ['column', LOOK],
            ['paragraph', ''],
            ['column', ''],
            ['paragraph', ''],
        ]);
    });

    it('starts empty on a new block, and keeps a look set later', () => {
        const editor = BlockNoteEditor.create({ schema: createPageSchema() });
        const [first] = editor.document;

        expect(first.props).toMatchObject({ look: '' });

        editor.updateBlock(first.id, { props: { look: LOOK } as never });

        expect(editor.getBlock(first.id)?.props).toMatchObject({ look: LOOK });
    });
});
