import type {
    PageValue,
    PageValueInput,
    RichSection,
    Section,
    SectionData,
    SectionLayout,
    SectionTemplate,
    SectionTemplateInput,
} from '@/types';
import { cleanAdvanced } from './advanced';
import { cleanLock } from './locks';
import { cleanStyleBag } from './style-bag';

/** Same limit as Content\PageContent::MAX_SECTIONS. */
export const MAX_SECTIONS = 30;

/** The page value format the builder writes. Mirrors Content\PageValue::VERSION. */
export const PAGE_VALUE_VERSION = 2;

const ANCHOR_LENGTH = 40;

const REF_LENGTH = 40;

export const SECTION_LAYOUTS: readonly SectionLayout[] = [
    'plain',
    'hero',
    'cards',
    'ticks',
    'reviews',
    'faq',
    'highlight',
    'banner',
    'product',
    'poster',
    'editorial',
    'bento',
    'steps',
    'stats',
    'compare',
    'marquee',
];

const ENUMS = {
    layout: SECTION_LAYOUTS,
    background: ['none', 'color', 'image'],
    padding: ['md', 'none', 'sm', 'lg', 'xl'],
    font: ['theme', 'grotesk', 'condensed', 'serif', 'poster', 'geometric', 'mono'],
    align: ['auto', 'left', 'center'],
    corners: ['theme', 'square', 'soft', 'round'],
    button: ['theme', 'solid', 'outline', 'pill', 'shadow'],
    width: ['normal', 'full'],
} as const;

/** A new section's look. The first value of every enum is its default. */
export const SECTION_DEFAULTS: SectionData = {
    document: [],
    layout: 'plain',
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
};

/**
 * A short random id for a new section. Math.random is used on purpose:
 * crypto.randomUUID only exists on secure (https) pages.
 */
export function newSectionId(): string {
    return Math.random().toString(36).slice(2, 10).padEnd(8, '0');
}

/**
 * The value the builder starts from and sends, whatever the host passed:
 * format 2, or format 1 (`{ sections }` or a bare list), upgraded. The
 * server stays the authority; this only makes sure the builder never
 * sends junk.
 */
export function normalizeValue(
    value: PageValueInput | PageValue | null | undefined,
): PageValue {
    const sections: readonly unknown[] = Array.isArray(value)
        ? value
        : Array.isArray((value as { sections?: unknown } | null)?.sections)
          ? (value as { sections: readonly unknown[] }).sections
          : [];

    return {
        version: PAGE_VALUE_VERSION,
        sections: sections
            .filter(
                (section): section is Record<string, unknown> =>
                    typeof section === 'object' && section !== null,
            )
            .filter((section) => section.type !== 'ref' || isRef(section.ref))
            .slice(0, MAX_SECTIONS)
            .map(normalizeSection),
    };
}

export function isRichSection(section: Section): section is RichSection {
    return section.type === 'rich';
}

/** The last section with words of its own, for adding an item to. */
export function lastRich(sections: readonly Section[]): RichSection | undefined {
    return sections.filter(isRichSection).at(-1);
}

/** A synced section's id: a positive whole number, or text up to 40 characters. */
export function isRef(value: unknown): value is number | string {
    return typeof value === 'number'
        ? Number.isInteger(value) && value > 0
        : typeof value === 'string' &&
              value !== '' &&
              value.length <= REF_LENGTH;
}

function normalizeSection(section: Record<string, unknown>): Section {
    const id =
        typeof section.id === 'string' && section.id !== ''
            ? section.id
            : newSectionId();
    const hidden = section.hidden === true ? { hidden: true as const } : {};

    if (section.type === 'ref') {
        return { id, type: 'ref', ref: section.ref as number | string, ...hidden };
    }

    const lock = cleanLock(section.lock);

    return {
        id,
        type: 'rich',
        data: normalizeSectionData(section.data as Partial<SectionData>),
        ...hidden,
        ...(lock ? { lock } : {}),
    };
}

/** Every look field, with its default when it is missing or not allowed. */
export function normalizeSectionData(
    data: Partial<SectionData> | null | undefined,
): SectionData {
    const raw = (data ?? {}) as Record<string, unknown>;
    const pick = <K extends keyof typeof ENUMS>(key: K): SectionData[K] =>
        ((ENUMS[key] as readonly unknown[]).includes(raw[key])
            ? raw[key]
            : SECTION_DEFAULTS[key]) as SectionData[K];
    const text = (key: string): string | null =>
        typeof raw[key] === 'string' && raw[key] !== '' ? raw[key] : null;
    const tint = Number(raw.tint);
    const style = cleanStyleBag(raw.style);
    const advanced = cleanAdvanced(raw.advanced);

    return {
        document: Array.isArray(raw.document)
            ? (raw.document as SectionData['document'])
            : [],
        layout: pick('layout'),
        background: pick('background'),
        background_color: text('background_color'),
        image: text('image'),
        tint: Number.isFinite(tint)
            ? Math.min(100, Math.max(0, Math.round(tint)))
            : SECTION_DEFAULTS.tint,
        card: raw.card === true,
        padding: pick('padding'),
        font: pick('font'),
        align: pick('align'),
        text_color: text('text_color'),
        corners: pick('corners'),
        button: pick('button'),
        anchor: isAnchor(raw.anchor) ? raw.anchor : null,
        width: pick('width'),
        ...(style ? { style } : {}),
        ...(advanced ? { advanced } : {}),
    };
}

/** Same pattern as the PHP side: lower-case words joined by dashes. */
export function isAnchor(value: unknown): value is string {
    return (
        typeof value === 'string' &&
        value.length <= ANCHOR_LENGTH &&
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    );
}

/**
 * The anchor as it is typed: lower-case, every other character a dash.
 * A dash at the end stays, so the next word can follow it.
 */
export function typeAnchor(text: string): string {
    return text
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+/, '')
        .slice(0, ANCHOR_LENGTH);
}

/** The anchor once typing is done. Empty means none. */
export function finishAnchor(text: string): string | null {
    const anchor = typeAnchor(text).replace(/-+$/, '');

    return anchor === '' ? null : anchor;
}

/** The host's templates, ready for the Add panel. */
export function normalizeTemplates(
    inputs: readonly SectionTemplateInput[] | null | undefined,
): SectionTemplate[] {
    return (inputs ?? [])
        .filter(
            (input) =>
                typeof input?.key === 'string' &&
                input.key !== '' &&
                typeof input.label === 'string',
        )
        .map((input) => ({
            key: input.key,
            label: input.label,
            category:
                typeof input.category === 'string' && input.category !== ''
                    ? input.category
                    : 'basic',
            categoryLabel:
                typeof input.categoryLabel === 'string'
                    ? input.categoryLabel
                    : null,
            description:
                typeof input.description === 'string' ? input.description : '',
            data: normalizeSectionData(input.section?.data),
        }));
}

/**
 * A new section from a ready-made template. The data is copied, so editing
 * the section never changes the template.
 */
export function sectionFromTemplate(template: SectionTemplate): RichSection {
    return {
        id: newSectionId(),
        type: 'rich',
        data: structuredClone(template.data),
    };
}
