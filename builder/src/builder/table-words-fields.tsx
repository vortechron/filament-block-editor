import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { richContent, richValue } from '@/lib/rich-text';
import { identifiedTableCells } from '@/lib/table-identities';
import { useBuilderContext } from './builder-context';
import { LocalizedText } from './field-language';
import { RichWordsField } from './rich-words-field';
import type { ItemSnapshot, SectionEditorHandle } from './types';

/** Each identified cell is a whole inline field; the table layout stays shared. */
export function TableWordsFields({
    item,
    handle,
}: {
    item: ItemSnapshot;
    handle: SectionEditorHandle;
}) {
    const { fieldLanguages } = useHost();
    const { form } = useBuilderContext();
    const t = useT();
    if (!fieldLanguages) return null;
    let cells;
    try {
        cells = identifiedTableCells(item.content);
    } catch (error) {
        return (
            <p role="alert" className="text-destructive text-sm">
                {t(
                    error instanceof Error
                        ? error.message
                        : 'Table cells changed without stable identities. Restore the table and edit its identified fields, or rebuild its translations.',
                )}
            </p>
        );
    }
    return (
        <div className="grid gap-5">
            {cells.map((cell) => {
                const label = t('Row :row, column :column words', {
                    row: cell.row,
                    column: cell.column,
                });
                return (
                    <LocalizedText
                        key={cell.id}
                        path={`/rich-cell:${cell.id}`}
                        label={label}
                        value={richValue(cell.content)}
                        onChange={(value) =>
                            form.inGroup(`cell:${item.id}:${cell.id}`, () =>
                                handle.setTableCellContent?.({
                                    tableId: item.id,
                                    cellId: cell.id,
                                    content: richContent(value),
                                }),
                            )
                        }
                    >
                        {(value, onChange) => (
                            <RichWordsField
                                label={label}
                                value={value}
                                multiline
                                onChange={onChange}
                            />
                        )}
                    </LocalizedText>
                );
            })}
        </div>
    );
}
