import { RefreshCw, type LucideIcon } from 'lucide-react';
import type { Translate } from '@/lib/i18n';
import type { Section } from '@/types';
import { blockTitle } from '../editor/block-meta';
import { LAYOUT_ICONS, LAYOUT_LABELS } from './section-thumbs';

/**
 * How a section shows in the builder's lists and labels. A synced (ref)
 * section has no words or layout of its own here, so it shows as
 * "Synced" with its ref.
 */
export function sectionIcon(section: Section): LucideIcon {
    return section.type === 'ref'
        ? RefreshCw
        : LAYOUT_ICONS[section.data.layout];
}

/** Its layout, like "Hero", or "Synced". Already translated. */
export function sectionKind(section: Section, t: Translate): string {
    return section.type === 'ref'
        ? t('Synced')
        : t(LAYOUT_LABELS[section.data.layout]);
}

/** Its first heading or line, or what it is when it has none. */
export function sectionTitle(section: Section, t: Translate): string {
    return section.type === 'ref'
        ? t('Synced')
        : blockTitle(section) || t('Empty section');
}
