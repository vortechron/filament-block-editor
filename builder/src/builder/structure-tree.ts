import type { LucideIcon } from 'lucide-react';
import { inlineText } from '../editor/block-meta';
import type { OwnBlockDefinition, RichDocument, Section } from '@/types';
import { describeBlock } from './item-catalog';
import { pathOfBlock } from './page-frame-updates';

/**
 * The Structure tab as data: every section with the items inside it.
 * Pure, so it can be tested without drawing anything.
 */

/** One item (a BlockNote block) in a section. */
export type ItemNode = {
    id: string;
    /** English, shown through t(), unless `isOwn` (the host's own label). */
    label: string;
    labelParams?: { count: number };
    isOwn: boolean;
    icon: LucideIcon;
    /** A short piece of its words, to tell items apart. */
    detail: string;
    /** 0 is straight in the section; items in columns and cards are deeper. */
    depth: number;
    children: ItemNode[];
};

export type SectionNode = {
    id: string;
    section: Section;
    items: ItemNode[];
    /** False for a synced section, a locked one, or one with no items. */
    canExpand: boolean;
};

type TreeOptions = {
    ownBlocks: readonly OwnBlockDefinition[];
    /** Whether the section's items can be opened (not synced, not locked). */
    canOpenItems: (section: Section) => boolean;
};

const MAX_DETAIL = 60;

export function buildStructureTree(
    sections: readonly Section[],
    { ownBlocks, canOpenItems }: TreeOptions,
): SectionNode[] {
    return sections.map((section) => {
        const items =
            section.type === 'rich' && canOpenItems(section)
                ? itemsOf(section.data.document, 0, ownBlocks)
                : [];

        return { id: section.id, section, items, canExpand: items.length > 0 };
    });
}

/** The place of an item in a section's document, as the preview marks it. */
export function itemPath(
    document: RichDocument,
    itemId: string,
): string | null {
    return pathOfBlock(
        document as unknown as Parameters<typeof pathOfBlock>[0],
        itemId,
    );
}

type RawBlock = {
    id?: unknown;
    type?: unknown;
    props?: unknown;
    content?: unknown;
    children?: unknown;
};

function itemsOf(
    blocks: unknown,
    depth: number,
    ownBlocks: readonly OwnBlockDefinition[],
): ItemNode[] {
    if (!Array.isArray(blocks)) {
        return [];
    }

    return (blocks as RawBlock[]).flatMap((raw) =>
        nodeOf(raw, depth, ownBlocks),
    );
}

function nodeOf(
    raw: RawBlock,
    depth: number,
    ownBlocks: readonly OwnBlockDefinition[],
): ItemNode[] {
    if (typeof raw.id !== 'string' || typeof raw.type !== 'string') {
        return [];
    }

    const props = isRecord(raw.props) ? raw.props : {};
    const detail = inlineText(raw.content).trim();
    const children = Array.isArray(raw.children) ? raw.children : [];

    // An empty line of text is only room to type, not an item.
    if (raw.type === 'paragraph' && detail === '' && children.length === 0) {
        return [];
    }

    if (raw.type === 'columnList') {
        const columns = children as RawBlock[];

        return [
            {
                ...describe(raw.type, props, ownBlocks),
                id: raw.id,
                label: ':count columns',
                labelParams: { count: columns.length },
                detail: '',
                depth,
                // The column level itself is skipped: its items show here.
                children: columns.flatMap((column) =>
                    itemsOf(column.children, depth + 1, ownBlocks),
                ),
            },
        ];
    }

    return [
        {
            ...describe(raw.type, props, ownBlocks),
            id: raw.id,
            detail:
                detail.length > MAX_DETAIL
                    ? `${detail.slice(0, MAX_DETAIL)}…`
                    : detail,
            depth,
            children: itemsOf(children, depth + 1, ownBlocks),
        },
    ];
}

function describe(
    type: string,
    props: Record<string, unknown>,
    ownBlocks: readonly OwnBlockDefinition[],
) {
    const { label, icon, isOwn } = describeBlock(type, props, ownBlocks);

    return { label, icon, isOwn: isOwn === true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
