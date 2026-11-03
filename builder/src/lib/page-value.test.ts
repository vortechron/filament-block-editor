import { describe, expect, it } from 'vitest';
import {
    finishAnchor,
    normalizeTemplates,
    normalizeValue,
    typeAnchor,
} from './page-value';

describe('the page value the host passes in', () => {
    it('fills every missing look field with its default', () => {
        const value = normalizeValue({
            sections: [
                {
                    id: 'abc12345',
                    type: 'rich',
                    data: { document: [], layout: 'hero' },
                } as never,
            ],
        });

        expect(value.sections[0]).toEqual({
            id: 'abc12345',
            type: 'rich',
            data: {
                document: [],
                layout: 'hero',
                background: 'none',
                background_color: null,
                image: null,
                tint: 40,
                card: false,
                padding: 'md',
                font: 'theme',
                align: 'auto',
                text_color: null,
                corners: 'theme',
                button: 'theme',
                anchor: null,
                width: 'normal',
            },
        });
    });

    it('keeps hidden only when it is true, and gives sections without an id one', () => {
        const value = normalizeValue({
            sections: [
                { type: 'rich', data: {}, hidden: false } as never,
                { id: 'x1', type: 'rich', data: {}, hidden: true } as never,
            ],
        });

        expect('hidden' in value.sections[0]).toBe(false);
        expect(value.sections[0].id).toMatch(/^[a-z0-9]{8}$/);
        expect(value.sections[1].hidden).toBe(true);
    });

    it('starts empty without a value, and keeps at most 30 sections', () => {
        expect(normalizeValue(undefined)).toEqual({ version: 2, sections: [] });

        const many = Array.from({ length: 35 }, (_, index) => ({
            id: `s${index}`,
            type: 'rich' as const,
            data: {},
        }));

        expect(
            normalizeValue({ sections: many as never }).sections,
        ).toHaveLength(30);
    });

    it('drops values that are not in the enums', () => {
        const [section] = normalizeValue({
            sections: [
                {
                    id: 'a',
                    type: 'rich',
                    data: { layout: 'shop', width: 'huge', anchor: 'Not ok!' },
                } as never,
            ],
        }).sections;

        expect(section.type === 'rich' && section.data.layout).toBe('plain');
        expect(section.type === 'rich' && section.data.width).toBe('normal');
        expect(section.type === 'rich' && section.data.anchor).toBeNull();
    });
});

describe('page format 2', () => {
    const plain = { id: 'p1', type: 'rich', data: { layout: 'plain' } };

    it('upgrades format 1, as { sections } or a bare list, and always says version 2', () => {
        const fromObject = normalizeValue({ sections: [plain] });
        const fromList = normalizeValue([plain]);

        expect(fromObject.version).toBe(2);
        expect(fromList).toEqual(fromObject);
        expect(fromList.sections[0]).toMatchObject({ id: 'p1', type: 'rich' });
    });

    it('passes synced (ref) sections through untouched, and drops a ref that is not an id', () => {
        const value = normalizeValue({
            version: 2,
            sections: [
                { id: 'k9x8', type: 'ref', ref: 12, hidden: true },
                plain,
                { id: 'k9x9', type: 'ref', ref: 'hdr-main', hidden: false },
                { id: 'bad1', type: 'ref', ref: 0 },
                { id: 'bad2', type: 'ref', ref: 'x'.repeat(41) },
                { id: 'bad3', type: 'ref' },
            ],
        });

        expect(value.sections.map((section) => section.id)).toEqual([
            'k9x8',
            'p1',
            'k9x9',
        ]);
        expect(value.sections[0]).toEqual({
            id: 'k9x8',
            type: 'ref',
            ref: 12,
            hidden: true,
        });
        expect(value.sections[2]).toEqual({
            id: 'k9x9',
            type: 'ref',
            ref: 'hdr-main',
        });
    });

    it('keeps only the lock keys that are true, and leaves an empty lock out', () => {
        const [locked, open] = normalizeValue({
            version: 2,
            sections: [
                {
                    ...plain,
                    lock: {
                        move: true,
                        remove: false,
                        content: 'yes',
                        style: true,
                        delete: true,
                    },
                },
                { ...plain, id: 'p2', lock: { move: false } },
            ],
        }).sections;

        expect(locked).toMatchObject({ lock: { move: true, style: true } });
        expect(locked.type === 'rich' && Object.keys(locked.lock ?? {})).toEqual([
            'move',
            'style',
        ]);
        expect('lock' in open).toBe(false);
    });

    it('cleans the section style and advanced parts, and leaves empty parts out', () => {
        const [styled, bare] = normalizeValue({
            version: 2,
            sections: [
                {
                    ...plain,
                    data: {
                        style: {
                            desktop: { padding_top: '24px', color: 'red' },
                            tablet: { padding_top: 'lots' },
                            phone: { font_size: '1rem' },
                            hover: { background_color: 'kit:primary', padding_top: '2px' },
                        },
                        advanced: { class: 'price-card 9bad', css: null, hide_on: ['phone', 'tv'] },
                    },
                },
                {
                    ...plain,
                    id: 'p2',
                    data: {
                        style: { desktop: {}, tablet: { color: 'blue' } },
                        advanced: { class: '', css: '', hide_on: [] },
                    },
                },
            ],
        }).sections;

        expect(styled.type === 'rich' && styled.data.style).toEqual({
            desktop: { padding_top: '24px' },
            phone: { font_size: '1rem' },
            hover: { background_color: 'kit:primary' },
        });
        expect(styled.type === 'rich' && styled.data.advanced).toEqual({
            class: 'price-card',
            hide_on: ['phone'],
        });
        expect(bare.type === 'rich' && 'style' in bare.data).toBe(false);
        expect(bare.type === 'rich' && 'advanced' in bare.data).toBe(false);
    });

    it('reads a format 2 value as it is', () => {
        const value = normalizeValue({ version: 2, sections: [plain] });

        expect(value).toEqual(normalizeValue({ sections: [plain] }));
    });
});

describe('the section anchor', () => {
    it('lower-cases and dashes the name as it is typed', () => {
        expect(typeAnchor('Tentang Kami')).toBe('tentang-kami');
        expect(typeAnchor('tentang ')).toBe('tentang-');
        expect(typeAnchor('  --Hubungi__Kami!!')).toBe('hubungi-kami-');
        expect(typeAnchor('a'.repeat(50))).toHaveLength(40);
    });

    it('drops the trailing dash when typing is done, and is null when empty', () => {
        expect(finishAnchor('tentang-')).toBe('tentang');
        expect(finishAnchor('')).toBeNull();
        expect(finishAnchor('---')).toBeNull();
    });
});

describe('the section templates the host passes in', () => {
    it('turns each template into a section with defaults', () => {
        const [template] = normalizeTemplates([
            {
                key: 'faq',
                label: 'Soalan lazim',
                category: 'help',
                section: { type: 'rich', data: { layout: 'faq' } },
            },
        ]);

        expect(template.key).toBe('faq');
        expect(template.category).toBe('help');
        expect(template.description).toBe('');
        expect(template.data.layout).toBe('faq');
        expect(template.data.padding).toBe('md');
    });

    it('skips templates without a key, and puts those without a category under basic', () => {
        const templates = normalizeTemplates([
            { key: '', label: 'Nothing', section: { data: {} } },
            { key: 'text', label: 'Text', section: { data: {} } },
        ] as never);

        expect(templates.map((template) => template.key)).toEqual(['text']);
        expect(templates[0].category).toBe('basic');
    });
});
