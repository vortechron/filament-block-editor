import { describe, expect, it } from 'vitest';
import type { OwnBlockDefinition } from '@/types';
import {
    parseValues,
    serializeValues,
    summarizeValues,
    valuesWithDefaults,
} from './own-block-values';

const board: OwnBlockDefinition = {
    kind: 'stationery-board',
    label: 'Stationery board',
    icon: 'pencil',
    fields: [
        { name: 'heading', type: 'text', label: 'Heading', default: 'Stationery' },
        { name: 'intro', type: 'textarea' },
        {
            name: 'style',
            type: 'select',
            options: [
                { value: 'plain', label: 'Plain' },
                { value: 'boxed', label: 'Boxed' },
            ],
            default: 'plain',
        },
        { name: 'show_prices', type: 'toggle', default: true },
        { name: 'limit', type: 'number' },
        {
            name: 'items',
            type: 'list',
            fields: [{ name: 'name', type: 'text' }],
            maxItems: 6,
        },
    ],
    defaults: { heading: 'Stationery', style: 'plain', show_prices: true },
};

describe('an own block’s values', () => {
    it('reads the JSON object string BlockNote keeps', () => {
        expect(parseValues('{"heading":"Pens","limit":3}')).toEqual({
            heading: 'Pens',
            limit: 3,
        });
    });

    it('reads broken or non-object JSON as no values', () => {
        expect(parseValues('{oops')).toEqual({});
        expect(parseValues('[1,2]')).toEqual({});
        expect(parseValues('"text"')).toEqual({});
        expect(parseValues('')).toEqual({});
    });

    it('writes the values back as the same JSON string', () => {
        const values = { heading: 'Pens', items: [{ name: 'Blue pen' }] };

        expect(parseValues(serializeValues(values))).toEqual(values);
        expect(serializeValues(values)).toBe(
            '{"heading":"Pens","items":[{"name":"Blue pen"}]}',
        );
    });

    it('fills the definition’s defaults under the values the block has', () => {
        expect(valuesWithDefaults(board, { heading: 'Pens' })).toEqual({
            heading: 'Pens',
            intro: '',
            style: 'plain',
            show_prices: true,
            limit: null,
            items: [],
        });
    });

    it('keeps values for fields the definition no longer has', () => {
        expect(valuesWithDefaults(board, { old: 1 }).old).toBe(1);
    });

    it('sums the values up in one line for the card', () => {
        expect(
            summarizeValues(board, {
                heading: 'Pens and pencils',
                items: [{ name: 'a' }, { name: 'b' }],
            }),
        ).toBe('Pens and pencils · 2');
        expect(summarizeValues(board, {})).toBe('Stationery');
    });
});
