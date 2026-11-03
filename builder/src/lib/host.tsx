import { createContext, useContext } from 'react';
import type {
    DynamicValueDefinition,
    FontChoice,
    Kit,
    OwnBlockDefinition,
    PageBuilderAdapter,
    SyncedSectionOption,
    UploadKind,
} from '@/types';

/**
 * What the host app gave the builder: how to save, preview and upload,
 * its own blocks and the page's accent colour. Every part of the builder
 * reads it from here instead of from props.
 */
export type Host = {
    adapter: PageBuilderAdapter;
    ownBlocks: OwnBlockDefinition[];
    accent: string;
    /** Uploads through the adapter and resolves to the file's URL. */
    upload: (file: File, kind?: UploadKind) => Promise<string>;
    title: string;
    backUrl: string | null;
    viewUrl: string | null;
    /** Sees locks, custom CSS and developer-only fields. */
    developer: boolean;
    /** The host's fonts, besides the theme's own. */
    fonts: FontChoice[];
    /**
     * The design kit the page starts with. Null when the host sent none or
     * cannot save one: then there is no design panel.
     */
    kit: Kit | null;
    /** The values the site fills in: shop info in text, links and pictures. */
    dynamicValues: DynamicValueDefinition[];
    /** The synced sections this page may use, with the section each holds. */
    syncedSections: SyncedSectionOption[];
};

export const HostContext = createContext<Host | null>(null);

export function useHost(): Host {
    const host = useContext(HostContext);

    if (host === null) {
        throw new Error('useHost needs a HostContext provider.');
    }

    return host;
}
