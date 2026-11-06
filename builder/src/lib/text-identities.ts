import type { OwnBlockField } from '@/types';
import { newBlockId } from './block-ids';

/** Row ids belong to values, so moving a row never moves another row's words. */
export function rowIdentities(
    values: Record<string, unknown>,
    fields: OwnBlockField[],
): Record<string, unknown> {
    const result = { ...values };
    for (const field of fields) {
        const rows = result[field.name];
        if (field.type !== 'list' || !Array.isArray(rows)) continue;
        const seen = new Set<string>();
        result[field.name] = rows.map((row: unknown) => {
            if (!row || typeof row !== 'object' || Array.isArray(row))
                return row;
            const item = row as Record<string, unknown>;
            const id =
                typeof item._id === 'string' && !seen.has(item._id)
                    ? item._id
                    : newBlockId();
            seen.add(id);
            return { ...rowIdentities(item, field.fields ?? []), _id: id };
        });
    }
    return result;
}
