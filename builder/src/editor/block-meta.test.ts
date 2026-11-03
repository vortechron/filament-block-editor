import { describe, expect, it } from 'vitest';
import { normalizeTemplates, sectionFromTemplate } from '@/lib/page-value';
import type { RichDocument, RichSection } from '@/types';
import { duplicateBlock } from './block-meta';

/** Every block id in a document, depth first. */
function blockIds(document: RichDocument): string[] {
    return document.flatMap((block) => [
        ...(typeof block.id === 'string' ? [block.id] : []),
        ...(Array.isArray(block.children) ? blockIds(block.children as RichDocument) : []),
    ]);
}

const DOCUMENT = [
    { id: 'head0001', type: 'heading', props: { look: '{"style":{"desktop":{"color":"#ff0000"}}}' }, content: 'Hubungi kami', children: [] },
    {
        id: 'cols0001',
        type: 'columnList',
        children: [
            {
                id: 'col00001',
                type: 'column',
                children: [{ id: 'form0001', type: 'form', props: { form: '{}', look: '' }, children: [] }],
            },
            {
                id: 'col00002',
                type: 'column',
                children: [{ id: 'para0001', type: 'paragraph', content: 'Jumpa di kedai', children: [] }],
            },
        ],
    },
] as unknown as RichDocument;

const ORIGINAL_IDS = ['head0001', 'cols0001', 'col00001', 'form0001', 'col00002', 'para0001'];

describe('copying a section', () => {
    it('gives the copy and every block in it a new id, through columns and children', () => {
        const section = {
            id: 'sect0001',
            type: 'rich',
            data: { document: DOCUMENT },
        } as unknown as RichSection;

        const copy = duplicateBlock(section);
        const ids = blockIds(copy.data.document);

        expect(copy.id).not.toBe('sect0001');
        expect(ids).toHaveLength(6);
        expect(ids.filter((id) => ORIGINAL_IDS.includes(id))).toEqual([]);
        expect(new Set(ids).size).toBe(6);
        // Everything else is copied as it was, and the original is unchanged.
        expect(copy.data.document[0]).toMatchObject({ type: 'heading', content: 'Hubungi kami' });
        expect(blockIds(section.data.document)).toEqual(ORIGINAL_IDS);
    });

    it('gives each section made from the same template its own block ids', () => {
        const [template] = normalizeTemplates([
            { key: 'saved-7', label: 'Hubungi', category: 'saved', section: { data: { document: DOCUMENT } } },
        ]);

        const first = blockIds(sectionFromTemplate(template).data.document);
        const second = blockIds(sectionFromTemplate(template).data.document);

        expect(first.filter((id) => ORIGINAL_IDS.includes(id))).toEqual([]);
        expect(first.filter((id) => second.includes(id))).toEqual([]);
    });
});
