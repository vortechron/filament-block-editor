import { LoaderCircle, Store } from 'lucide-react';
import { OwnBlockForm } from '@/blocks/own-block-form';
import { parseValues } from '@/blocks/own-block-values';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { Button } from '@/ui/button';
import { useBuilderContext } from '../builder-context';

/**
 * The shop info, like the phone and the opening hours: one group per
 * settings group the host sent, made with the own block form. It is the
 * same on every page, so it saves on its own (the top bar Save saves it
 * too), and the canvas shows each change before it is saved.
 *
 * With `groups`, it shows only those groups: a row of an item or a part
 * (site-info-rows.tsx) opens the group its value comes from. Without, it
 * shows every group.
 */
export function SiteInfoForm({
    groups,
}: {
    /** The keys of the groups to show. Left out, every group shows. */
    groups?: readonly string[];
}) {
    const t = useT();
    const { siteInfo } = useHost();
    const { siteInfo: state } = useBuilderContext();

    if (siteInfo === null) {
        return null;
    }

    const shown =
        groups === undefined
            ? siteInfo.groups
            : siteInfo.groups.filter((group) => groups.includes(group.key));

    if (shown.length === 0) {
        return null;
    }

    return (
        <section aria-label={t('Shop info')} className="grid grid-cols-1 gap-5">
            <div className="grid gap-0.5">
                <div className="flex items-center gap-2">
                    <Store className="text-muted-foreground size-4 shrink-0" />
                    <h3 className="text-foreground text-sm font-semibold">{t('Shop info')}</h3>
                    <span className="rounded-md bg-[var(--builder-select)]/10 px-1.5 py-0.5 text-[11px] font-semibold text-[var(--builder-select)]">
                        {t('Shared')}
                    </span>
                </div>
                <p className="text-muted-foreground text-xs">
                    {t('The header and footer show these. So do the shop info chips in your words.')}
                </p>
            </div>

            {shown.map((group) => (
                <div key={group.key} className="bg-card grid gap-3 rounded-xl border p-3">
                    <p className="text-foreground text-sm font-medium">{group.label}</p>
                    <OwnBlockForm
                        definition={{ kind: group.key, label: group.label, fields: group.fields }}
                        values={JSON.stringify(state.values[group.key] ?? {})}
                        onChange={(json) => state.setGroup(group.key, parseValues(json))}
                    />
                </div>
            ))}

            <div className="grid gap-2">
                <p className="text-muted-foreground text-xs font-medium">
                    {t('Changes on every page')}
                </p>
                <Button
                    type="button"
                    disabled={!state.isDirty || state.processing}
                    onClick={() => void state.save()}
                    className="bg-[var(--builder-select)] text-white hover:bg-[var(--builder-select)]/90"
                >
                    {state.processing && <LoaderCircle className="animate-spin" />}
                    {!state.isDirty && state.recentlySuccessful
                        ? t('Saved')
                        : t('Save shop info')}
                </Button>
            </div>
        </section>
    );
}
