import { RefreshCw, type LucideIcon } from 'lucide-react';
import { useHost } from '@/lib/host';
import { type Translate, useT } from '@/lib/i18n';
import { findSynced } from '@/lib/synced-sections';
import type {
    OwnBlockDefinition,
    RichSection,
    Section,
    SyncedSectionOption,
} from '@/types';
import { blockTitle } from '../editor/block-meta';
import { useBuilderContext } from './builder-context';
import { describeBlock } from './item-catalog';
import { LAYOUT_ICONS, LAYOUT_LABELS } from './section-thumbs';

/**
 * How a section shows in the builder's lists and labels. A synced (ref)
 * section has no words or layout of its own here, so it shows as
 * "Synced" with its title, when the host sent it, or its ref.
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

/** What a title needs besides the section: the synced sections and own blocks. */
export type SectionNames = {
    synced: readonly SyncedSectionOption[];
    ownBlocks: readonly OwnBlockDefinition[];
};

/**
 * Its first heading or line; else the name of its first block that has
 * no words, like an own block or a form; else what it is.
 */
export function sectionTitle(
    section: Section,
    t: Translate,
    names: SectionNames = { synced: [], ownBlocks: [] },
): string {
    if (section.type === 'ref') {
        const synced = findSynced(names.synced, section.ref);

        return synced
            ? t('Synced: :title', { title: synced.title })
            : t('Synced');
    }

    return (
        blockTitle(section) ||
        firstBlockName(section, t, names.ownBlocks) ||
        t('Empty section')
    );
}

/** sectionTitle() with what the builder knows. */
export function useSectionTitle(): (section: Section) => string {
    const t = useT();
    const { ownBlocks } = useHost();
    const { library } = useBuilderContext();

    return (section) =>
        sectionTitle(section, t, { synced: library.synced, ownBlocks });
}

function firstBlockName(
    section: RichSection,
    t: Translate,
    ownBlocks: readonly OwnBlockDefinition[],
): string {
    const block = section.data.document.find(
        (entry) => entry.type === 'ownBlock' || entry.type === 'form',
    );

    if (!block) {
        return '';
    }

    const props = (typeof block.props === 'object' && block.props !== null
        ? block.props
        : {}) as Record<string, unknown>;
    const described = describeBlock(String(block.type), props, ownBlocks);

    return described.isOwn ? described.label : t(described.label);
}
