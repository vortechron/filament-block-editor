import { createContext } from 'react';
import type { DynamicValueDefinition, OwnBlockDefinition } from '@/types';

/**
 * What the page's own blocks inside a section's editor need from the
 * builder (page-blocks.tsx, form-block.tsx).
 */
export type PageBlocksInfo = {
    /** The host's own block definitions, by kind. */
    ownBlocks: ReadonlyMap<string, OwnBlockDefinition>;
    /** Opens a block's settings in the sidebar, when the builder can. */
    openItem?: (blockId: string) => void;
    /** The values the site fills in, for their chips and the "/" menu. */
    dynamicValues?: readonly DynamicValueDefinition[];
};

export const PageBlocksContext = createContext<PageBlocksInfo>({
    ownBlocks: new Map(),
});
