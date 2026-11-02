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
        expect(normalizeValue(undefined)).toEqual({ sections: [] });

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

        expect(section.data.layout).toBe('plain');
        expect(section.data.width).toBe('normal');
        expect(section.data.anchor).toBeNull();
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
