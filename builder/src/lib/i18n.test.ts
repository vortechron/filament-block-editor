import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CATEGORY_LABELS } from '@/builder/add-panel';
import { ACTION_LABELS } from '@/builder/form/form-actions';
import { FIELD_TYPE_LABELS } from '@/builder/form/form-field-editor';
import { GROUP_LABELS } from '@/builder/item-catalog';
import { LAYOUT_LABELS } from '@/builder/section-thumbs';
import ms from '@/lang/ms';
import { translate } from './i18n';

describe('translating the builder', () => {
    it('shows Malay for the ms locale and the English text for en', () => {
        expect(translate('Add section', 'ms', {})).toBe('Tambah seksyen');
        expect(translate('Add section', 'en', {})).toBe('Add section');
    });

    it('lets the host override any text in the active locale', () => {
        expect(
            translate('Add section', 'ms', { 'Add section': 'Tambah blok' }),
        ).toBe('Tambah blok');
        expect(translate('Save', 'en', { Save: 'Publish' })).toBe('Publish');
    });

    it('fills :name placeholders, and leaves unknown ones alone', () => {
        expect(
            translate('Section :number of :count', 'ms', {}, {
                number: 2,
                count: 5,
            }),
        ).toBe('Seksyen 2 daripada 5');
        expect(translate(':who is here', 'en', {}, {})).toBe(':who is here');
    });

    it('falls back to the English text for a word missing in Malay', () => {
        expect(translate('Not a known text', 'ms', {})).toBe(
            'Not a known text',
        );
    });
});

/**
 * Every text the builder shows: the t('...') literals, and the label,
 * hint, title and subtext literals of the lists the builder translates
 * (layouts, items, fonts, tabs).
 */
function sourceTexts(): string[] {
    const root = join(__dirname, '..');
    const files: string[] = [];
    const walk = (dir: string) => {
        for (const name of readdirSync(dir)) {
            const path = join(dir, name);

            if (statSync(path).isDirectory()) {
                walk(path);
            } else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) {
                files.push(path);
            }
        }
    };

    walk(root);

    const texts = new Set<string>();

    for (const file of files) {
        const source = readFileSync(file, 'utf8');

        for (const match of source.matchAll(
            /(?:\bt\(\s*|\b(?:label|hint|title|subtext):\s*)(['"])((?:\\.|(?!\1).)*)\1/g,
        )) {
            const text = match[2].replace(/\\(['"])/g, '$1');

            // "S", "XL", "⅓": sizes and signs are the same in both languages.
            if (/[a-z]/.test(text)) {
                texts.add(text);
            }
        }
    }

    // Label maps the builder passes through t().
    for (const map of [
        CATEGORY_LABELS,
        GROUP_LABELS,
        LAYOUT_LABELS,
        ACTION_LABELS,
        FIELD_TYPE_LABELS,
    ]) {
        Object.values(map).forEach((text) => texts.add(text));
    }

    return [...texts];
}

describe('the Malay dictionary', () => {
    it('has every text the builder shows', () => {
        const missing = sourceTexts().filter((text) => !Object.hasOwn(ms, text));

        expect(missing).toEqual([]);
    });

    it('uses the generic words: seksyen and halaman, never seller words', () => {
        const words = Object.values(ms).join('\n').toLowerCase();

        expect(words).not.toMatch(/\bbahagian\b/);
        expect(words).not.toMatch(/\bpembeli\b/);
        expect(words).not.toMatch(/\bproduk\b/);
        expect(words).not.toMatch(/\bpesanan\b/);
    });

    it('has no seller words in the English texts either', () => {
        const texts = sourceTexts().join('\n').toLowerCase();

        expect(texts).not.toMatch(/\bbuyers?\b/);
        expect(texts).not.toMatch(/\bsales page\b/);
        expect(texts).not.toMatch(/\bcheckout\b/);
    });
});
