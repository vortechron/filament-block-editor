import { describe, expect, it } from 'vitest';
import type { OwnBlockDefinition } from '@/types';
import { ownBlockSource } from './own-block-source';

const list: OwnBlockDefinition = {
    kind: 'item-list',
    label: 'Item list',
    description: 'Items from the Items screen.',
    fields: [{ name: 'title', type: 'text', label: 'Title' }],
    editedAt: { label: 'Edit items', url: '/admin/items' },
};

describe('where a block’s content comes from', () => {
    it('links to the screen its data is changed on, and says what it shows', () => {
        expect(ownBlockSource(list, false)).toEqual({
            note: 'Items from the Items screen.',
            link: { label: 'Edit items', url: '/admin/items' },
            isEmpty: false,
        });
    });

    it('says what a block with nothing to set shows, so its settings are never blank', () => {
        const map = { ...list, fields: [], editedAt: undefined, description: 'A drawn map.' };

        expect(ownBlockSource(map, false)).toEqual({ note: 'A drawn map.', link: null, isEmpty: false });
        expect(ownBlockSource({ ...map, description: '  ' }, false)).toEqual({ note: null, link: null, isEmpty: true });
    });

    it('keeps quiet about a block with fields of its own', () => {
        expect(ownBlockSource({ ...list, editedAt: undefined }, false)).toEqual({ note: null, link: null, isEmpty: false });
    });

    it('counts only the fields this person can see', () => {
        const secret = {
            ...list,
            editedAt: undefined,
            fields: [{ name: 'code', type: 'textarea' as const, label: 'Code', developerOnly: true }],
        };

        expect(ownBlockSource(secret, false).note).toBe('Items from the Items screen.');
        expect(ownBlockSource(secret, true).note).toBeNull();
    });
});
