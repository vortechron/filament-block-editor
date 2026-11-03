import { type BlockNoteEditor, combineByGroup } from '@blocknote/core';
import { getDefaultReactSlashMenuItems } from '@blocknote/react';
import {
    cardSlashMenuItem,
    columnSlashMenuItems,
    spacerSlashMenuItem,
} from '@vortechron/blocknote-kit';
import type { Translate } from './helpers';
import type { PageDictionary } from './blocknote-dictionary';

type AnyEditor = BlockNoteEditor<any, any, any>;

type SlashItem = {
    title: string;
    subtext?: string;
    aliases?: string[];
    group?: string;
    [key: string]: unknown;
};

/** The kit's own "/" entries are in English; the builder translates them. */
export const KIT_SLASH_TEXTS = [
    'Spacer',
    'Adjustable empty vertical space',
    'Card',
    'A banner that opens to show more',
] as const;

const COLUMN_ENTRIES = ['two_columns', 'three_columns'] as const;

/**
 * Every "/" menu entry, like blocknote-kit's kitSlashMenuItems: the
 * builder's top entries, then BlockNote's own, the columns, the spacer,
 * the card and the builder's other entries. The kit's entries get the
 * editor's words (its dictionary) and the builder's (`t`), so in Malay
 * they sit in the same groups as BlockNote's own.
 */
export function pageSlashMenuItems(
    editor: AnyEditor,
    t: Translate,
    extraItems: SlashItem[],
    topItems: SlashItem[],
): SlashItem[] {
    const dictionary = editor.dictionary as PageDictionary;
    const basicGroup = dictionary.slash_menu.paragraph.group;
    const columns = (columnSlashMenuItems(editor) as SlashItem[]).map((item, index) => ({
        ...item,
        ...dictionary.multi_column.slash_menu[COLUMN_ENTRIES[index]],
    }));
    const kitBlocks = ([spacerSlashMenuItem(editor), cardSlashMenuItem(editor)] as SlashItem[]).map(
        (item) => ({
            ...item,
            title: t(item.title),
            subtext: item.subtext ? t(item.subtext) : item.subtext,
            group: basicGroup,
        }),
    );

    return [
        ...topItems,
        ...combineByGroup(
            getDefaultReactSlashMenuItems(editor) as SlashItem[],
            columns,
            kitBlocks,
            extraItems,
        ),
    ] as SlashItem[];
}
