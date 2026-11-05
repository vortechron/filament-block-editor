import { describe, expect, it } from 'vitest';
import { moveToIndex } from '../editor/helpers';
import { matchesSearch } from './catalog-tiles';
import { catalogFor, describeBlock } from './item-catalog';
import { mayMakeSynced } from './section-menu';

describe('moving a section in the Structure list', () => {
    const sections = ['hero', 'about', 'services', 'contact'];

    it('moves a section down onto the row it was dropped on', () => {
        expect(moveToIndex(sections, 0, 2)).toEqual([
            'about',
            'services',
            'hero',
            'contact',
        ]);
    });

    it('moves a section up onto the row it was dropped on', () => {
        expect(moveToIndex(sections, 3, 1)).toEqual([
            'hero',
            'contact',
            'about',
            'services',
        ]);
    });

    it('leaves the list alone for a drop on the same row or a lost row', () => {
        expect(moveToIndex(sections, 2, 2)).toBe(sections);
        expect(moveToIndex(sections, 9, 0)).toBe(sections);
    });
});

describe('the item catalog', () => {
    const ownBlocks = [
        {
            kind: 'stationery-board',
            label: 'Stationery board',
            icon: 'pencil',
            description: 'Categories and items from the Barang screen.',
            fields: [],
        },
    ];

    it('puts the section’s own item first for grid layouts', () => {
        const [first] = catalogFor('reviews');

        expect(first.key).toBe('layoutItem');
        expect(first.label).toBe('New review');
    });

    it('has no own item for layouts without items', () => {
        expect(
            catalogFor('hero').some((item) => item.key === 'layoutItem'),
        ).toBe(false);
    });

    it('offers a button, and no selling items', () => {
        const keys = catalogFor(null).map((item) => item.key);

        expect(keys).toContain('button');
        expect(keys).not.toContain('orderButton');
        expect(keys).not.toContain('priceTag');
        expect(keys).not.toContain('countdown');
        expect(keys).not.toContain('enquiryForm');
    });

    it('offers each own block of the host, last, under its own label', () => {
        const items = catalogFor('plain', ownBlocks);
        const last = items.at(-1);

        expect(last?.key).toBe('own:stationery-board');
        expect(last?.label).toBe('Stationery board');
        expect(last?.isOwn).toBe(true);
        expect(last?.group).toBe('own');
        expect(
            matchesSearch('barang', last!.label, last!.keywords),
        ).toBe(true);
    });

    it('leaves a retired own block out of Add, and still names it on the page', () => {
        const retired = [...ownBlocks, { kind: 'old-board', label: 'Old board', fields: [], retired: true }];

        expect(catalogFor('plain', retired).map((item) => item.key)).not.toContain('own:old-board');
        expect(describeBlock('ownBlock', { kind: 'old-board' }, retired).label).toBe('Old board');
    });

    it('names a block already on the page', () => {
        expect(describeBlock('heading', { level: 3 }).label).toBe(
            'Small heading',
        );
        expect(describeBlock('button', {}).label).toBe('Button');
        expect(describeBlock('somethingNew', {}).label).toBe('Item');
        expect(
            describeBlock('ownBlock', { kind: 'stationery-board' }, ownBlocks)
                .label,
        ).toBe('Stationery board');
        expect(describeBlock('ownBlock', { kind: 'gone' }, ownBlocks).label).toBe(
            'Unknown block',
        );
    });
});

describe('the Add panel search', () => {
    it('matches every word, in either language, in any order', () => {
        expect(matchesSearch('butang pautan', 'Button', 'button link butang pautan')).toBe(
            true,
        );
        expect(matchesSearch('photo video', 'Photo', 'image')).toBe(false);
        expect(matchesSearch('', 'Anything')).toBe(true);
    });
});

describe('making a section synced', () => {
    it('is offered on a page, and for a locked section only to a developer', () => {
        expect(mayMakeSynced('page', false, false)).toBe(true);
        expect(mayMakeSynced('page', false, true)).toBe(false);
        expect(mayMakeSynced('page', true, true)).toBe(true);
    });

    it('is never offered inside a synced section’s own builder, which already is the synced one', () => {
        expect(mayMakeSynced('section', true, false)).toBe(false);
        expect(mayMakeSynced('section', false, false)).toBe(false);
    });
});

