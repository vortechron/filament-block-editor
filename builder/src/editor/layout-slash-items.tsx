import {
    type BlockNoteEditor,
    insertOrUpdateBlockForSlashMenu,
} from '@blocknote/core';
import {
    CircleQuestionMark,
    Columns2,
    Hash,
    LayoutDashboard,
    LayoutGrid,
    ListChecks,
    ListOrdered,
    type LucideIcon,
    MessageSquareQuote,
    MoveHorizontal,
} from 'lucide-react';
import type { ReactNode } from 'react';
import type { SectionLayout } from '@/types';
import type { Translate } from './helpers';

/** These entries add BlockNote's own blocks, so its default schema is enough. */
type SlashMenuEditor = BlockNoteEditor;

type ListType = 'bulletListItem' | 'numberedListItem' | 'checkListItem';

type SlashMenuItem = {
    title: string;
    subtext: string;
    aliases: string[];
    group: string;
    icon: ReactNode;
    onItemClick: () => void;
};

const LIST_TYPES: readonly string[] = [
    'bulletListItem',
    'numberedListItem',
    'checkListItem',
] satisfies ListType[];

/**
 * The marks a tile may start with. Keep in step with TICK_MARKS and
 * CROSS_MARKS in Rendering\SectionLayoutRenderer.
 */
const MARKS = [
    '✅',
    '✔️',
    '✔',
    '☑️',
    '☑',
    '✓',
    '❌',
    '✖️',
    '✖',
    '✗',
    '✘',
    '⛔',
    '🚫',
    '❎',
];

/**
 * The layouts where a small heading (Heading 3) starts each item, like
 * cards. Matches Rendering\SectionLayoutRenderer.
 */
const HEADING_ITEMS: Record<
    'bento' | 'steps' | 'stats' | 'compare',
    { icon: LucideIcon; title: string; subtext: string; aliases: string[] }
> = {
    bento: {
        icon: LayoutDashboard,
        title: 'New tile',
        subtext: 'One more tile in this grid',
        aliases: ['tile', 'bento', 'card', 'kad', 'petak'],
    },
    steps: {
        icon: ListOrdered,
        title: 'New step',
        subtext: 'The next numbered step',
        aliases: ['step', 'langkah', 'number'],
    },
    stats: {
        icon: Hash,
        title: 'New number',
        subtext: 'A big number with a label under it',
        aliases: ['number', 'stat', 'nombor', 'angka'],
    },
    compare: {
        icon: Columns2,
        title: 'New column',
        subtext: 'A column with its own title and points',
        aliases: ['column', 'compare', 'lajur', 'banding'],
    },
};

/**
 * The "/" menu entry that adds one more item to a grid section: a card, a
 * point, a review or a question. The editor shows it first, above
 * BlockNote's own entries. It adds the blocks the public page turns into
 * that item (see Rendering\SectionLayoutRenderer), with the cursor
 * ready inside. The other layouts have no items, so they get no entry.
 */
export function layoutSlashMenuItems(
    editor: SlashMenuEditor,
    layout: SectionLayout,
    t: Translate,
): SlashMenuItem[] {
    // The same icons as the Layout picker (rich-look-fields.tsx).
    const item = (
        Icon: LucideIcon,
        title: string,
        subtext: string,
        aliases: string[],
        add: () => void,
    ): SlashMenuItem => ({
        title,
        subtext,
        aliases,
        group: t('This section'),
        icon: <Icon size={18} />,
        onItemClick: add,
    });

    switch (layout) {
        case 'cards':
            return [
                item(
                    LayoutGrid,
                    t('New card'),
                    t('A numbered card, like the others here'),
                    ['card', 'kad'],
                    () =>
                        insertOrUpdateBlockForSlashMenu(editor, {
                            type: 'heading',
                            props: { level: 3 },
                        }),
                ),
            ];
        case 'bento':
        case 'steps':
        case 'stats':
        case 'compare':
            return [
                item(
                    HEADING_ITEMS[layout].icon,
                    t(HEADING_ITEMS[layout].title),
                    t(HEADING_ITEMS[layout].subtext),
                    HEADING_ITEMS[layout].aliases,
                    () =>
                        insertOrUpdateBlockForSlashMenu(editor, {
                            type: 'heading',
                            props: { level: 3 },
                        }),
                ),
            ];
        case 'marquee':
            return [
                item(
                    MoveHorizontal,
                    t('New point'),
                    t('One more line in the ticker'),
                    ['point', 'ticker', 'item', 'poin', 'senarai'],
                    () => addPoint(editor),
                ),
            ];
        case 'ticks':
            return [
                item(
                    ListChecks,
                    t('New point'),
                    t('One more tile in this list'),
                    ['point', 'tick', 'tile', 'item', 'poin', 'senarai'],
                    () => addPoint(editor),
                ),
            ];
        case 'reviews':
            return [
                item(
                    MessageSquareQuote,
                    t('New review'),
                    t('A quote, with the stars and name under it'),
                    ['review', 'testimonial', 'quote', 'ulasan', 'testimoni'],
                    () => addReview(editor),
                ),
            ];
        case 'faq':
            return [
                item(
                    CircleQuestionMark,
                    t('New question'),
                    t('A question that opens to show its answer'),
                    ['question', 'faq', 'soalan'],
                    () =>
                        insertOrUpdateBlockForSlashMenu(editor, {
                            type: 'toggleListItem',
                        }),
                ),
            ];
        default:
            return [];
    }
}

/**
 * A list item like the section's last one: the same kind of list, and the
 * same ✅ or ❌ at the start, so a cross list stays a cross list.
 */
function addPoint(editor: SlashMenuEditor): void {
    // Not the line holding the "/": a new list line is a list item too.
    const typingIn = editor.getTextCursorPosition().block.id;
    const last = [...editor.document]
        .reverse()
        .find((block) => block.id !== typingIn && isListType(block.type));
    const type = last && isListType(last.type) ? last.type : 'bulletListItem';
    const mark = last ? leadingMark(last.content) : null;
    const point = insertOrUpdateBlockForSlashMenu(editor, {
        type,
        content: mark ? `${mark} ` : '',
    });

    editor.setTextCursorPosition(point, 'end');
}

/**
 * A quote, and the line under it the page reads as the stars and the name.
 */
function addReview(editor: SlashMenuEditor): void {
    const quote = insertOrUpdateBlockForSlashMenu(editor, { type: 'quote' });

    editor.insertBlocks(
        [{ type: 'paragraph', content: '★★★★★ — ' }],
        quote,
        'after',
    );
    editor.setTextCursorPosition(quote, 'end');
}

function isListType(type: string): type is ListType {
    return LIST_TYPES.includes(type);
}

function leadingMark(content: unknown): string | null {
    const first: unknown = Array.isArray(content) ? content[0] : null;
    const text =
        first !== null &&
        typeof first === 'object' &&
        'text' in first &&
        typeof first.text === 'string'
            ? first.text.trimStart()
            : '';

    return MARKS.find((mark) => text.startsWith(mark)) ?? null;
}
