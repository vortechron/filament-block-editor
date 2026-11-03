import { describe, expect, it } from 'vitest';
import type { RichDocument } from '@/types';
import { withMissingBlockIds } from './block-ids';

describe('withMissingBlockIds', () => {
    it('gives a block with no id one, through children, and keeps the ids already there', () => {
        const document = [
            { id: 'keep0001', type: 'paragraph', props: {}, children: [] },
            {
                type: 'columnList',
                props: {},
                children: [{ type: 'column', props: {}, children: [{ id: '', type: 'image', props: {}, children: [] }] }],
            },
        ] as unknown as RichDocument;

        const [kept, list] = withMissingBlockIds(document) as unknown as Array<{ id: string; children: Array<{ id: string; children: Array<{ id: string }> }> }>;

        expect(kept.id).toBe('keep0001');
        expect(list.id).toMatch(/^[a-z0-9]{12}$/);
        expect(list.children[0].id).toMatch(/^[a-z0-9]{12}$/);
        expect(list.children[0].children[0].id).toMatch(/^[a-z0-9]{12}$/);
    });

    it('returns the same document when every block has an id', () => {
        const document = [{ id: 'keep0001', type: 'paragraph', props: {}, children: [] }] as unknown as RichDocument;

        expect(withMissingBlockIds(document)).toBe(document);
    });
});
