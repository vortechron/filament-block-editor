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
 *
 * Format 2: the demo has an in-memory design kit (`saveKit`), opens as a
 * developer (add `?developer=0` to see it as a shop owner), and the stub
 * draws each style bag, advanced part and the kit, roughly as
 * Styling\StyleSheet and Design\Kit do.
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

/** The site's design kit, kept in memory. */
let kit = {
    version: 1,
    colors: {
        primary: '#2563eb',
        secondary: '#0f172a',
        accent: '#f59e0b',
        text: '#0f172a',
        muted: '#64748b',
        background: '#ffffff',
        surface: '#f8fafc',
        border: '#e2e8f0',
    },
    custom_colors: [{ key: 'gold', label: 'Emas', value: '#c59d6e' }],
    fonts: { heading: 'theme', body: 'theme' },
    text: { base_size: '17px', heading_weight: '700' },
    radius: '12px',
    buttons: { style: 'solid', radius: '12px', size: 'md', text_transform: 'none', font_weight: '700' },
    forms: { style: 'outline', radius: '8px', labels: 'above' },
};

const value = {
    version: 2,
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
            lock: { move: true },
            data: {
                layout: 'plain',
                anchor: 'tentang',
                style: { desktop: { background_color: 'kit:surface' }, phone: { padding_top: '12px' } },
                document: [
                    block('heading', { level: 2 }, text('Tentang kami')),
                    block('paragraph', {}, text('Kami kedai keluarga di tengah bandar.')),
                ],
            },
        },
        { id: 'sync0003', type: 'ref', ref: 12 },
    ],
};

const adapter = {
    async save(page) {
        log.push(['save', structuredClone(page)]);
        console.info('[demo] save', page);

        return { ok: true };
    },
    async preview(page, extra) {
        log.push(['preview', structuredClone(page), extra?.kit ? 'with kit' : '']);

        return renderPage(page, extra?.kit ?? kit);
    },
    async saveKit(next) {
        log.push(['saveKit', structuredClone(next)]);
        kit = structuredClone(next);

        return { ok: true };
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
    developer: new URLSearchParams(location.search).get('developer') !== '0',
    kit,
    fonts: [
        { value: 'serif', label: 'Luxury serif' },
        { value: 'georgia', label: 'Georgia' },
    ],
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

/** A block, wrapped in `fbe-b-{id}` when it has a look of its own. */
function renderBlock(item, path, sheet) {
    const html = renderBlockOnly(item, path, sheet);
    const look = parseValues(item.props?.look || '{}');

    if (!item.id || (!look.style && !look.advanced)) {
        return html;
    }

    addLookRules(`.sf-page .fbe-b-${item.id}`, look, sheet);

    return `<div class="fbe-b fbe-b-${escapeHtml(item.id)} ${escapeHtml(look.advanced?.class ?? '')}">${html}</div>`;
}

function renderBlockOnly(item, path, sheet) {
    const props = item.props ?? {};
    const mark = ` data-item="${path}"`;
    const children = (item.children ?? []).map((child, index) => renderBlock(child, `${path}.${index}`, sheet)).join('');
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

function renderSection(section, sheet) {
    if (section.type === 'ref') {
        return `<div data-block-id="${escapeHtml(section.id)}" data-ref="${escapeHtml(section.ref)}"><section class="sf-section sf-ref"><div class="sf-body"><p>Seksyen segerak #${escapeHtml(section.ref)}. Pelayan melukisnya di sini.</p></div></section></div>`;
    }

    const data = section.data;
    const classes = ['sf-section', `sf-layout-${data.layout}`, `sf-pad-${data.padding}`];

    if (data.width === 'full') classes.push('sf-full');
    if (data.style || data.advanced) {
        classes.push(`fbe-s-${section.id}`, ...(data.advanced?.class ?? '').split(' ').filter(Boolean));
        addLookRules(`.sf-page .fbe-s-${section.id}`, data, sheet);
    }

    const background =
        data.background === 'color' && /^#[0-9a-f]{6}$/i.test(data.background_color ?? '')
            ? `background:${data.background_color};`
            : data.background === 'image' && data.image
              ? `background:linear-gradient(rgb(0 0 0 / ${data.tint / 100}), rgb(0 0 0 / ${data.tint / 100})), url("${escapeHtml(data.image)}") center/cover;color:#fff;`
              : '';
    const body = data.document.map((item, index) => renderBlock(item, String(index), sheet)).join('');

    return `<div data-block-id="${escapeHtml(section.id)}" data-empty-label="Seksyen kosong"><section${data.anchor ? ` id="${escapeHtml(data.anchor)}"` : ''} class="${classes.join(' ')}" style="${background}"><div class="sf-body">${body}</div></section></div>`;
}

function renderPage(page, designKit) {
    const sheet = [];
    const sections = page.sections
        .filter((section) => !section.hidden)
        .map((section) => renderSection(section, sheet))
        .join('');

    return `<!doctype html><html lang="ms"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><style data-fbe-kit>${kitCss(designKit)}</style><style>
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
.sf-ref{background:repeating-linear-gradient(45deg,#f8fafc 0 12px,#f1f5f9 12px 24px);color:#475569}
</style><style data-fbe-style>${sheet.join('\n')}</style></head><body class="sf-page">${sections}</body></html>`;
}

/* ------------------------------------------------------------------ */
/* Styles and the design kit, roughly as Styling\StyleSheet draws them. */
/* ------------------------------------------------------------------ */

const CSS_PROPERTIES = {
    padding_top: 'padding-top',
    padding_right: 'padding-right',
    padding_bottom: 'padding-bottom',
    padding_left: 'padding-left',
    margin_top: 'margin-top',
    margin_bottom: 'margin-bottom',
    width: 'width',
    max_width: 'max-width',
    min_height: 'min-height',
    gap: 'gap',
    color: 'color',
    background_color: 'background-color',
    border_color: 'border-color',
    font_family: 'font-family',
    font_size: 'font-size',
    letter_spacing: 'letter-spacing',
    font_weight: 'font-weight',
    line_height: 'line-height',
    text_transform: 'text-transform',
    text_align: 'text-align',
    border_width: 'border-width',
    border_style: 'border-style',
    radius: 'border-radius',
    shadow: 'box-shadow',
    opacity: 'opacity',
};

const FONT_STACKS = {
    theme: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    grotesk: "'Bricolage Grotesque', system-ui, sans-serif",
    condensed: "'Barlow Condensed', 'Arial Narrow', sans-serif",
    serif: "'Bodoni Moda', Didot, Georgia, serif",
    poster: "Anton, Impact, 'Arial Black', sans-serif",
    geometric: "Jost, Futura, 'Century Gothic', sans-serif",
    mono: 'ui-monospace, Menlo, monospace',
    georgia: 'Georgia, serif',
};

const MEDIA = { tablet: '(max-width: 1024px)', phone: '(max-width: 767px)' };

const HIDE_ON = {
    desktop: '(min-width: 1025px)',
    tablet: '(min-width: 768px) and (max-width: 1024px)',
    phone: '(max-width: 767px)',
};

function cssValue(key, value) {
    if (key === 'font_family') {
        return value.startsWith('kit:') ? `var(--kit-font-${value.slice(4)})` : (FONT_STACKS[value] ?? 'inherit');
    }

    if (key === 'shadow') return `var(--kit-shadow-${value})`;
    if (value === 'kit:radius') return 'var(--kit-radius)';

    return value.startsWith('kit:') ? `var(--kit-color-${value.slice(4)})` : value;
}

function addLookRules(selector, look, sheet) {
    for (const variant of ['desktop', 'tablet', 'phone', 'hover']) {
        const values = look.style?.[variant];

        if (!values) continue;

        const body = Object.entries(values)
            .filter(([key]) => CSS_PROPERTIES[key])
            .map(([key, value]) => `${CSS_PROPERTIES[key]}:${cssValue(key, String(value))}`)
            .join(';');
        const rule = `${variant === 'hover' ? `${selector}:hover` : selector}{${body}}`;

        sheet.push(MEDIA[variant] ? `@media ${MEDIA[variant]}{${rule}}` : rule);
    }

    for (const device of look.advanced?.hide_on ?? []) {
        sheet.push(`@media ${HIDE_ON[device]}{${selector}{display:none}}`);
    }

    if (look.advanced?.css && !look.advanced.css.includes('<')) {
        sheet.push(look.advanced.css.replaceAll('selector', selector));
    }
}

function kitCss(designKit) {
    const colors = { ...designKit.colors };

    designKit.custom_colors.forEach((color) => {
        colors[color.key] = color.value;
    });

    const variables = Object.entries(colors).map(([key, color]) => `--kit-color-${key}:${color}`);
    const { buttons } = designKit;
    const buttonRadius = buttons.style === 'pill' ? '999px' : buttons.radius;
    const buttonPadding = { sm: '.5rem 1.1rem', md: '.8rem 1.6rem', lg: '1rem 2.2rem' }[buttons.size] ?? '.8rem 1.6rem';

    return `.sf-page{${variables.join(';')};--kit-font-heading:${FONT_STACKS[designKit.fonts.heading] ?? 'inherit'};--kit-font-body:${FONT_STACKS[designKit.fonts.body] ?? 'inherit'};--kit-radius:${designKit.radius};--kit-shadow-none:none;--kit-shadow-sm:0 1px 2px rgb(15 23 42/.08);--kit-shadow-md:0 4px 14px rgb(15 23 42/.12);--kit-shadow-lg:0 12px 32px rgb(15 23 42/.16);--kit-shadow-xl:0 24px 60px rgb(15 23 42/.22)}
.sf-page{color:var(--kit-color-text);background:var(--kit-color-background);font-family:var(--kit-font-body);font-size:${designKit.text.base_size}}
.sf-page h1,.sf-page h2,.sf-page h3{font-family:var(--kit-font-heading);font-weight:${designKit.text.heading_weight}}
.sf-page img{border-radius:var(--kit-radius)}
.sf-page .bn-button{border-radius:${buttonRadius};padding:${buttonPadding};text-transform:${buttons.text_transform};font-weight:${buttons.font_weight}}
.sf-page .bn-button-solid{background:var(--kit-color-primary);color:#fff;${buttons.style === 'outline' ? 'background:transparent;color:var(--kit-color-primary);box-shadow:inset 0 0 0 2px var(--kit-color-primary)' : ''}${buttons.style === 'shadow' ? 'box-shadow:0 8px 20px -6px var(--kit-color-primary)' : ''}}
.sf-page .bn-button-outline{border:2px solid var(--kit-color-primary);color:var(--kit-color-primary)}`;
}
