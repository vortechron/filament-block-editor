import type { BlockNoteEditor } from '@blocknote/core';
import { createReactInlineContentSpec } from '@blocknote/react';
import { Store } from 'lucide-react';
import { createElement, useContext } from 'react';
import { dynamicValuesOfType, findDynamicValue } from '@/lib/dynamic-values';
import type { DynamicValueDefinition } from '@/types';
import { CHIP_CLASS, CHIP_PREVIEW_CLASS } from './chip-style';
import type { Translate } from './helpers';
import { PageBlocksContext } from './page-blocks-context';

/**
 * A value the site fills in, inside the words: `{ type: 'dynamic', props:
 * { key: 'site.phone' } }` (docs/v2-plan.md, section 6). The section's
 * editor draws it as a chip with the value's label and, when the host
 * sent one, what it is now. The page shows the real value.
 */
export const dynamicInline = createReactInlineContentSpec(
    {
        type: 'dynamic',
        propSchema: { key: { default: '' } },
        content: 'none',
    },
    {
        render: ({ inlineContent }) => <DynamicChip valueKey={inlineContent.props.key} />,
    },
);

function DynamicChip({ valueKey }: { valueKey: string }) {
    const { dynamicValues = [] } = useContext(PageBlocksContext);
    const definition = findDynamicValue(dynamicValues, valueKey);

    return (
        <span
            data-dynamic={valueKey}
            title={valueKey}
            className={CHIP_CLASS}
        >
            <span>{definition?.label ?? valueKey}</span>
            {definition?.preview && (
                <span className={CHIP_PREVIEW_CLASS}>· {definition.preview}</span>
            )}
        </span>
    );
}

type SlashEditor = BlockNoteEditor<any, any, any>;

/**
 * The "Shop info" group of the "/" menu: one entry per text value, which
 * puts its chip where the cursor is.
 */
export function shopInfoSlashItems(
    editor: SlashEditor,
    t: Translate,
    values: readonly DynamicValueDefinition[],
) {
    const group = t('Shop info');

    return dynamicValuesOfType(values, 'text').map((value) => ({
        title: value.label,
        subtext: value.preview ?? value.group ?? '',
        aliases: [value.key, ...value.label.toLowerCase().split(/\s+/)],
        group,
        icon: createElement(Store, { size: 18 }),
        onItemClick: () =>
            editor.insertInlineContent([
                { type: 'dynamic', props: { key: value.key } },
                ' ',
            ] as never),
    }));
}
