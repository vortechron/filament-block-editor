import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { siteInfoGroupsFor } from '@/lib/site-info-groups';
import { SiteInfoForm } from './site-info-form';

/**
 * The shop info an item or a section shows, right in its panel: only the
 * groups it uses (lib/site-info-groups.ts). Nothing when it uses none, or
 * when the host has no shop info form.
 */
export function SiteInfoCard({
    source,
}: {
    source: Parameters<typeof siteInfoGroupsFor>[0];
}) {
    const t = useT();
    const { siteInfo, ownBlocks, dynamicValues } = useHost();

    if (siteInfo === null) {
        return null;
    }

    const groups = siteInfoGroupsFor(source, ownBlocks, dynamicValues);

    return groups.length === 0 ? null : (
        <SiteInfoForm
            groups={groups}
            description={t('What this shows comes from your shop info.')}
        />
    );
}
