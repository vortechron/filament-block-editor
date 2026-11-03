import {
    Blocks,
    ClipboardList,
    Columns2,
    Columns3,
    Heading2,
    Heading3,
    Images,
    Image,
    List,
    ListChevronsUpDown,
    ListOrdered,
    type LucideIcon,
    MousePointerClick,
    MoveVertical,
    PanelTop,
    Pilcrow,
    SeparatorHorizontal,
    TextQuote,
    Video,
} from 'lucide-react';
import { iconByName } from '@/lib/icons';
import type { OwnBlockDefinition, SectionLayout } from '@/types';
import { LAYOUT_ICONS } from './section-thumbs';
import type { ItemKey } from './types';

export type CatalogGroup = 'section' | 'text' | 'media' | 'layout' | 'own';

export type CatalogItem = {
    key: ItemKey;
    /** English, shown through t(). Own blocks bring their own label. */
    label: string;
    /** The label is the host's, so it is shown as it is. */
    isOwn?: boolean;
    icon: LucideIcon;
    group: CatalogGroup;
    /** Extra words the search box matches, in both languages. */
    keywords: string;
};

export const GROUP_LABELS: Record<CatalogGroup, string> = {
    section: 'For this section',
    text: 'Text',
    media: 'Photos and videos',
    layout: 'Layout',
    own: 'Blocks',
};

const ITEMS: CatalogItem[] = [
    {
        key: 'heading',
        label: 'Heading',
        icon: Heading2,
        group: 'text',
        keywords: 'title tajuk h2',
    },
    {
        key: 'subheading',
        label: 'Small heading',
        icon: Heading3,
        group: 'text',
        keywords: 'subtitle tajuk kecil h3',
    },
    {
        key: 'paragraph',
        label: 'Text',
        icon: Pilcrow,
        group: 'text',
        keywords: 'paragraph teks perenggan',
    },
    {
        key: 'bulletList',
        label: 'List',
        icon: List,
        group: 'text',
        keywords: 'bullet senarai',
    },
    {
        key: 'numberedList',
        label: 'Numbered list',
        icon: ListOrdered,
        group: 'text',
        keywords: 'number senarai nombor',
    },
    {
        key: 'quote',
        label: 'Quote',
        icon: TextQuote,
        group: 'text',
        keywords: 'testimonial petikan',
    },
    {
        key: 'toggle',
        label: 'Question',
        icon: ListChevronsUpDown,
        group: 'text',
        keywords: 'faq toggle soalan',
    },
    {
        key: 'image',
        label: 'Photo',
        icon: Image,
        group: 'media',
        keywords: 'image picture gambar foto',
    },
    {
        key: 'gallery',
        label: 'Slideshow',
        icon: Images,
        group: 'media',
        keywords: 'gallery carousel galeri',
    },
    {
        key: 'video',
        label: 'Video',
        icon: Video,
        group: 'media',
        keywords: 'youtube tiktok',
    },
    {
        key: 'twoColumns',
        label: '2 columns',
        icon: Columns2,
        group: 'layout',
        keywords: 'columns lajur',
    },
    {
        key: 'threeColumns',
        label: '3 columns',
        icon: Columns3,
        group: 'layout',
        keywords: 'columns lajur',
    },
    {
        key: 'card',
        label: 'Card',
        icon: PanelTop,
        group: 'layout',
        keywords: 'box kad kotak',
    },
    {
        key: 'spacer',
        label: 'Space',
        icon: MoveVertical,
        group: 'layout',
        keywords: 'spacer gap ruang jarak',
    },
    {
        key: 'divider',
        label: 'Line',
        icon: SeparatorHorizontal,
        group: 'layout',
        keywords: 'divider garisan',
    },
    {
        key: 'button',
        label: 'Button',
        icon: MousePointerClick,
        group: 'text',
        keywords: 'button link cta butang pautan',
    },
    {
        key: 'form',
        label: 'Form',
        icon: ClipboardList,
        group: 'text',
        keywords: 'form contact enquiry borang hubungi pertanyaan',
    },
];

/**
 * The extra item a grid layout offers: one more card, point, review or
 * question. Matches layoutSlashMenuItems() in layout-slash-items.tsx.
 */
const LAYOUT_ITEM_LABELS: Partial<Record<SectionLayout, string>> = {
    cards: 'New card',
    ticks: 'New point',
    reviews: 'New review',
    faq: 'New question',
    bento: 'New tile',
    steps: 'New step',
    stats: 'New number',
    compare: 'New column',
    marquee: 'New point',
};

export function layoutItem(layout: SectionLayout | null): CatalogItem | null {
    const label = layout ? LAYOUT_ITEM_LABELS[layout] : undefined;

    if (!layout || !label) {
        return null;
    }

    return {
        key: 'layoutItem',
        label,
        icon: LAYOUT_ICONS[layout],
        group: 'section',
        keywords: 'card point review question kad poin ulasan soalan',
    };
}

/** The host's own blocks, as items. */
export function ownBlockItems(
    ownBlocks: readonly OwnBlockDefinition[],
): CatalogItem[] {
    return ownBlocks.map((definition) => ({
        key: `own:${definition.kind}`,
        label: definition.label,
        isOwn: true,
        icon: iconByName(definition.icon),
        group: 'own',
        keywords: `${definition.kind} ${definition.description ?? ''}`,
    }));
}

/**
 * Every item, with the section's own item first when it has one, and the
 * host's own blocks last.
 */
export function catalogFor(
    layout: SectionLayout | null,
    ownBlocks: readonly OwnBlockDefinition[] = [],
): CatalogItem[] {
    const own = layoutItem(layout);

    return [...(own ? [own] : []), ...ITEMS, ...ownBlockItems(ownBlocks)];
}

/**
 * The name and icon the sidebar shows for a block already on the page.
 * An own block's label is the host's, so `isOwn` says not to translate it.
 */
export function describeBlock(
    type: string,
    props: Record<string, unknown>,
    ownBlocks: readonly OwnBlockDefinition[] = [],
): { label: string; icon: LucideIcon; isOwn?: boolean } {
    if (type === 'ownBlock') {
        const definition = ownBlocks.find((entry) => entry.kind === props.kind);

        return definition
            ? {
                  label: definition.label,
                  icon: iconByName(definition.icon),
                  isOwn: true,
              }
            : { label: 'Unknown block', icon: Blocks };
    }

    if (type === 'heading') {
        return Number(props.level) >= 3
            ? { label: 'Small heading', icon: Heading3 }
            : { label: 'Heading', icon: Heading2 };
    }

    const byType: Record<string, ItemKey> = {
        paragraph: 'paragraph',
        bulletListItem: 'bulletList',
        numberedListItem: 'numberedList',
        checkListItem: 'bulletList',
        quote: 'quote',
        toggleListItem: 'toggle',
        image: 'image',
        gallery: 'gallery',
        video: 'video',
        columnList: 'twoColumns',
        card: 'card',
        spacer: 'spacer',
        divider: 'divider',
        button: 'button',
        form: 'form',
    };
    const item = ITEMS.find((entry) => entry.key === byType[type]);

    if (type === 'columnList') {
        return { label: 'Columns', icon: Columns2 };
    }

    return item
        ? { label: item.label, icon: item.icon }
        : { label: 'Item', icon: Pilcrow };
}
