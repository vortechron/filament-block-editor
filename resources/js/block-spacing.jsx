import React from 'react';
import { SideMenuExtension } from '@blocknote/core';
import {
    BlockColorsItem,
    DragHandleMenu,
    RemoveBlockItem,
    TableColumnHeaderItem,
    TableRowHeaderItem,
    useBlockNoteEditor,
    useComponentsContext,
    useDictionary,
    useExtensionState,
} from '@blocknote/react';

/**
 * Per-item vertical space, above and below the item. These are the same preset
 * names and sizes the whole block already uses for its own padding and
 * margins, so a block and the items inside it speak one language.
 *
 * Keep in sync with Vortechron\FilamentBlockEditor\Enums\BlockSpacing::css() in PHP, which the public
 * public page and the PDF render from.
 */
export const ITEM_SPACING = {
    none: '0',
    sm: '1rem',
    md: '2rem',
    lg: '3.5rem',
    xl: '6rem',
};

const SIZES = Object.keys(ITEM_SPACING);

/** Keep in sync with Vortechron\FilamentBlockEditor\Enums\BlockSpacing::getLabel(). */
const LABELS = {
    none: 'None',
    sm: 'Small',
    md: 'Medium',
    lg: 'Large',
    xl: 'Extra large',
};

/**
 * The props added to every item that can carry its own spacing.
 *
 * The default is `none`, so BlockNote writes no attribute for an item nobody
 * has touched and documents saved before this existed render exactly as
 * before.
 */
export const SPACING_PROP_SCHEMA = {
    spaceTop: { default: 'none', values: SIZES },
    spaceBottom: { default: 'none', values: SIZES },
};

/**
 * One "Space above" / "Space below" entry in the drag handle menu, opening a
 * submenu of the preset sizes.
 *
 * The block it acts on is the one the side menu is currently pointing at. That
 * is held in the side menu extension's own state, which is also where
 * BlockNote's built-in Colors and Delete entries read it from.
 */
function BlockSpacingItem({ prop, label }) {
    const Components = useComponentsContext();
    const editor = useBlockNoteEditor();
    const block = useExtensionState(SideMenuExtension, { selector: (state) => state?.block });

    // Lists and spacers have no spacing props, so the entry hides itself
    // instead of writing a prop the schema does not know about.
    if (! Components || block === undefined || ! (prop in (block.props ?? {}))) {
        return null;
    }

    const current = block.props[prop] ?? 'none';

    return (
        <Components.Generic.Menu.Root position="right" sub={true}>
            <Components.Generic.Menu.Trigger sub={true}>
                <Components.Generic.Menu.Item className="bn-menu-item" subTrigger={true}>
                    {label}
                </Components.Generic.Menu.Item>
            </Components.Generic.Menu.Trigger>
            <Components.Generic.Menu.Dropdown sub={true} className="bn-menu-dropdown">
                {SIZES.map((size) => (
                    <Components.Generic.Menu.Item
                        key={size}
                        checked={current === size}
                        onClick={() => {
                            try {
                                editor.updateBlock(block, { props: { [prop]: size } });
                            } catch (error) {
                                // The block went away between opening the menu
                                // and the click (an undo, a Livewire
                                // re-render). Say so rather than throw.
                                console.error('Could not change item spacing:', error);
                            }
                        }}
                    >
                        {LABELS[size]}
                    </Components.Generic.Menu.Item>
                ))}
            </Components.Generic.Menu.Dropdown>
        </Components.Generic.Menu.Root>
    );
}

/**
 * BlockNote's own drag handle menu with the two spacing entries added under
 * Colors.
 *
 * Passing children replaces the whole menu, so the four built-in entries have
 * to be listed again here. Their labels come from the dictionary so they keep
 * matching the rest of the editor.
 */
export function SpacingDragHandleMenu() {
    const dictionary = useDictionary();

    return (
        <DragHandleMenu>
            <RemoveBlockItem>{dictionary.drag_handle.delete_menuitem}</RemoveBlockItem>
            <BlockColorsItem>{dictionary.drag_handle.colors_menuitem}</BlockColorsItem>
            <TableRowHeaderItem>{dictionary.drag_handle.header_row_menuitem}</TableRowHeaderItem>
            <TableColumnHeaderItem>{dictionary.drag_handle.header_column_menuitem}</TableColumnHeaderItem>
            <BlockSpacingItem prop="spaceTop" label="Space above" />
            <BlockSpacingItem prop="spaceBottom" label="Space below" />
        </DragHandleMenu>
    );
}
