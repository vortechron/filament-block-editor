import { act, fireEvent, screen } from '@testing-library/react';
import { afterEach, vi } from 'vitest';
import { mountPageBuilder } from '../src/index';
import type {
    Kit,
    PageBuilderOptions,
    PageBuilderAdapter,
    PageValue,
    PageValueInput,
    RichSection,
    SaveResult,
} from '../src/types';

/** One hero section with a heading, as format 2. */
export const HERO: PageValueInput = {
    version: 2,
    sections: [
        {
            id: 'hero0001',
            type: 'rich',
            data: {
                layout: 'hero',
                document: [
                    {
                        id: 'head0001',
                        type: 'heading',
                        props: { level: 1 },
                        content: [{ type: 'text', text: 'Selamat datang', styles: {} }],
                        children: [],
                    },
                ],
            },
        },
    ],
};

export function makeAdapter(
    save: () => Promise<SaveResult> = async () => ({ ok: true }),
) {
    return {
        save: vi.fn((_value: PageValue) => save()),
        preview: vi.fn(
            async (
                _value: PageValue,
                _extra?: { kit?: Kit; siteInfo?: Record<string, Record<string, unknown>> },
            ) =>
                '<!doctype html><html><body></body></html>',
        ),
        upload: vi.fn(async (_file: File, _kind: string) => ({
            url: '/storage/a.jpg',
        })),
    };
}

export type TestAdapter = ReturnType<typeof makeAdapter> & {
    createTranslation?: PageBuilderAdapter['createTranslation'];
    saveKit?: ReturnType<typeof vi.fn>;
    saveSection?: ReturnType<typeof vi.fn>;
    saveSiteInfo?: ReturnType<typeof vi.fn>;
};

let unmountLast: (() => void) | null = null;

afterEach(() => {
    unmountLast?.();
    unmountLast = null;
});

/** Mounts the builder in English with the hero page, unless told otherwise. */
export function mountBuilder(
    options: Omit<Partial<PageBuilderOptions>, 'adapter'> & {
        adapter?: TestAdapter;
    } = {},
) {
    const element = document.createElement('div');

    document.body.append(element);

    const adapter = options.adapter ?? makeAdapter();
    let builder!: ReturnType<typeof mountPageBuilder>;

    act(() => {
        builder = mountPageBuilder(element, {
            value: HERO,
            locale: 'en',
            ...options,
            adapter,
        });
    });
    unmountLast = () => {
        act(() => builder.unmount());
        element.remove();
    };

    return { builder, adapter, element };
}

/** Picks a section from the Structure list, which opens its panel. */
export async function pickSection(title: string | RegExp) {
    fireEvent.click(screen.getByRole('tab', { name: 'Structure' }));
    fireEvent.click(await screen.findByRole('button', { name: title }));
}

/** The first section of the builder's value, as a rich section. */
export function firstSection(
    builder: ReturnType<typeof mountPageBuilder>,
): RichSection {
    return builder.getValue().sections[0] as RichSection;
}
