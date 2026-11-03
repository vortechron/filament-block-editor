import { createContext, useContext } from 'react';
import type { PageState } from '@/editor/use-page-state';
import type { SectionTemplate } from '@/types';
import type { KitState } from './kit/use-kit-state';
import type { Device, SidebarPanel } from './types';
import type { Builder } from './use-builder';

/**
 * What every part of the page builder shares: the builder state, the
 * page value being edited, the templates, and the actions that open a
 * dialog in the builder itself.
 */
export type BuilderContextValue = {
    builder: Builder;
    form: PageState;
    templates: SectionTemplate[];
    device: Device;
    /** Changes the canvas device. On a phone the canvas stays a phone. */
    setDevice: (device: Device) => void;
    /** The design kit being edited. Its `kit` is null without a design panel. */
    kit: KitState;
    /** Wide enough for the sidebar beside the canvas. */
    isDesktop: boolean;
    /** Asks first, then deletes the section. */
    onDeleteSection: (sectionId: string) => void;
    /** Opens a panel from the canvas. On a phone it opens the sheet too. */
    revealPanel: (panel: SidebarPanel) => void;
    /** On a phone: the sheet covers the lower part of the canvas. */
    isSheetOpen: boolean;
};

export const BuilderContext = createContext<BuilderContextValue | null>(null);

export function useBuilderContext(): BuilderContextValue {
    const value = useContext(BuilderContext);

    if (value === null) {
        throw new Error('useBuilderContext needs a BuilderContext provider.');
    }

    return value;
}
