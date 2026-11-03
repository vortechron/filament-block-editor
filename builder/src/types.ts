import type RULES from '@/generated/rules.json';

/**
 * The page value and everything the host passes in. The page value is the
 * same shape the PHP side stores and renders (Content\PageContent): a
 * list of sections, each a BlockNote document and the look around it.
 */

/** BlockNote blocks. Their shape belongs to BlockNote, so it stays loose. */
export type RichDocument = Record<
    string,
    string | number | boolean | null | object
>[];

export type RichBackground = 'none' | 'color' | 'image';

export type RichPadding = 'none' | 'sm' | 'md' | 'lg' | 'xl';

/** How a section arranges its blocks. Mirrors Enums\SectionLayout. */
export type SectionLayout =
    | 'plain'
    | 'hero'
    | 'cards'
    | 'ticks'
    | 'reviews'
    | 'faq'
    | 'highlight'
    | 'banner'
    | 'product'
    | 'poster'
    | 'editorial'
    | 'bento'
    | 'steps'
    | 'stats'
    | 'compare'
    | 'marquee';

/** The font of a section's headings. Mirrors Enums\SectionFont. */
export type SectionFont =
    | 'theme'
    | 'grotesk'
    | 'condensed'
    | 'serif'
    | 'poster'
    | 'geometric'
    | 'mono';

export type RichAlign = 'auto' | 'left' | 'center';

export type RichCorners = 'theme' | 'square' | 'soft' | 'round';

export type RichButton = 'theme' | 'solid' | 'outline' | 'pill' | 'shadow';

/** `full` drops the section body's max width and side padding. */
export type SectionWidth = 'normal' | 'full';

/** The widths a style can change at. `desktop` is the base. */
export type StyleDevice = 'desktop' | 'tablet' | 'phone';

/** A part of a style bag: one device, or the look under the pointer. */
export type StyleVariant = StyleDevice | 'hover';

/** Style keys and their CSS values, like `{ padding_top: '24px' }`. */
export type StyleValues = Record<string, string>;

/**
 * An open-ended style, per device. Mirrors Styling\StyleBag: `tablet`
 * applies up to 1024px wide, `phone` up to 767px, `hover` under the
 * pointer (a few colour keys only).
 */
export type StyleBag = Partial<Record<StyleVariant, StyleValues>>;

/** Extra class names, devices to hide on, and developer-only CSS. Mirrors Styling\Advanced. */
export type Advanced = {
    class?: string | null;
    /** Developers only. `selector` stands for the element itself. */
    css?: string | null;
    hide_on?: StyleDevice[];
};

/** What a block's `look` prop holds, as a JSON string. */
export type BlockLook = { style?: StyleBag; advanced?: Advanced };

/** What a non-developer may not do to a section. Each key is only there when true. */
export type SectionLock = {
    move?: true;
    remove?: true;
    content?: true;
    style?: true;
};

export type LockKey = keyof SectionLock;

/** One section's document and look. Mirrors Content\PageContent. */
export type SectionData = {
    document: RichDocument;
    layout: SectionLayout;
    background: RichBackground;
    background_color: string | null;
    /** The background picture, as a URL. */
    image: string | null;
    /** How dark the picture is made, 0 to 100. */
    tint: number;
    /** Put the text on a white card over the picture. */
    card: boolean;
    padding: RichPadding;
    /** The section's own style. "theme" and "auto" follow the page theme. */
    font: SectionFont;
    align: RichAlign;
    /** The words' colour, or null to pick dark or white by itself. */
    text_color: string | null;
    corners: RichCorners;
    button: RichButton;
    /** The section's id on the page, for menu links like #about. */
    anchor: string | null;
    width: SectionWidth;
    /** The open-ended style. It wins over the fields above. Left out when empty. */
    style?: StyleBag;
    /** Left out when empty. */
    advanced?: Advanced;
};

/** A section the page draws from its own document. `hidden` sections stay off the public page. */
export type RichSection = {
    id: string;
    type: 'rich';
    data: SectionData;
    hidden?: true;
    lock?: SectionLock;
};

/** A synced section: the page shows the section stored under `ref`. */
export type RefSection = {
    id: string;
    type: 'ref';
    ref: number | string;
    hidden?: true;
};

export type Section = RichSection | RefSection;

/** The value the builder edits, saves and previews. Format 2 (Content\PageValue::VERSION). */
export type PageValue = { version: 2; sections: Section[] };

/**
 * A value the host may pass in: format 2, or format 1 (`{ sections }` or
 * a bare list of sections), which the builder upgrades.
 */
export type PageValueInput =
    | { version?: number; sections?: readonly unknown[] }
    | readonly unknown[];

/** The site's design values. Mirrors Design\Kit. */
export type Kit = {
    version: 1;
    colors: Record<string, string>;
    custom_colors: KitColor[];
    fonts: { heading: string; body: string };
    text: { base_size: string; heading_weight: string };
    radius: string;
    buttons: {
        style: string;
        radius: string;
        size: string;
        text_transform: string;
        font_weight: string;
    };
    forms: { style: string; radius: string; labels: string };
};

/** A colour the site adds to the 8 fixed ones. */
export type KitColor = { key: string; label: string; value: string };

/** A font the host offers, by the key stored in the kit or a style. */
export type FontChoice = { value: string; label: string };

/** A value the site fills in when the page is drawn. Mirrors Content\DynamicValues. */
export type DynamicValueDefinition = {
    key: string;
    label: string;
    type: 'text' | 'link' | 'image';
    group?: string;
    preview?: string | null;
};

/** A synced section the host offers, with the section it holds. */
export type SyncedSectionOption = {
    id: number | string;
    title: string;
    editUrl?: string | null;
    section: RichSection;
};

export type PartKey = (typeof RULES.part_kinds)[number];

/** The header or footer, shown on every page and built on its own. */
export type PagePart = {
    key: PartKey;
    title: string;
    editUrl: string;
};

/** The shop info form shown with the header and footer. */
export type SiteInfo = {
    groups: { key: string; label: string; fields: OwnBlockField[] }[];
    values: Record<string, Record<string, unknown>>;
};

/** What kind of document the builder edits. Enums\DocumentKind on the server. */
export type DocumentKind = (typeof RULES.document_kinds)[number];

/** A ready-made section for the Add panel, as the host sends it. */
export type SectionTemplateInput = {
    key: string;
    label: string;
    category?: string;
    /** The category's name in the menu. Known categories have their own. */
    categoryLabel?: string;
    description?: string;
    section: { type?: 'rich'; data: Partial<SectionData> };
};

/** A ready-made section, ready for the builder. */
export type SectionTemplate = {
    key: string;
    label: string;
    category: string;
    categoryLabel: string | null;
    description: string;
    data: SectionData;
};

export type OwnBlockFieldType =
    | 'text'
    | 'textarea'
    | 'select'
    | 'toggle'
    | 'number'
    | 'image'
    | 'link'
    | 'list';

/** One field of a host's own block. Mirrors Blocks\Field::toArray(). */
export type OwnBlockField = {
    name: string;
    type: OwnBlockFieldType;
    label?: string | null;
    help?: string | null;
    default?: unknown;
    options?: { value: string; label: string }[];
    /** For `list`: the fields of one row, and how many rows at most. */
    fields?: OwnBlockField[];
    maxItems?: number | null;
    /** Only developers see the field. Its value is kept for everyone. */
    developerOnly?: boolean;
    [key: string]: unknown;
};

/** A block the host defines and draws. Mirrors Blocks\OwnBlock::toArray(). */
export type OwnBlockDefinition = {
    kind: string;
    label: string;
    icon?: string | null;
    description?: string | null;
    fields: OwnBlockField[];
    defaults?: Record<string, unknown>;
};

export type SaveResult =
    | { ok: true }
    | { ok: false; errors: Record<string, string> };

export type UploadKind = 'image' | 'video' | 'file';

/** What `saveSection` answers. */
export type SaveSectionResult =
    | { ok: true; id: number | string; template?: SectionTemplateInput }
    | { ok: false; errors: Record<string, string> };

/** How the builder talks to the host. */
export type PageBuilderAdapter = {
    save: (value: PageValue) => Promise<SaveResult>;
    /**
     * A full HTML document of the page, drawn with the builder's markers.
     * `extra.kit` is the design kit with changes not saved yet.
     */
    preview: (value: PageValue, extra?: { kit?: Kit }) => Promise<string>;
    upload: (
        file: File,
        kind: UploadKind,
    ) => Promise<{ url: string; name?: string }>;
    /** Saves the design kit. Without it there is no design panel. */
    saveKit?: (kit: Kit) => Promise<SaveResult>;
    saveSection?: (
        section: RichSection,
        meta: { title: string; synced: boolean },
    ) => Promise<SaveSectionResult>;
    saveSiteInfo?: (
        values: Record<string, Record<string, unknown>>,
    ) => Promise<SaveResult>;
};

export type PageBuilderOptions = {
    value?: PageValueInput | null;
    adapter: PageBuilderAdapter;
    blocks?: OwnBlockDefinition[];
    templates?: SectionTemplateInput[];
    locale?: 'ms' | 'en';
    /** Text overrides, keyed by the builder's English text. */
    strings?: Record<string, string>;
    title?: string;
    /** The "back" button. Left out, there is no back button. */
    backUrl?: string | null;
    /** The "view page" button. Left out, there is no such button. */
    viewUrl?: string | null;
    /** The page's accent colour, as #rrggbb. */
    accent?: string | null;
    onChange?: (value: PageValue) => void;
    /** Shows locks, custom CSS and developer-only fields. */
    developer?: boolean;
    /**
     * The current design kit. The colour and font pickers always use it;
     * the design panel shows only when `adapter.saveKit` exists too.
     */
    kit?: Kit | null;
    /**
     * The kit's defaults on this site (Kit::defaults(): the package's,
     * with the host's config over them). Fills what `kit` leaves out.
     */
    kitDefaults?: Kit | null;
    /** The fonts a kit or a style may use, besides the theme's. */
    fonts?: FontChoice[];
    dynamicValues?: DynamicValueDefinition[];
    syncedSections?: SyncedSectionOption[];
    parts?: PagePart[];
    siteInfo?: SiteInfo | null;
    kind?: DocumentKind;
};

export type PageBuilderInstance = {
    getValue: () => PageValue;
    unmount: () => void;
};
