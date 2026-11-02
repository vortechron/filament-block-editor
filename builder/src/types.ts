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
};

/** A section of the page. `hidden` sections stay off the public page. */
export type Section = {
    id: string;
    type: 'rich';
    data: SectionData;
    hidden?: true;
};

/** The value the builder edits, saves and previews. */
export type PageValue = { sections: Section[] };

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

/** How the builder talks to the host. */
export type PageBuilderAdapter = {
    save: (value: PageValue) => Promise<SaveResult>;
    /** A full HTML document of the page, drawn with the builder's markers. */
    preview: (value: PageValue) => Promise<string>;
    upload: (
        file: File,
        kind: UploadKind,
    ) => Promise<{ url: string; name?: string }>;
};

export type PageBuilderOptions = {
    value?: Partial<PageValue> | null;
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
};

export type PageBuilderInstance = {
    getValue: () => PageValue;
    unmount: () => void;
};
