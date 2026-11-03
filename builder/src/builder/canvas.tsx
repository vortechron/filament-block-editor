import { EyeOff, LayoutTemplate, Lock, Plus } from 'lucide-react';
import {
    type PointerEvent,
    type ReactNode,
    type RefObject,
    useEffect,
    useRef,
    useState,
} from 'react';
import { Button } from '@/ui/button';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useHost } from '@/lib/host';
import { partLabel } from '@/lib/site-parts';
import { useBuilderContext } from './builder-context';
import type { PartKey } from '@/types';
import type { FrameMarks } from './frame-marks';
import { type FramePick, PageFrame } from './page-frame';
import { sectionKind } from './section-meta';
import { TemplateMenu } from './template-menu';
import { panelUnder, type SidebarPanel } from './types';

/** How wide the page is drawn for each device. */
const FRAME_WIDTH = {
    desktop: '80rem',
    tablet: '51.25rem',
    phone: '24.375rem',
} as const;

/**
 * A laptop screen and a tablet, in pixels. A narrower canvas draws the
 * page this wide and shrinks it, so it shows the layout visitors get on
 * that device, not a smaller one.
 */
const DRAWN_WIDTH = { desktop: 1280, tablet: 820 } as const;

/**
 * The page as visitors will see it, on the right of the sidebar: the real
 * page drawn by the host, so every layout, slideshow and ticker looks and
 * moves as it does for visitors. A click on a section opens it in the
 * sidebar, where its words are edited. Tapping the grey space around the
 * page picks nothing, which shows the Add panel again.
 */
export function Canvas({ notices }: { notices: ReactNode }) {
    const t = useT();
    const { viewUrl, parts } = useHost();
    const { builder, form, device, isDesktop, revealPanel, kit, siteInfo } =
        useBuilderContext();
    // Only a kit and shop info that can change are sent with the preview.
    const kitDraft = kit.canSave ? JSON.stringify(kit.kit) : null;
    const siteInfoDraft = siteInfo.canSave ? JSON.stringify(siteInfo.values) : null;
    const { blocks, selection } = builder;
    const showsFrame = isDesktop;
    const pageBox = useRef<HTMLDivElement>(null);
    const pageWidth = useWidth(pageBox);
    const scale =
        showsFrame && device !== 'phone' && pageWidth > 0
            ? Math.min(1, pageWidth / DRAWN_WIDTH[device])
            : 1;
    const picked = blocks.find((block) => block.id === selection.sectionId);
    const pickedItemPath =
        selection.sectionId && selection.itemId
            ? (builder
                  .handleFor(selection.sectionId)
                  ?.pathOf(selection.itemId) ?? null)
            : null;
    const partTitle = (key: PartKey) =>
        parts.find((part) => part.key === key)?.title || partLabel(key, t);
    const marks: FrameMarks = {
        sectionLabels: new Map(
            blocks.map((block, index) => [
                block.id,
                `${index + 1}. ${sectionKind(block, t)}`,
            ]),
        ),
        pickedSectionId: selection.sectionId,
        pickedItemPath,
        partLabels: { header: partTitle('header'), footer: partTitle('footer') },
        pickedPart: pickedPart(builder.panel),
        hiddenLabel: t('Hidden'),
        scale,
    };

    function handleBackdrop(event: PointerEvent<HTMLElement>) {
        if (
            event.target instanceof Element &&
            event.target.closest('[data-canvas-backdrop]') === event.target
        ) {
            builder.clearSelection();
        }
    }

    function handlePick(pick: FramePick) {
        if (pick.kind === 'nothing') {
            builder.clearSelection();

            return;
        }

        if (pick.kind === 'part') {
            builder.selectPart(pick.part);

            if (!isDesktop) {
                revealPanel({ name: 'part', part: pick.part });
            }

            return;
        }

        // On a phone the words are in the sheet, so it opens too.
        if (!isDesktop) {
            revealPanel({ name: 'section' });
        }

        builder.pickOnPage(pick.sectionId, pick.path);
    }

    return (
        <main
            data-builder-canvas
            data-canvas-backdrop
            onPointerDown={handleBackdrop}
            className={cn(
                'relative flex min-h-0 flex-1 flex-col bg-[var(--builder-canvas)]',
                showsFrame && 'px-4 pt-4 pb-4 lg:px-6 lg:pt-5 xl:px-10',
            )}
        >
            {notices && (
                <div className="pointer-events-none absolute inset-x-0 top-3 z-40 mx-auto grid max-w-xl gap-2 px-3 [&>*]:pointer-events-auto">
                    {notices}
                </div>
            )}

            <div
                data-canvas-backdrop
                data-canvas-frame={device}
                className="mx-auto flex min-h-0 w-full flex-1 flex-col transition-[max-width] duration-300 ease-out"
                style={{
                    maxWidth: showsFrame ? FRAME_WIDTH[device] : undefined,
                }}
            >
                {showsFrame && (
                    <BrowserBar
                        url={viewUrl ?? ''}
                        isPhone={device === 'phone'}
                    />
                )}

                <div
                    ref={pageBox}
                    data-canvas-page
                    className={cn(
                        'always-light relative min-h-0 flex-1 overflow-hidden bg-white',
                        showsFrame &&
                            'shadow-[0_1px_3px_rgb(15_23_42/0.08),0_24px_60px_-28px_rgb(15_23_42/0.35)] ring-1 ring-slate-900/[0.06]',
                        showsFrame &&
                            (device === 'phone'
                                ? 'rounded-b-[1.75rem]'
                                : 'rounded-b-lg'),
                    )}
                >
                    <div className="absolute inset-0">
                        {blocks.length === 0 ? (
                            <EmptyPage />
                        ) : (
                            <PageFrame
                                draft={JSON.stringify(form.data)}
                                kit={kitDraft}
                                siteInfo={siteInfoDraft}
                                reloads={siteInfo.reloads}
                                marks={marks}
                                onPick={handlePick}
                            />
                        )}
                    </div>

                    {picked?.hidden === true && (
                        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
                            <span className="flex items-center gap-2 rounded-full bg-neutral-900/90 px-3.5 py-2 text-xs font-medium text-white shadow-lg">
                                <EyeOff className="size-3.5 shrink-0" />
                                {t(
                                    'Visitors do not see this hidden section. Show it again in the sidebar.',
                                )}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}

/** The width of a box, kept up to date as it changes. */
function useWidth(box: RefObject<HTMLElement | null>): number {
    const [width, setWidth] = useState(0);

    useEffect(() => {
        const element = box.current;

        if (!element) {
            return;
        }

        const observer = new ResizeObserver(([entry]) =>
            setWidth(entry.contentRect.width),
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, [box]);

    return width;
}

/** A browser's address bar over the page, so it reads as a real web page. */
function BrowserBar({ url, isPhone }: { url: string; isPhone: boolean }) {
    const t = useT();
    const address = url.replace(/^https?:\/\//, '') || t('Your page');

    return (
        <div
            aria-hidden="true"
            className={cn(
                'bg-card ring-foreground/[0.06] flex shrink-0 items-center gap-3 border-b px-4 ring-1',
                isPhone
                    ? 'h-12 justify-center rounded-t-[1.75rem]'
                    : 'h-10 rounded-t-lg',
            )}
        >
            {!isPhone && (
                <span className="flex gap-1.5">
                    <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                    <span className="size-2.5 rounded-full bg-[#febc2e]" />
                    <span className="size-2.5 rounded-full bg-[#28c840]" />
                </span>
            )}
            <span
                className={cn(
                    'bg-muted text-muted-foreground flex h-6 min-w-0 items-center gap-1.5 rounded-full px-3 text-xs',
                    isPhone
                        ? 'max-w-[85%]'
                        : 'mx-auto w-full max-w-md justify-center',
                )}
            >
                <Lock className="size-3 shrink-0" />
                <span className="truncate">{address}</span>
            </span>
            {!isPhone && <span className="w-[3.25rem]" />}
        </div>
    );
}

function EmptyPage() {
    const t = useT();
    const { builder, templates } = useBuilderContext();

    return (
        <div
            data-canvas-drop-end
            className="grid h-full min-h-[28rem] place-items-center overflow-y-auto px-6 py-16"
        >
            <div className="grid max-w-sm justify-items-center gap-4 text-center">
                <span className="grid size-14 place-items-center rounded-2xl bg-[var(--builder-select)]/10 text-[var(--builder-select)]">
                    <LayoutTemplate className="size-7" />
                </span>
                <div className="grid gap-1">
                    <p className="text-lg font-semibold text-slate-900">
                        {t('Your page is empty')}
                    </p>
                    <p className="text-sm text-slate-500">
                        {t(
                            'Add your first section, or drag one in from the left.',
                        )}
                    </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                    <TemplateMenu
                        templates={templates}
                        onPick={(template) => builder.addSection(template)}
                    >
                        <Button
                            type="button"
                            className="bg-[var(--builder-select)] hover:bg-[var(--builder-select)]/90"
                        >
                            <Plus />
                            {t('Add section')}
                        </Button>
                    </TemplateMenu>
                </div>
            </div>
        </div>
    );
}

/** The header or footer whose panel is open, also under its shop info. */
function pickedPart(panel: SidebarPanel): PartKey | null {
    const under = panelUnder(panel);

    return under.name === 'part' ? under.part : null;
}
