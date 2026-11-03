import type { BlockNoteEditor } from '@blocknote/core';
import { render, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import RichEditor from '../src/editor/rich-editor';
import { pageSlashMenuItems } from '../src/editor/slash-menu';
import { I18nContext, type Locale, translate } from '../src/lib/i18n';
import { normalizeSectionData } from '../src/lib/page-value';

/** The section editor the builder makes, in a language. */
async function sectionEditor(locale: Locale): Promise<BlockNoteEditor<any, any, any>> {
    let editor: BlockNoteEditor<any, any, any> | null = null;

    render(
        <I18nContext value={{ locale, strings: {} }}>
            <RichEditor
                data={normalizeSectionData({})}
                accent="#2563eb"
                blocks={{ ownBlocks: new Map() }}
                uploadFile={async () => '/a.jpg'}
                onDocumentChange={() => {}}
                onEditorReady={(ready) => {
                    editor = ready as BlockNoteEditor<any, any, any>;
                }}
            />
        </I18nContext>,
    );

    await waitFor(() => expect(editor).not.toBeNull());

    return editor as unknown as BlockNoteEditor<any, any, any>;
}

describe('BlockNote’s own words', () => {
    it('are Malay in the ms builder: hints, the / menu, toolbars and the table, link and image menus', async () => {
        const editor = await sectionEditor('ms');
        const words = editor.dictionary as any;

        expect(words.placeholders.default).toBe("Taip teks atau '/' untuk arahan");
        expect(words.slash_menu.heading.title).toBe('Tajuk 1');
        expect(words.slash_menu.paragraph.group).toBe('Blok asas');
        expect(words.formatting_toolbar.bold.tooltip).toBe('Tebal');
        expect(words.table_handle.delete_row_menuitem).toBe('Padam baris');
        expect(words.link_toolbar.delete.tooltip).toBe('Buang pautan');
        expect(words.file_panel.upload.file_placeholder.image).toBe('Muat naik gambar');
        expect(words.multi_column.slash_menu.two_columns.title).toBe('Dua lajur');
        // English search words still work, and untranslated keys stay English.
        expect(words.slash_menu.heading.aliases).toEqual(expect.arrayContaining(['h1', 'tajuk']));
        expect(words.comments.edited).toBe('edited');
    });

    it('stay English in the en builder', async () => {
        const editor = await sectionEditor('en');

        expect((editor.dictionary as any).placeholders.default).toBe(
            "Enter text or type '/' for commands",
        );
    });

    it('put the kit’s spacer, card and columns in BlockNote’s Malay groups', async () => {
        const editor = await sectionEditor('ms');
        const t = (text: string) => translate(text, 'ms', {});
        const items = pageSlashMenuItems(editor, t, [], []);
        const titles = items.map((item) => [item.title, item.group]);

        expect(titles).toContainEqual(['Ruang', 'Blok asas']);
        expect(titles).toContainEqual(['Kad', 'Blok asas']);
        expect(titles).toContainEqual(['Dua lajur', 'Blok asas']);
        expect(items.some((item) => item.group === 'Basic blocks')).toBe(false);
    });
});
