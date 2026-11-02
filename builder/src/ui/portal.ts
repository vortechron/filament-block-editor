import { createContext, useContext } from 'react';

/**
 * Menus, tooltips and dialogs are drawn in a layer inside the builder's
 * root element, not at the end of <body>, so the builder's scoped styles
 * reach them and nothing is added to the host page.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null);

export function usePortalContainer(): HTMLElement | undefined {
    return useContext(PortalContainerContext) ?? undefined;
}
