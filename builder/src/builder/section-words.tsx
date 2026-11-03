import { Settings2 } from 'lucide-react';
import {
    lazy,
    type PointerEvent,
    Suspense,
    useEffect,
    useEffectEvent,
    useRef,
} from 'react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import type { RichSection } from '@/types';
import { Skeleton } from '@/ui/skeleton';
import { EditorErrorBoundary } from '../editor/editor-error-boundary';
import { useBuilderContext } from './builder-context';
import { describeBlock } from './item-catalog';

/** BlockNote is large, so it loads on its own when a section is picked. */
const SectionTextEditor = lazy(() => import('./section-text-editor'));

/**
 * After a tap the cursor moves too. Ignore cursor moves this soon after a
 * tap, so the tap decides which item is picked.
 */
const TAP_SETTLE_MS = 400;

/** Long enough for the phone's sheet to slide up (mobile-dock.tsx). */
const SHEET_SETTLE_MS = 260;

/**
 * The picked section's words, typed here while the page on the canvas
 * shows how they look. The item under the cursor is marked on the page
 * too. It stays open, out of sight, while an item's settings show,
 * because those settings change the item through this editor.
 */
export function SectionWords({ block }: { block: RichSection }) {
    const t = useT();
    const { builder } = useBuilderContext();
    const { accent, ownBlocks, upload } = useHost();
    const ownBlockMap = new Map(
        ownBlocks.map((definition) => [definition.kind, definition]),
    );
    const { selection } = builder;
    const handle = builder.handleFor(block.id);
    const lastTapAt = useRef(0);
    const picked =
        handle !== null &&
        selection.sectionId === block.id &&
        selection.itemId !== null
            ? handle.getItem(selection.itemId)
            : null;

    // Moving the cursor with the keyboard picks the item it lands on.
    const followCursor = useEffectEvent(() => {
        if (handle === null || Date.now() - lastTapAt.current < TAP_SETTLE_MS) {
            return;
        }

        const itemId = handle.cursorItemId();

        if (itemId !== null && itemId !== selection.itemId) {
            builder.pointAtItem(block.id, itemId);
        }
    });

    useEffect(() => handle?.subscribe(followCursor), [handle]);

    // The picked item stays in sight in the words, also once the phone's
    // sheet has slid up under a tap on the page.
    useEffect(() => {
        const itemId =
            selection.sectionId === block.id ? selection.itemId : null;

        if (itemId === null) {
            return;
        }

        const timer = window.setTimeout(() => {
            document
                .querySelector(
                    `[data-section-editor="${CSS.escape(block.id)}"] .bn-block-outer[data-id="${CSS.escape(itemId)}"]`,
                )
                ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }, SHEET_SETTLE_MS);

        return () => window.clearTimeout(timer);
    }, [block.id, selection.sectionId, selection.itemId]);

    function handlePointerDown(event: PointerEvent<HTMLElement>) {
        const target = event.target;

        lastTapAt.current = Date.now();

        if (!(target instanceof Element)) {
            return;
        }

        const itemId = target
            .closest('.bn-block-outer[data-id]')
            ?.getAttribute('data-id');

        if (itemId && !isTrailingLine(itemId)) {
            builder.pointAtItem(block.id, itemId);
        }
    }

    function itemLabel(type: string, props: Record<string, unknown>) {
        const described = describeBlock(type, props, ownBlocks);

        return described.isOwn ? described.label : t(described.label);
    }

    /**
     * The editor keeps an empty line under the last item, unseen until the
     * cursor is in it. It is not an item to pick.
     */
    function isTrailingLine(itemId: string): boolean {
        const item = handle?.getItem(itemId);

        return (
            item !== null &&
            item !== undefined &&
            item.isLast &&
            item.type === 'paragraph' &&
            item.text === ''
        );
    }

    return (
        <div className="grid grid-cols-1 gap-2">
            <div className="grid gap-0.5">
                <p className="text-foreground text-sm font-medium">
                    {t('Words in this section')}
                </p>
                <p className="text-muted-foreground text-xs">
                    {t(
                        'Type here. The page shows how it looks. Tap something on the page to jump to it.',
                    )}
                </p>
            </div>

            {picked && (
                <div className="bg-muted/60 flex min-h-9 items-center gap-2 rounded-lg border py-1 pr-1 pl-3">
                    <span className="text-muted-foreground min-w-0 flex-1 truncate text-xs">
                        {t('Picked: :item', {
                            item: itemLabel(picked.type, picked.props),
                        })}
                    </span>
                    <button
                        type="button"
                        onClick={() => builder.selectItem(block.id, picked.id)}
                        className="text-foreground hover:bg-card flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium hover:shadow-sm"
                    >
                        <Settings2 className="size-3.5" />
                        {t('Item settings')}
                    </button>
                </div>
            )}

            <div
                data-section-editor={block.id}
                onPointerDownCapture={handlePointerDown}
                className="always-light overflow-hidden rounded-xl border bg-white shadow-xs"
            >
                <EditorErrorBoundary>
                    <Suspense fallback={<WordsSkeleton />}>
                        <SectionTextEditor
                            key={block.id}
                            data={block.data}
                            accent={accent}
                            blocks={{
                                ownBlocks: ownBlockMap,
                                openItem: (itemId) =>
                                    builder.selectItem(block.id, itemId),
                            }}
                            uploadFile={(file) => upload(file)}
                            onDocumentChange={(document) =>
                                builder.updateSection(block.id, (current) =>
                                    current.type === 'rich'
                                        ? {
                                              ...current,
                                              data: { ...current.data, document },
                                          }
                                        : current,
                                )
                            }
                            onHandle={(next) =>
                                builder.registerHandle(block.id, next)
                            }
                        />
                    </Suspense>
                </EditorErrorBoundary>
            </div>
        </div>
    );
}

function WordsSkeleton() {
    return (
        <div className="grid gap-3 p-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
        </div>
    );
}
