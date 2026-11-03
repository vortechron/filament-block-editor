import { LoaderCircle } from 'lucide-react';
import { OwnBlockForm } from '@/blocks/own-block-form';
import { parseValues } from '@/blocks/own-block-values';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { Button } from '@/ui/button';
import { useBuilderContext } from '../builder-context';

/**
 * The shop info shown with the header and footer, like the phone and the
 * opening hours: one group per settings group the host sent, made with the
 * own block form. It is the same on every page, so it saves on its own.
 */
export function SiteInfoForm() {
    const t = useT();
    const { siteInfo } = useHost();
    const { siteInfo: state } = useBuilderContext();

    if (siteInfo === null) {
        return null;
    }

    return (
        <section aria-label={t('Shop info')} className="grid grid-cols-1 gap-5">
            <div className="grid gap-0.5">
                <h3 className="text-foreground text-sm font-semibold">{t('Shop info')}</h3>
                <p className="text-muted-foreground text-xs">
                    {t('The header and footer show these. So do the shop info chips in your words.')}
                </p>
            </div>

            {siteInfo.groups.map((group) => (
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
