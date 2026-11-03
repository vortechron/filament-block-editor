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
 *
 * Content (track B2): shop info values (`dynamicValues`) in text, links and
 * pictures; a form block; a synced section with an edit link; the header
 * and footer (`parts`, drawn with `data-part`) with the shop info form
 * (`siteInfo`, `saveSiteInfo`); `saveSection` for templates and synced
 * sections; hidden sections drawn dimmed. `?kind=footer` shows the top bar
 * of a footer.
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

/** The shop info, kept in memory and changed by `saveSiteInfo`. */
let shop = {
    business: { name: 'Kedai Buku Pak Long', logo: SAMPLE_PHOTO },
    contact: {
        phone: '012-345 6789',
        email: 'kedai@example.com',
        address: 'No. 12, Jalan Merdeka, 83000 Batu Pahat, Johor',
    },
};

const siteInfoFields = {
    business: [{ name: 'name', label: 'Nama kedai', type: 'text' }],
    contact: [
        { name: 'phone', label: 'Telefon', type: 'text' },
        { name: 'email', label: 'E-mel', type: 'text' },
        { name: 'address', label: 'Alamat', type: 'textarea' },
    ],
};

/** The values the site fills in, as Content\DynamicValues would list them. */
function dynamicValues() {
    const digits = shop.contact.phone.replace(/\D/g, '').replace(/^0/, '60');

    return [
        { key: 'site.name', label: 'Nama kedai', type: 'text', group: 'Kedai', preview: shop.business.name },
        { key: 'site.phone', label: 'Telefon', type: 'text', group: 'Kedai', preview: shop.contact.phone },
        { key: 'site.email', label: 'E-mel', type: 'text', group: 'Kedai', preview: shop.contact.email },
        { key: 'site.address', label: 'Alamat', type: 'text', group: 'Kedai', preview: shop.contact.address },
        { key: 'site.whatsapp', label: 'WhatsApp', type: 'link', group: 'Kedai', preview: `https://wa.me/${digits}` },
        { key: 'site.phone_link', label: 'Telefon (pautan)', type: 'link', group: 'Kedai', preview: `tel:${digits}` },
        { key: 'site.email_link', label: 'E-mel (pautan)', type: 'link', group: 'Kedai', preview: `mailto:${shop.contact.email}` },
        { key: 'site.logo', label: 'Logo', type: 'image', group: 'Kedai', preview: shop.business.logo },
    ];
}

function dynamicValue(key) {
    return dynamicValues().find((value) => value.key === key)?.preview ?? '';
}

/** Synced sections and saved templates, kept in memory like the CMS would. */
const synced = new Map([
    [
        12,
        {
            id: 'sync0012',
            type: 'rich',
            data: {
                layout: 'banner',
                document: [
                    block('heading', { level: 2 }, text('Singgah ke kedai kami')),
                    block('paragraph', {}, [
                        ...text('Hubungi kami di '),
                        { type: 'dynamic', props: { key: 'site.phone' } },
                    ]),
                    block('button', { text: 'WhatsApp kami', url: '@site.whatsapp', variant: 'solid' }),
                ],
            },
        },
    ],
]);
let nextId = 20;

const starterForm = {
    name: 'Borang pertanyaan',
    fields: [
        { id: 'f1', type: 'text', name: 'nama', label: 'Nama', placeholder: '', required: true, width: 'half' },
        { id: 'f2', type: 'tel', name: 'telefon', label: 'Telefon', placeholder: '', required: true, width: 'half' },
        { id: 'f3', type: 'select', name: 'servis', label: 'Servis', required: false, width: 'full', options: ['Buku', 'Alat tulis', 'Hadiah'] },
        { id: 'f4', type: 'textarea', name: 'mesej', label: 'Mesej', placeholder: '', required: false, width: 'full', rows: 4 },
    ],
    submit: { text: 'Hantar', align: 'left' },
    success: 'Terima kasih. Kami akan hubungi anda.',
    actions: [{ type: 'email', to: '@site.email', subject: 'Pertanyaan baru dari website' }],
};

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
        {
            id: 'form0004',
            type: 'rich',
            data: {
                layout: 'plain',
                anchor: 'hubungi',
                document: [
                    block('heading', { level: 2 }, text('Hubungi kami')),
                    block('paragraph', {}, [
                        ...text('Telefon '),
                        { type: 'dynamic', props: { key: 'site.phone' } },
                        ...text(' atau isi borang di bawah.'),
                    ]),
                    block('form', { form: JSON.stringify(starterForm) }),
                ],
            },
        },
        {
            id: 'hide0005',
            type: 'rich',
            hidden: true,
            data: {
                layout: 'plain',
                document: [
                    block('heading', { level: 2 }, text('Jualan raya (belum dibuka)')),
                    block('paragraph', {}, text('Seksyen tersembunyi: pelawat tidak nampak.')),
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
    async saveSection(section, meta) {
        log.push(['saveSection', structuredClone(section), meta]);

        const id = nextId++;

        if (meta.synced) {
            synced.set(id, structuredClone(section));

            return { ok: true, id };
        }

        return {
            ok: true,
            id,
            template: { key: `saved-${id}`, label: meta.title, category: 'saved', section: { data: section.data } },
        };
    },
    async saveSiteInfo(values) {
        log.push(['saveSiteInfo', structuredClone(values)]);

        if (String(values.contact?.phone ?? '').replace(/\D/g, '').length < 9) {
            return { ok: false, errors: { 'contact.phone': 'Nombor telefon terlalu pendek.' } };
        }

        shop = { business: { ...shop.business, ...values.business }, contact: { ...shop.contact, ...values.contact } };

        return { ok: true };
    },
    async upload(file, kind) {
        log.push(['upload', { name: file.name, type: file.type, kind }]);

        return { url: `${SAMPLE_PHOTO}?name=${encodeURIComponent(file.name)}`, name: file.name };
    },
};

const params = new URLSearchParams(location.search);

const builder = mountPageBuilder(document.getElementById('builder'), {
    value,
    adapter,
    blocks: ownBlocks,
    locale: params.get('locale') === 'en' ? 'en' : 'ms',
    title: params.get('kind') === 'footer' ? 'Footer kedai' : 'Halaman utama',
    kind: params.get('kind') === 'footer' ? 'footer' : 'page',
    backUrl: '#back',
    viewUrl: 'https://example.com/',
    accent: '#2563eb',
    developer: params.get('developer') !== '0',
    kit,
    fonts: [
        { value: 'serif', label: 'Luxury serif' },
        { value: 'georgia', label: 'Georgia' },
    ],
    dynamicValues: dynamicValues(),
    syncedSections: [
        { id: 12, title: 'Jalur hubungi', editUrl: '#edit-synced-12', section: synced.get(12) },
    ],
    parts: [
        { key: 'header', title: 'Header kedai', editUrl: '#edit-header' },
        { key: 'footer', title: 'Footer kedai', editUrl: '#edit-footer' },
    ],
    siteInfo: {
        groups: [
            { key: 'business', label: 'Perniagaan', fields: siteInfoFields.business },
            { key: 'contact', label: 'Hubungi', fields: siteInfoFields.contact },
        ],
        values: { business: { name: shop.business.name }, contact: { ...shop.contact } },
    },
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

            if (item.type === 'dynamic') {
                const key = item.props?.key ?? '';

                return `<span class="bn-dynamic" data-dynamic="${escapeHtml(key)}">${escapeHtml(dynamicValue(key) || key)}</span>`;
            }

            return item.type === 'link'
                ? `<a href="${escapeHtml(safeUrl(resolveRef(item.href)) ?? '#')}">${inline(item.content)}</a>`
                : html;
        })
        .join('');
}

/** `@site.whatsapp` and friends, as the server resolves them. */
function resolveRef(value) {
    return typeof value === 'string' && value.startsWith('@') ? dynamicValue(value.slice(1)) : value;
}

function renderForm(props, mark) {
    let form;

    try {
        form = JSON.parse(props.form || '{}');
    } catch {
        form = {};
    }

    const fields = (form.fields ?? [])
        .map((field) => {
            const label = `<span>${escapeHtml(field.label)}${field.required ? ' *' : ''}</span>`;
            const width = field.width === 'half' ? ' half' : '';

            if (field.type === 'textarea') {
                return `<label class="bn-field${width}">${label}<textarea rows="${field.rows ?? 4}" placeholder="${escapeHtml(field.placeholder ?? '')}"></textarea></label>`;
            }

            if (field.type === 'select') {
                return `<label class="bn-field${width}">${label}<select>${(field.options ?? []).map((option) => `<option>${escapeHtml(option)}</option>`).join('')}</select></label>`;
            }

            if (field.type === 'consent') {
                return `<label class="bn-field consent"><input type="checkbox"> ${escapeHtml(field.label)}</label>`;
            }

            return `<label class="bn-field${width}">${label}<input type="${escapeHtml(field.type)}" placeholder="${escapeHtml(field.placeholder ?? '')}"></label>`;
        })
        .join('');

    return `<form class="bn-form" style="text-align:${escapeHtml(form.submit?.align ?? 'left')}"${mark}><div class="bn-fields">${fields}</div><button type="submit" class="bn-button bn-button-solid" disabled>${escapeHtml(form.submit?.text || 'Hantar')}</button><p class="bn-form-note">Borang belum disambung</p></form>`;
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
                ? `<figure${mark}><img src="${escapeHtml(resolveRef(props.url))}" alt=""></figure>`
                : `<figure class="bn-media-empty" data-empty-media="image"${mark}><span>Tambah gambar di sini</span></figure>`;
        case 'form':
            return renderForm(props, mark);
        case 'button': {
            const href = safeUrl(resolveRef(props.url));
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
    const hidden = section.hidden ? ' data-hidden' : '';

    if (section.type === 'ref') {
        const held = synced.get(Number(section.ref)) ?? synced.get(section.ref);

        if (held) {
            return renderSection({ ...held, id: section.id, hidden: section.hidden }, sheet).replace(
                /^<div data-block-id="([^"]*)"/,
                `<div data-block-id="$1" data-ref="${escapeHtml(section.ref)}"`,
            );
        }

        return `<div data-block-id="${escapeHtml(section.id)}" data-ref="${escapeHtml(section.ref)}"${hidden}><section class="sf-section sf-ref"><div class="sf-body"><p>Seksyen segerak tiada</p></div></section></div>`;
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

    return `<div data-block-id="${escapeHtml(section.id)}"${hidden} data-empty-label="Seksyen kosong"><section${data.anchor ? ` id="${escapeHtml(data.anchor)}"` : ''} class="${classes.join(' ')}" style="${background}"><div class="sf-body">${body}</div></section></div>`;
}

function renderPage(page, designKit) {
    const sheet = [];
    // The builder's canvas draws hidden sections too, marked data-hidden.
    const sections = page.sections.map((section) => renderSection(section, sheet)).join('');
    const header = `<div data-part="header"><header class="site-header"><b>${escapeHtml(shop.business.name)}</b><nav><a href="#utama">Utama</a><a href="#hubungi">Hubungi</a><a class="bn-button bn-button-solid" href="${escapeHtml(dynamicValue('site.whatsapp'))}">WhatsApp</a></nav></header></div>`;
    const footer = `<div data-part="footer"><footer class="site-footer"><p>${escapeHtml(shop.contact.address)}</p><p>${escapeHtml(shop.contact.phone)} · ${escapeHtml(shop.contact.email)}</p><p>© ${escapeHtml(shop.business.name)}</p></footer></div>`;

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
.site-header{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 1.5rem;border-bottom:1px solid #e2e8f0}
.site-header nav{display:flex;align-items:center;gap:1rem}.site-header a{color:inherit;text-decoration:none}.site-header .bn-button{margin:0;padding:.5rem 1rem;color:#fff}
.site-footer{padding:2rem 1.5rem;background:#0f172a;color:#cbd5e1;font-size:.9rem}.site-footer p{margin:.25rem 0}
.bn-dynamic{background:#e0f2fe;border-radius:.3rem;padding:0 .2rem}
.bn-form{display:grid;gap:1rem;margin:1rem 0}.bn-fields{display:grid;grid-template-columns:1fr 1fr;gap:1rem;text-align:left}
.bn-field{display:grid;gap:.35rem;grid-column:1/-1;font-weight:600;font-size:.9rem}.bn-field.half{grid-column:auto}.bn-field.consent{display:block;font-weight:400}
.bn-field input,.bn-field textarea,.bn-field select{font:inherit;font-weight:400;padding:.6rem .75rem;border:1px solid #cbd5e1;border-radius:var(--kit-radius)}
.bn-form button[disabled]{opacity:.6;cursor:not-allowed}.bn-form-note{margin:0;color:#64748b;font-size:.85rem}
</style><style data-fbe-style>${sheet.join('\n')}</style></head><body class="sf-page">${header}${sections}${footer}</body></html>`;
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
