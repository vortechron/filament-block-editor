import { describe, expect, it } from 'vitest';
import type { OwnBlockDefinition, Section } from '@/types';
import { buildStructureTree, itemPath } from './structure-tree';

const text = (value: string) => [{ type: 'text', text: value, styles: {} }];

const block = (
    id: string,
    type: string,
    extra: Record<string, unknown> = {},
) => ({ id, type, props: {}, content: [], children: [], ...extra });

const rich = (id: string, document: object[], lock?: object): Section =>
    ({
        id,
        type: 'rich',
        data: { layout: 'plain', document },
        ...(lock ? { lock } : {}),
    }) as unknown as Section;

const OWN: OwnBlockDefinition[] = [
    { kind: 'board', label: 'Stationery board', icon: 'pencil', fields: [] },
];

const options = { ownBlocks: OWN, canOpenItems: () => true };

describe('the Structure tree', () => {
    it('lists a section\'s items in order, with a label, a detail and depth 0', () => {
        const [node] = buildStructureTree(
            [
                rich('hero0001', [
                    block('h1', 'heading', {
                        props: { level: 1 },
                        content: text('Selamat datang'),
                    }),
                    block('b1', 'button', { props: { text: 'Hubungi' } }),
                ]),
            ],
            options,
        );

        expect(node.id).toBe('hero0001');
        expect(node.items.map((item) => [item.id, item.label, item.depth])).toEqual([
            ['h1', 'Heading', 0],
            ['b1', 'Button', 0],
        ]);
        expect(node.items[0].detail).toBe('Selamat datang');
    });

    it('shows an own block under the host\'s own label', () => {
        const [node] = buildStructureTree(
            [rich('s1', [block('o1', 'ownBlock', { props: { kind: 'board' } })])],
            options,
        );

        expect(node.items[0]).toMatchObject({
            label: 'Stationery board',
            isOwn: true,
        });
    });

    it('shows the items inside columns one step deeper, under a column list line', () => {
        const [node] = buildStructureTree(
            [
                rich('s1', [
                    block('cl', 'columnList', {
                        children: [
                            block('c1', 'column', {
                                children: [block('a', 'paragraph', { content: text('Kiri') })],
                            }),
                            block('c2', 'column', {
                                children: [
                                    block('b', 'image'),
                                    block('c', 'button'),
                                ],
                            }),
                        ],
                    }),
                ]),
            ],
            options,
        );
        const [list] = node.items;

        expect(list).toMatchObject({
            id: 'cl',
            label: ':count columns',
            labelParams: { count: 2 },
            depth: 0,
        });
        expect(list.children.map((item) => [item.id, item.depth])).toEqual([
            ['a', 1],
            ['b', 1],
            ['c', 1],
        ]);
    });

    it('shows a card\'s children one step deeper, and deeper again', () => {
        const [node] = buildStructureTree(
            [
                rich('s1', [
                    block('card', 'card', {
                        children: [
                            block('t', 'heading', {
                                content: text('Pakej'),
                                children: [block('deep', 'paragraph', { content: text('x') })],
                            }),
                        ],
                    }),
                ]),
            ],
            options,
        );
        const card = node.items[0];

        expect(card.label).toBe('Card');
        expect(card.children[0]).toMatchObject({ id: 't', depth: 1 });
        expect(card.children[0].children[0]).toMatchObject({ id: 'deep', depth: 2 });
    });

    it('leaves out empty lines of text', () => {
        const [node] = buildStructureTree(
            [rich('s1', [block('h', 'heading', { content: text('Hi') }), block('e', 'paragraph')])],
            options,
        );

        expect(node.items.map((item) => item.id)).toEqual(['h']);
    });

    it('gives a synced section one line and no items', () => {
        const [node] = buildStructureTree(
            [{ id: 'r1', type: 'ref', ref: 12 } as Section],
            options,
        );

        expect(node).toMatchObject({ id: 'r1', items: [], canExpand: false });
    });

    it('gives a section whose words are locked no items', () => {
        const locked = rich('s1', [block('h', 'heading', { content: text('Hi') })], {
            content: true,
        });
        const [node] = buildStructureTree([locked], {
            ownBlocks: OWN,
            canOpenItems: (section) => section.type === 'rich' && !section.lock?.content,
        });

        expect(node.items).toEqual([]);
        expect(node.canExpand).toBe(false);
    });

    it('lets a section with no items yet not expand', () => {
        const [node] = buildStructureTree([rich('s1', [])], options);

        expect(node.canExpand).toBe(false);
    });

    it('finds the place of an item the way the preview marks it', () => {
        const document = [
            block('a', 'paragraph', { content: text('x') }),
            block('cl', 'columnList', {
                children: [block('c1', 'column', { children: [block('in', 'image')] })],
            }),
        ];

        expect(itemPath(document, 'in')).toBe('1.0.0');
        expect(itemPath(document, 'nope')).toBeNull();
    });
});
