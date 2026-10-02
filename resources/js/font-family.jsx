import React from 'react';
import { createStyleSpec } from '@blocknote/core';
import { useBlockNoteEditor, useComponentsContext, useEditorState } from '@blocknote/react';

/**
 * The typeface picker in the formatting toolbar.
 *
 * The document stores the Vortechron\FilamentBlockEditor\Enums\BlockFont key ("georgia"), never a raw CSS
 * value, so BlockNoteRenderer can map it back through the enum and drop
 * anything it does not recognise. The font list is passed in from PHP (see the
 * `fonts` option in block-note-editor.blade.php), which keeps BlockFont the one
 * place a typeface is declared.
 */
export const FONT_FAMILY_STYLE = 'fontFamily';

/** The entry that clears the style and falls back to the page's own font. */
const INHERIT = 'default';

export function fontFamilyStyleSpec(fonts) {
    const stacks = new Map(fonts.map((font) => [font.value, font.stack]));

    return createStyleSpec(
        { type: FONT_FAMILY_STYLE, propSchema: 'string' },
        {
            render: (value) => {
                const dom = document.createElement('span');
                const stack = stacks.get(value);

                if (stack) {
                    dom.style.fontFamily = stack;
                }

                return { dom, contentDOM: dom };
            },
        },
    );
}

export function FontFamilySelect({ fonts }) {
    const editor = useBlockNoteEditor();
    const Components = useComponentsContext();

    // Same guard the stock colour button uses: hide the control unless the
    // selection holds at least one block that can carry inline text.
    const active = useEditorState({
        editor,
        selector: ({ editor }) => {
            const blocks = editor.getSelection()?.blocks || [editor.getTextCursorPosition().block];

            if (!editor.isEditable || !blocks.find((block) => block.content !== undefined)) {
                return undefined;
            }

            return editor.getActiveStyles()[FONT_FAMILY_STYLE] || INHERIT;
        },
    });

    if (active === undefined) {
        return null;
    }

    const apply = (value) => {
        if (value === INHERIT) {
            editor.removeStyles({ [FONT_FAMILY_STYLE]: active });
        } else {
            editor.addStyles({ [FONT_FAMILY_STYLE]: value });
        }

        // The dropdown steals focus, so hand it back after the click settles or
        // the caret is lost and the next keystroke goes nowhere.
        setTimeout(() => editor.focus());
    };

    // `text` must stay a plain string: the Mantine dropdown uses it as the
    // React key for each row, so an element there would collapse them all.
    const items = [{ value: INHERIT, label: 'Default font', stack: null }, ...fonts].map((font) => ({
        text: font.label,
        icon: <span className="fbe-font-swatch" style={font.stack ? { fontFamily: font.stack } : undefined}>Aa</span>,
        isSelected: font.value === active,
        onClick: () => apply(font.value),
    }));

    return <Components.FormattingToolbar.Select className="bn-select" items={items} />;
}
