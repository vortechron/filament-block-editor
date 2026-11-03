import './styles/builder.css';
import { createRoot } from 'react-dom/client';
import { PageBuilderApp } from './app';
import { DEFAULT_TEMPLATES } from './lib/default-templates';
import type { Host } from './lib/host';
import { isLocale } from './lib/i18n';
import { normalizeKit } from './lib/kit';
import { normalizeTemplates, normalizeValue } from './lib/page-value';
import { uploadWith } from './lib/upload';
import { translate } from './lib/i18n';
import type {
    PageBuilderInstance,
    PageBuilderOptions,
    PageValue,
} from './types';

export type * from './types';

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const DEFAULT_ACCENT = '#2563eb';

/**
 * Draws the page builder inside `element` and returns a handle to read
 * the value and take the builder down again. Everything the builder
 * needs from the host comes through `options`: the value, the adapter
 * (save, preview, upload), own blocks, templates and the texts.
 */
export function mountPageBuilder(
    element: HTMLElement,
    options: PageBuilderOptions,
): PageBuilderInstance {
    if (!(element instanceof HTMLElement)) {
        throw new Error('mountPageBuilder needs an element to draw in.');
    }

    const { adapter } = options;

    if (
        !adapter ||
        typeof adapter.save !== 'function' ||
        typeof adapter.preview !== 'function' ||
        typeof adapter.upload !== 'function'
    ) {
        throw new Error(
            'mountPageBuilder needs an adapter with save, preview and upload.',
        );
    }

    const locale = isLocale(options.locale) ? options.locale : 'ms';
    const strings = { ...(options.strings ?? {}) };
    const initialValue = normalizeValue(options.value);
    const templates = normalizeTemplates(
        options.templates && options.templates.length > 0
            ? options.templates
            : DEFAULT_TEMPLATES[locale],
    );
    const host: Host = {
        adapter,
        ownBlocks: Array.isArray(options.blocks)
            ? options.blocks.filter(
                  (block) =>
                      typeof block?.kind === 'string' &&
                      block.kind !== '' &&
                      Array.isArray(block.fields),
              )
            : [],
        accent:
            typeof options.accent === 'string' && HEX_COLOR.test(options.accent)
                ? options.accent.toLowerCase()
                : DEFAULT_ACCENT,
        upload: uploadWith(adapter, (text) =>
            translate(text, locale, strings),
        ),
        title: typeof options.title === 'string' ? options.title : '',
        backUrl: options.backUrl || null,
        viewUrl: options.viewUrl || null,
        developer: options.developer === true,
        fonts: Array.isArray(options.fonts)
            ? options.fonts.filter(
                  (font) =>
                      typeof font?.value === 'string' &&
                      font.value !== '' &&
                      typeof font.label === 'string',
              )
            : [],
        kit:
            options.kit && typeof adapter.saveKit === 'function'
                ? normalizeKit(options.kit)
                : null,
    };
    let value: PageValue = initialValue;
    const root = createRoot(element);

    root.render(
        <PageBuilderApp
            host={host}
            locale={locale}
            strings={strings}
            initialValue={initialValue}
            templates={templates}
            onValue={(next) => {
                value = next;
            }}
            onChange={options.onChange}
            fillScreen={element.clientHeight === 0}
        />,
    );

    return {
        getValue: () => structuredClone(value),
        unmount: () => root.unmount(),
    };
}

export default mountPageBuilder;
