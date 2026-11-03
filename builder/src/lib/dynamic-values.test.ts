import { describe, expect, it } from 'vitest';
import type { DynamicValueDefinition } from '@/types';
import { filterDynamicValues, groupDynamicValues } from './dynamic-values';

const VALUES: DynamicValueDefinition[] = [
    { key: 'site.name', label: 'Nama kedai', type: 'text', group: 'Perniagaan', preview: 'Kedai Buku Ali' },
    { key: 'site.phone', label: 'Telefon', type: 'text', group: 'Hubungi', preview: '012-345 6789' },
    { key: 'site.email', label: 'E-mel', type: 'text', group: 'Hubungi', preview: null },
    { key: 'site.hours', label: 'Waktu buka', type: 'text', group: 'Waktu', preview: 'Isnin - Jumaat' },
    { key: 'page.title', label: 'Tajuk halaman', type: 'text' },
];

const keysOf = (values: DynamicValueDefinition[]) => values.map((value) => value.key);

describe('searching the shop values', () => {
    it('finds a value by its label, its key or what it is now, in any case', () => {
        expect(keysOf(filterDynamicValues(VALUES, 'telefon'))).toEqual(['site.phone']);
        expect(keysOf(filterDynamicValues(VALUES, 'site.e'))).toEqual(['site.email']);
        expect(keysOf(filterDynamicValues(VALUES, '345'))).toEqual(['site.phone']);
        expect(keysOf(filterDynamicValues(VALUES, 'BUKU'))).toEqual(['site.name']);
    });

    it('needs every word typed, in any order', () => {
        expect(keysOf(filterDynamicValues(VALUES, 'jumaat waktu'))).toEqual(['site.hours']);
        expect(keysOf(filterDynamicValues(VALUES, 'waktu telefon'))).toEqual([]);
    });

    it('shows every value for an empty search', () => {
        expect(keysOf(filterDynamicValues(VALUES, '  '))).toEqual(keysOf(VALUES));
    });
});

describe('the shop values by group', () => {
    it('keep the order the site sent, groups by their first value', () => {
        expect(
            groupDynamicValues([VALUES[1], VALUES[0], VALUES[2], VALUES[4]]).map(({ group, values }) => [
                group,
                keysOf(values),
            ]),
        ).toEqual([
            ['Hubungi', ['site.phone', 'site.email']],
            ['Perniagaan', ['site.name']],
            ['', ['page.title']],
        ]);
    });
});
