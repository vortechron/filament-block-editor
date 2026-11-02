import {
    type CSSProperties,
    useEffect,
    useEffectEvent,
    useMemo,
    useState,
} from 'react';
import { BuilderContext } from './builder/builder-context';
import { BuilderTopBar } from './builder/builder-top-bar';
import { Canvas } from './builder/canvas';
import { BuilderDragAndDrop } from './builder/drag-and-drop';
import { MobileDock } from './builder/mobile-dock';
import { PreviewDialog } from './builder/preview-dialog';
import { SaveErrors, sectionIndexOfError } from './builder/save-errors';
import { Sidebar } from './builder/sidebar';
import type { Device } from './builder/types';
import { useBuilder } from './builder/use-builder';
import { useBuilderShortcuts } from './builder/use-builder-shortcuts';
import { ConfirmDialog } from './editor/confirm-dialog';
import { useMediaQuery } from './editor/use-media-query';
import { usePageState } from './editor/use-page-state';
import { type Host, HostContext } from './lib/host';
import { I18nContext, type Locale, useT } from './lib/i18n';
import type { PageValue, SectionTemplate } from './types';
import { PortalContainerContext } from './ui/portal';
import { TooltipProvider } from './ui/tooltip';

export type PageBuilderAppProps = {
    host: Host;
    locale: Locale;
    strings: Record<string, string>;
    initialValue: PageValue;
    templates: SectionTemplate[];
    /** Called with every change, and once with the first value. */
    onValue: (value: PageValue) => void;
    onChange?: (value: PageValue) => void;
    /** Fill the screen, for a mount element without its own height. */
    fillScreen: boolean;
};

/**
 * The page builder: a full screen editor with the real page on the
 * right, drawn by the host as visitors will see it, and a sidebar on the
 * left with what to add, the list of sections, and the words and
 * settings of whatever is picked on the page. On a phone the sidebar
 * opens from a bar at the bottom instead.
 *
 * Everything sits in one `.fbe-builder` element: the builder's styles
 * are scoped to it, and its menus and dialogs are drawn inside it too.
 */
export function PageBuilderApp({
    host,
    locale,
    strings,
    initialValue,
    templates,
    onValue,
    onChange,
    fillScreen,
}: PageBuilderAppProps) {
    const [portal, setPortal] = useState<HTMLElement | null>(null);
    const i18n = useMemo(() => ({ locale, strings }), [locale, strings]);

    return (
        <div
            className="fbe-builder"
            lang={locale}
            style={
                {
                    '--builder-accent': host.accent,
                    height: fillScreen ? '100dvh' : '100%',
                } as CSSProperties
            }
        >
            <I18nContext value={i18n}>
                <HostContext value={host}>
                    <PortalContainerContext value={portal}>
                        <TooltipProvider delayDuration={300}>
                            <Builder
                                initialValue={initialValue}
                                templates={templates}
                                onValue={onValue}
                                onChange={onChange}
                            />
                        </TooltipProvider>
                    </PortalContainerContext>
                </HostContext>
            </I18nContext>
            <div data-fbe-portal="" ref={setPortal} />
        </div>
    );
}

function Builder({
    initialValue,
    templates,
    onValue,
    onChange,
}: {
    initialValue: PageValue;
    templates: SectionTemplate[];
    onValue: (value: PageValue) => void;
    onChange?: (value: PageValue) => void;
}) {
    const t = useT();
    const form = usePageState(initialValue, (value) => {
        onValue(value);
        onChange?.(value);
    });
    const builder = useBuilder({ form, templates });
    const [device, setDevice] = useState<Device>('desktop');
    const [isDockOpen, setIsDockOpen] = useState(false);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    // Tablets get the sidebar too. Phones get the bar at the bottom.
    const isDesktop = useMediaQuery('(min-width: 768px)');

    useUnsavedChangesGuard(form.isDirty);

    // On a phone the sheet covers the lower part of the page. When it opens
    // for a section or an item, bring that part up above it.
    const showPickedAboveSheet = useEffectEvent(() => {
        if (builder.panel.name === 'section' || builder.panel.name === 'item') {
            builder.scrollToPicked();
        }
    });

    useEffect(() => {
        if (isDockOpen) {
            showPickedAboveSheet();
        }
    }, [isDockOpen]);

    function showSection(index: number) {
        const section = form.current().sections[index];

        if (section) {
            builder.selectSection(section.id);
            builder.scrollToSection(section.id);
        } else {
            builder.openPanel({ name: 'layers' });
        }

        if (!isDesktop) {
            setIsDockOpen(true);
        }
    }

    function saveAndShowProblems() {
        void form.save({
            onError: (errors) => {
                const index = Object.keys(errors)
                    .map(sectionIndexOfError)
                    .find((found) => found !== null);

                if (index !== undefined && index !== null) {
                    showSection(index);
                }
            },
        });
    }

    useBuilderShortcuts({
        onSave: () => {
            if (form.isDirty && !form.processing) {
                saveAndShowProblems();
            }
        },
        onEscape: builder.clearSelection,
    });

    const sidebar = (
        <Sidebar onDone={isDesktop ? undefined : () => setIsDockOpen(false)} />
    );
    const notices =
        Object.keys(form.errors).length > 0 ? (
            <SaveErrors
                errors={form.errors}
                onShowSection={showSection}
                onDismiss={form.clearErrors}
            />
        ) : null;

    return (
        <>
            <BuilderContext
                value={{
                    builder,
                    form,
                    templates,
                    device: isDesktop ? device : 'phone',
                    isDesktop,
                    onDeleteSection: setDeleteId,
                    revealPanel: (panel) => {
                        builder.openPanel(panel);

                        if (!isDesktop) {
                            setIsDockOpen(true);
                        }
                    },
                    isSheetOpen: !isDesktop && isDockOpen,
                }}
            >
                <BuilderDragAndDrop>
                    <div
                        data-fbe-app=""
                        className="bg-background text-foreground flex h-full flex-col overflow-hidden"
                    >
                        <BuilderTopBar
                            device={device}
                            onDeviceChange={setDevice}
                            isDesktop={isDesktop}
                            hasUnsavedChanges={form.isDirty}
                            recentlySaved={form.recentlySuccessful}
                            isSaving={form.processing}
                            onPreview={() => setIsPreviewOpen(true)}
                            onSave={saveAndShowProblems}
                        />
                        <div className="flex min-h-0 flex-1">
                            {isDesktop && (
                                <aside
                                    aria-label={t('Editor panels')}
                                    className={
                                        builder.panel.name === 'section' ||
                                        builder.panel.name === 'item'
                                            ? 'bg-card w-[22rem] shrink-0 border-r transition-[width] duration-200 lg:w-[26rem] xl:w-[28rem]'
                                            : 'bg-card w-[19.5rem] shrink-0 border-r transition-[width] duration-200 lg:w-[21.5rem] xl:w-[23rem]'
                                    }
                                >
                                    {sidebar}
                                </aside>
                            )}
                            <Canvas notices={notices} />
                        </div>
                        {!isDesktop && (
                            <MobileDock
                                open={isDockOpen}
                                onOpenChange={setIsDockOpen}
                            >
                                {sidebar}
                            </MobileDock>
                        )}
                    </div>
                </BuilderDragAndDrop>
            </BuilderContext>

            <PreviewDialog
                open={isPreviewOpen}
                onOpenChange={setIsPreviewOpen}
                draft={JSON.stringify(form.data)}
                initialDevice={device}
                isDesktop={isDesktop}
            />

            <ConfirmDialog
                open={deleteId !== null}
                onOpenChange={(open) => !open && setDeleteId(null)}
                title={t('Delete this section?')}
                description={t(
                    'It is removed from your page when you press Save.',
                )}
                confirmLabel={t('Delete section')}
                onConfirm={() => {
                    if (deleteId !== null) {
                        builder.removeSection(deleteId);
                    }

                    setDeleteId(null);
                }}
            />
        </>
    );
}

/** While there are unsaved changes, the browser asks before leaving. */
function useUnsavedChangesGuard(hasUnsavedChanges: boolean) {
    useEffect(() => {
        if (!hasUnsavedChanges) {
            return;
        }

        function warnBeforeUnload(event: BeforeUnloadEvent) {
            event.preventDefault();
            event.returnValue = '';
        }

        window.addEventListener('beforeunload', warnBeforeUnload);

        return () =>
            window.removeEventListener('beforeunload', warnBeforeUnload);
    }, [hasUnsavedChanges]);
}
