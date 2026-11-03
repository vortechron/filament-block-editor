import { ChevronRight, Store } from 'lucide-react';
import { findDynamicValue } from '@/lib/dynamic-values';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { siteInfoUsesFor } from '@/lib/site-info-groups';
import type { OwnBlockField, SiteInfo } from '@/types';
import { useBuilderContext } from '../builder-context';
import type { SiteInfoReturn } from '../types';

/** One row: what it is, what it is now (null: not filled yet), and its group. */
type Row = { id: string; label: string; value: string | null; group: string };

type Groups = SiteInfo['groups'];

/**
 * The shop info a picked item shows, as short rows that only read: each
 * value's label and what it is now. A tap opens that value's group of the
 * shop info form in the sidebar, and Back comes back here. Nothing when the
 * item shows none, or when the host has no shop info form.
 */
export function SiteInfoRows({
    source,
    back,
}: {
    source: Parameters<typeof siteInfoUsesFor>[0];
    /** Where the shop info panel's Back button returns. */
    back: SiteInfoReturn;
}) {
    const { siteInfo, ownBlocks, dynamicValues } = useHost();
    const { siteInfo: state } = useBuilderContext();

    if (siteInfo === null) {
        return null;
    }

    const groups = siteInfo.groups;
    const rows = siteInfoUsesFor(source, ownBlocks, dynamicValues).flatMap((use): Row[] => {
        if ('group' in use) {
            return groupRows(groups, [use.group], state.values);
        }

        const definition = findDynamicValue(dynamicValues, use.key);
        const group = definition?.settings;

        if (definition === undefined || !groups.some((entry) => entry.key === group)) {
            return [];
        }

        const preview = definition.preview?.trim() ?? '';

        return [
            {
                id: `key:${use.key}`,
                label: definition.label,
                value: preview === '' ? null : preview,
                group: group as string,
            },
        ];
    });

    return <RowList rows={rows} back={back} />;
}

/**
 * Every group of the shop info, as one row each with a short summary: for
 * the header and footer, which are drawn elsewhere, so the builder can not
 * tell which values they show.
 */
export function SiteInfoGroupRows({ back }: { back: SiteInfoReturn }) {
    const { siteInfo } = useHost();
    const { siteInfo: state } = useBuilderContext();

    if (siteInfo === null) {
        return null;
    }

    return (
        <RowList
            rows={groupRows(siteInfo.groups, siteInfo.groups.map((group) => group.key), state.values)}
            back={back}
        />
    );
}

function RowList({ rows, back }: { rows: Row[]; back: SiteInfoReturn }) {
    const t = useT();
    const { builder } = useBuilderContext();

    if (rows.length === 0) {
        return null;
    }

    return (
        <section aria-label={t('From shop info')} className="grid gap-2">
            <div className="grid gap-0.5">
                <div className="flex items-center gap-2">
                    <Store className="text-muted-foreground size-4 shrink-0" />
                    <h3 className="text-foreground text-sm font-semibold">{t('From shop info')}</h3>
                </div>
                <p className="text-muted-foreground text-xs">{t('Tap to change. Changes on every page.')}</p>
            </div>
            <ul className="bg-card divide-y overflow-hidden rounded-xl border">
                {rows.map((row) => (
                    <li key={row.id}>
                        <button
                            type="button"
                            onClick={() => builder.openPanel({ name: 'siteInfo', groups: [row.group], back })}
                            className="hover:bg-muted/60 flex min-h-11 w-full items-center gap-3 px-3 py-2 text-left"
                        >
                            <span data-row-label="" className="text-muted-foreground shrink-0 text-xs font-medium">
                                {row.label}
                            </span>
                            <span className="min-w-0 flex-1 text-right">
                                {row.value === null ? (
                                    <span data-row-value="" className="text-sm text-amber-600 italic">
                                        {t('not filled yet')}
                                    </span>
                                ) : (
                                    <span data-row-value="" className="text-foreground block truncate text-sm">
                                        {row.value}
                                    </span>
                                )}
                            </span>
                            <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                        </button>
                    </li>
                ))}
            </ul>
        </section>
    );
}

/** Rows for whole groups, by key, with what their fields hold now. */
function groupRows(
    groups: Groups,
    keys: readonly string[],
    values: Record<string, Record<string, unknown>>,
): Row[] {
    return keys.flatMap((key) => {
        const group = groups.find((entry) => entry.key === key);

        if (group === undefined) {
            return [];
        }

        return [{ id: `group:${key}`, label: group.label, value: summaryOf(group.fields, values[key] ?? {}), group: key }];
    });
}

/**
 * The words a group's fields hold, joined with " · ", or null when they hold
 * none. A list gives one word per row (its first word, like a phone number or
 * a social platform), joined with " / ".
 */
function summaryOf(fields: readonly OwnBlockField[], values: Record<string, unknown>): string | null {
    const words = fields.map((field) => {
        const value = values[field.name];

        if (field.type !== 'list') {
            return wordOf(field, value);
        }

        const rows = Array.isArray(value) ? value : [];

        return rows
            .map((row) => {
                const cells = typeof row === 'object' && row !== null ? (row as Record<string, unknown>) : {};

                return (field.fields ?? []).map((cell) => wordOf(cell, cells[cell.name])).find((word) => word !== '') ?? '';
            })
            .filter((word) => word !== '')
            .join(' / ');
    });
    const summary = words.filter((word) => word !== '').join(' · ');

    return summary === '' ? null : summary;
}

/** What one field shows in a summary: its words, or a select's option label; '' for anything else. */
function wordOf(field: OwnBlockField, value: unknown): string {
    const word =
        field.type === 'select'
            ? (field.options?.find((option) => option.value === value)?.label ?? '')
            : (field.type === 'text' || field.type === 'textarea' || field.type === 'number') &&
                (typeof value === 'string' || typeof value === 'number')
              ? String(value)
              : '';

    return word.replace(/\s+/g, ' ').trim();
}
