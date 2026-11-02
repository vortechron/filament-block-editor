/**
 * The page builder with an in-memory adapter, for trying the builder in a
 * browser without a server. Serve the package root and open
 * /builder/demo/ (for example `python3 -m http.server 8130 --bind 127.0.0.1`).
 *
 * `preview` draws the page with a tiny renderer that puts the same marks
 * on it as the PHP renderer does for the builder: `data-block-id` on each
 * section, `data-item` on each block, `bn-media-empty` for a photo spot
 * with no photo, `bn-button` for buttons and `bn-own-block` for own
 * blocks. Its look is plain on purpose; the real look is page.css.
 */
import { mountPageBuilder } from '../../resources/dist/page-builder.js';

const SAMPLE_PHOTO = new URL('./sample-photo.svg', import.meta.url).href;

/** Everything the adapter was asked, newest last, for checks in the console. */
const log = [];
window.demoLog = log;

const ownBlocks = [
    {
        kind: 'stationery-board',
        label: 'Stationery board',
        icon: 'pencil',
        description: 'Categories and items from the Barang screen.',
        fields: [
            { name: 'heading', label: 'Heading', type: 'text', default: 'Stationery' },
            { name: 'intro', label: 'Intro', type: 'textarea' },
            {
                name: 'style',
                label: 'Style',
                type: 'select',
                options: [
                    { value: 'plain', label: 'Plain' },
                    { value: 'boxed', label: 'Boxed' },
                ],
                default: 'plain',
            },
            { name: 'show_prices', label: 'Show prices', type: 'toggle', default: true },
            { name: 'photo', label: 'Photo', type: 'image' },
            { name: 'link', label: 'Link', type: 'link' },
            { name: 'limit', label: 'Limit', type: 'number' },
            {
                name: 'items',
                label: 'Items',
                type: 'list',
                fields: [{ name: 'name', label: 'Name', type: 'text' }],
                maxItems: 6,
            },
        ],
        defaults: { heading: 'Stationery', style: 'plain', show_prices: true, items: [] },
    },
    {
        kind: 'map',
        label: 'Map',
        icon: 'map-pin',
        description: 'Where to find us.',
        fields: [
            { name: 'address', label: 'Address', type: 'textarea', default: 'Jalan Merdeka, Batu Pahat' },
            { name: 'zoom', label: 'Zoom', type: 'number', default: 14 },
        ],
        defaults: { address: 'Jalan Merdeka, Batu Pahat', zoom: 14 },
    },
];

const text = (words, styles = {}) => (words ? [{ type: 'text', text: words, styles }] : []);
const block = (type, props, content = [], children = []) => ({ type, props, content, children });

const value = {
    sections: [
        {
            id: 'hero0001',
            type: 'rich',
            data: {
                layout: 'hero',
                align: 'left',
                anchor: 'utama',
                document: [
                    block('heading', { level: 1 }, text('Kedai Buku Pak Long')),
                    block('paragraph', {}, text('Buku, alat tulis dan hadiah, sejak 1988.')),
                    block('image', { url: '' }),
                    block('button', { text: 'Lihat koleksi', url: '#koleksi', variant: 'solid' }),
                ],
            },
        },
        {
            id: 'text0002',
            type: 'rich',
            data: {
                layout: 'plain',
                anchor: 'tentang',
                document: [
                    block('heading', { level: 2 }, text('Tentang kami')),
                    block('paragraph', {}, text('Kami kedai keluarga di tengah bandar.')),
                ],
            },
        },
    ],
};

const adapter = {
    async save(page) {
        log.push(['save', structuredClone(page)]);
        console.info('[demo] save', page);

        return { ok: true };
    },
    async preview(page) {
        log.push(['preview', structuredClone(page)]);

        return renderPage(page);
    },
    async upload(file, kind) {
        log.push(['upload', { name: file.name, type: file.type, kind }]);

        return { url: `${SAMPLE_PHOTO}?name=${encodeURIComponent(file.name)}`, name: file.name };
    },
};

const builder = mountPageBuilder(document.getElementById('builder'), {
    value,
    adapter,
    blocks: ownBlocks,
    locale: new URLSearchParams(location.search).get('locale') === 'en' ? 'en' : 'ms',
    title: 'Halaman utama',
    backUrl: '#back',
    viewUrl: 'https://example.com/',
    accent: '#2563eb',
    onChange(next) {
        log.push(['change', next.sections.length]);
    },
});

window.demoBuilder = builder;

/* ------------------------------------------------------------------ */
/* A tiny page renderer with the builder's marks.                      */
/* ------------------------------------------------------------------ */

const escapeHtml = (value) =>
    String(value ?? '').replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** Same allow-list as the PHP renderer and the builder. */
function safeUrl(url) {
    const trimmed = String(url ?? '').trim();

    return [/^https?:\/\/[^\s/?#]+\S*$/i, /^mailto:\S+$/i, /^tel:\S+$/i, /^#[^\s#]+$/, /^\/(?!\/)\S*$/].some((pattern) =>
        pattern.test(trimmed),
    )
        ? trimmed
        : null;
}

function inline(content) {
    if (!Array.isArray(content)) {
        return '';
    }

    return content
        .map((item) => {
            let html = escapeHtml(item.text ?? '');

            if (item.styles?.bold) html = `<strong>${html}</strong>`;
            if (item.styles?.italic) html = `<em>${html}</em>`;

            return item.type === 'link'
                ? `<a href="${escapeHtml(safeUrl(item.href) ?? '#')}">${inline(item.content)}</a>`
                : html;
        })
        .join('');
}

function parseValues(values) {
    try {
        const parsed = JSON.parse(values || '{}');

        return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
        return {};
    }
}

function renderOwnBlock(props) {
    const definition = ownBlocks.find((entry) => entry.kind === props.kind);

    if (!definition) {
        return `<figure class="bn-media-empty" data-empty-media="block"><span>Blok “${escapeHtml(props.kind)}” tiada.</span></figure>`;
    }

    const values = { ...definition.defaults, ...parseValues(props.values) };
    const rows = Object.entries(values)
        .map(([key, entry]) => {
            const shown = Array.isArray(entry) ? entry.map((row) => Object.values(row).join(' ')).join(', ') : entry;

            return `<li><b>${escapeHtml(key)}</b>: ${escapeHtml(shown)}</li>`;
        })
        .join('');

    return `<div class="bn-own-block" data-own-block="${escapeHtml(definition.kind)}"><p class="own-label">${escapeHtml(definition.label)}</p><ul>${rows}</ul></div>`;
}

function renderBlock(item, path) {
    const props = item.props ?? {};
    const mark = ` data-item="${path}"`;
    const children = (item.children ?? []).map((child, index) => renderBlock(child, `${path}.${index}`)).join('');
    const align = props.textAlignment && props.textAlignment !== 'left' ? ` style="text-align:${props.textAlignment}"` : '';

    switch (item.type) {
        case 'heading': {
            const level = Math.min(4, Math.max(1, Number(props.level) || 2));

            return `<h${level}${mark}${align}>${inline(item.content)}</h${level}>${children}`;
        }
        case 'paragraph':
            return `<p${mark}${align}>${inline(item.content) || '&nbsp;'}</p>${children}`;
        case 'bulletListItem':
        case 'numberedListItem':
        case 'checkListItem':
            return `<ul${mark}><li>${inline(item.content)}${children}</li></ul>`;
        case 'quote':
            return `<blockquote${mark}>${inline(item.content)}</blockquote>${children}`;
        case 'toggleListItem':
            return `<details${mark}><summary>${inline(item.content)}</summary>${children}</details>`;
        case 'image':
            return props.url
                ? `<figure${mark}><img src="${escapeHtml(props.url)}" alt=""></figure>`
                : `<figure class="bn-media-empty" data-empty-media="image"${mark}><span>Tambah gambar di sini</span></figure>`;
        case 'button': {
            const href = safeUrl(props.url);
            const variant = props.variant === 'outline' ? 'outline' : 'solid';
            const label = escapeHtml(props.text || 'Butang');

            return href
                ? `<a class="bn-button bn-button-${variant}" href="${escapeHtml(href)}"${mark}>${label}</a>`
                : `<span class="bn-button bn-button-${variant}"${mark}>${label}</span>`;
        }
        case 'ownBlock':
            return renderOwnBlock(props).replace(/^<(\w+)/, `<$1${mark}`);
        case 'divider':
            return `<hr${mark}>`;
        case 'columnList':
            return `<div class="cols"${mark}>${children}</div>`;
        case 'column':
            return `<div class="col"${mark}>${children}</div>`;
        default:
            return `<div${mark}>${inline(item.content)}${children}</div>`;
    }
}

function renderSection(section) {
    const data = section.data;
    const classes = ['sf-section', `sf-layout-${data.layout}`, `sf-pad-${data.padding}`];

    if (data.width === 'full') classes.push('sf-full');

    const background =
        data.background === 'color' && /^#[0-9a-f]{6}$/i.test(data.background_color ?? '')
            ? `background:${data.background_color};`
            : data.background === 'image' && data.image
              ? `background:linear-gradient(rgb(0 0 0 / ${data.tint / 100}), rgb(0 0 0 / ${data.tint / 100})), url("${escapeHtml(data.image)}") center/cover;color:#fff;`
              : '';
    const body = data.document.map((item, index) => renderBlock(item, String(index))).join('');

    return `<div data-block-id="${escapeHtml(section.id)}" data-empty-label="Seksyen kosong"><section${data.anchor ? ` id="${escapeHtml(data.anchor)}"` : ''} class="${classes.join(' ')}" style="${background}"><div class="sf-body">${body}</div></section></div>`;
}

function renderPage(page) {
    const sections = page.sections.filter((section) => !section.hidden).map(renderSection).join('');

    return `<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style>
body{margin:0;font:17px/1.6 system-ui,-apple-system,"Segoe UI",sans-serif;color:#0f172a;background:#fff}
.sf-section{padding:3rem 1.5rem}.sf-pad-none{padding-block:0}.sf-pad-sm{padding-block:1.5rem}.sf-pad-lg{padding-block:5rem}.sf-pad-xl{padding-block:7rem}
.sf-body{max-width:44rem;margin:0 auto}.sf-full{padding-inline:0}.sf-full .sf-body{max-width:none}
.sf-layout-hero .sf-body{max-width:60rem}.sf-layout-hero h1{font-size:3rem;line-height:1.1;margin:0 0 1rem}
.sf-layout-banner{background:#2563eb;color:#fff;text-align:center}
.sf-layout-cards .sf-body{max-width:60rem}
h1,h2,h3{line-height:1.2}figure{margin:1rem 0}img{max-width:100%;border-radius:1rem;display:block}
.bn-media-empty{display:grid;place-items:center;min-height:12rem;border:2px dashed #94a3b8;border-radius:1rem;color:#64748b;background:#f8fafc}
.bn-button{display:inline-block;margin:.5rem 0;padding:.8rem 1.6rem;border-radius:.75rem;font-weight:700;text-decoration:none}
.bn-button-solid{background:#2563eb;color:#fff}.bn-button-outline{border:2px solid #2563eb;color:#2563eb}
.bn-own-block{margin:1rem 0;padding:1rem 1.25rem;border:1px solid #e2e8f0;border-radius:1rem;background:#f8fafc}
.bn-own-block .own-label{margin:0 0 .25rem;font-weight:700}.bn-own-block ul{margin:0;padding-left:1.1rem;font-size:.9rem;color:#475569}
details{border-bottom:1px solid #e2e8f0;padding:.75rem 0}summary{cursor:pointer;font-weight:600}
.cols{display:grid;grid-auto-flow:column;gap:1.5rem}
</style></head><body>${sections}</body></html>`;
}
