import { PanelBottom, PanelTop } from 'lucide-react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { partLabel } from '@/lib/site-parts';
import type { PartKey } from '@/types';
import { EditElsewhereLink } from '../edit-elsewhere-link';
import { SiteInfoGroupRows } from './site-info-rows';

/**
 * The header or footer, picked on the canvas. It is the same on every
 * page, so it is built on its own (its `editUrl`). The shop info it shows
 * is listed as short rows; a tap opens that group of the shop info form.
 */
export function PartPanel({ part }: { part: PartKey }) {
    const t = useT();
    const { parts } = useHost();
    const known = parts.find((entry) => entry.key === part);
    const Icon = part === 'header' ? PanelTop : PanelBottom;
    const name = partLabel(part, t);

    return (
        <div className="grid grid-cols-1 gap-4">
            <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--builder-select)] text-white shadow-sm">
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0">
                    <p className="text-foreground truncate text-sm font-semibold">
                        {known?.title || name}
                    </p>
                    <p className="text-muted-foreground text-xs">{name}</p>
                </div>
            </div>

            <p className="bg-muted/60 text-muted-foreground rounded-xl p-3 text-sm leading-relaxed">
                {t('This part is the same on every page.')}
            </p>

            {known?.editUrl && (
                <EditElsewhereLink
                    href={known.editUrl}
                    label={part === 'header' ? t('Edit header') : t('Edit footer')}
                />
            )}

            <SiteInfoGroupRows back={{ name: 'part', part }} />
        </div>
    );
}
