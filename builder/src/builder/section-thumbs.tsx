import {
    Award,
    CircleQuestionMark,
    Columns2,
    Hash,
    Image,
    LayoutDashboard,
    LayoutGrid,
    ListChecks,
    ListOrdered,
    type LucideIcon,
    Megaphone,
    MessageSquareQuote,
    MoveHorizontal,
    Newspaper,
    PanelTop,
    LayoutPanelLeft,
    TextAlignStart,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { SectionLayout } from '@/types';

/** The same icons as the Layout picker (rich-look-fields.tsx). */
export const LAYOUT_ICONS: Record<SectionLayout, LucideIcon> = {
    plain: TextAlignStart,
    hero: PanelTop,
    cards: LayoutGrid,
    ticks: ListChecks,
    reviews: MessageSquareQuote,
    faq: CircleQuestionMark,
    highlight: Award,
    banner: Megaphone,
    product: LayoutPanelLeft,
    poster: Image,
    editorial: Newspaper,
    bento: LayoutDashboard,
    steps: ListOrdered,
    stats: Hash,
    compare: Columns2,
    marquee: MoveHorizontal,
};

export const LAYOUT_LABELS: Record<SectionLayout, string> = {
    plain: 'Plain',
    hero: 'Hero',
    cards: 'Cards',
    ticks: 'Ticks',
    reviews: 'Reviews',
    faq: 'FAQ',
    highlight: 'Highlight',
    banner: 'Banner',
    product: 'Showcase',
    poster: 'Poster',
    editorial: 'Magazine',
    bento: 'Bento',
    steps: 'Steps',
    stats: 'Big numbers',
    compare: 'Compare',
    marquee: 'Ticker',
};

const bar = 'rounded-full bg-current';

function Lines({
    count = 3,
    className,
}: {
    count?: number;
    className?: string;
}) {
    return (
        <div className={cn('grid gap-1', className)}>
            {Array.from({ length: count }, (_, index) => (
                <span
                    key={index}
                    className={cn(bar, 'h-1 opacity-25')}
                    style={{ width: `${index === count - 1 ? 60 : 100}%` }}
                />
            ))}
        </div>
    );
}

function Title({ className }: { className?: string }) {
    return <span className={cn(bar, 'h-1.5 w-3/5 opacity-70', className)} />;
}

function Frame({
    children,
    className,
}: {
    children: ReactNode;
    className?: string;
}) {
    return (
        <div
            aria-hidden="true"
            className={cn(
                'always-light flex aspect-[16/10] w-full flex-col justify-center gap-1.5 overflow-hidden rounded-md bg-[var(--thumb-bg,#ffffff)] p-2.5 text-[color:var(--thumb-ink,var(--color-foreground))]',
                className,
            )}
        >
            {children}
        </div>
    );
}

/**
 * A small drawing of what a section looks like on the page, so a user
 * can pick one without reading its name.
 */
export function SectionThumb({ layout }: { layout: SectionLayout }) {
    switch (layout) {
        case 'hero':
            return (
                <Frame className="flex-row items-center gap-2">
                    <div className="grid flex-1 gap-1.5">
                        <Title className="w-full" />
                        <Lines count={2} />
                        <span className="h-2 w-3/5 rounded-sm bg-[var(--builder-accent)]" />
                    </div>
                    <span className="aspect-square w-2/5 rounded-sm bg-current opacity-15" />
                </Frame>
            );
        case 'cards':
            return (
                <Frame>
                    <Title className="mx-auto w-2/5" />
                    <div className="grid grid-cols-3 gap-1">
                        {[0, 1, 2].map((index) => (
                            <div
                                key={index}
                                className="grid gap-1 rounded-sm border border-current/15 p-1"
                            >
                                <span className="size-1.5 rounded-full bg-[var(--builder-accent)]" />
                                <Lines count={2} />
                            </div>
                        ))}
                    </div>
                </Frame>
            );
        case 'ticks':
            return (
                <Frame>
                    <Title className="w-2/5" />
                    <div className="grid grid-cols-2 gap-1">
                        {[0, 1, 2, 3].map((index) => (
                            <div
                                key={index}
                                className="flex items-center gap-1 rounded-sm bg-current/5 p-1"
                            >
                                <span className="size-1.5 shrink-0 rounded-full bg-emerald-500" />
                                <span
                                    className={cn(bar, 'h-1 flex-1 opacity-25')}
                                />
                            </div>
                        ))}
                    </div>
                </Frame>
            );
        case 'reviews':
            return (
                <Frame>
                    <div className="grid grid-cols-2 gap-1">
                        {[0, 1].map((index) => (
                            <div
                                key={index}
                                className="grid gap-1 rounded-sm border border-current/15 p-1"
                            >
                                <span className="text-[6px] leading-none text-amber-500">
                                    ★★★★★
                                </span>
                                <Lines count={2} />
                            </div>
                        ))}
                    </div>
                </Frame>
            );
        case 'faq':
            return (
                <Frame>
                    <Title className="mx-auto w-2/5" />
                    {[0, 1, 2].map((index) => (
                        <div
                            key={index}
                            className="flex items-center justify-between rounded-sm border border-current/15 px-1 py-0.5"
                        >
                            <span className={cn(bar, 'h-1 w-3/5 opacity-30')} />
                            <span className="text-[6px] leading-none opacity-50">
                                ▾
                            </span>
                        </div>
                    ))}
                </Frame>
            );
        case 'highlight':
            return (
                <Frame className="bg-slate-50">
                    <div className="mx-auto grid w-4/5 gap-1 rounded-md bg-white p-1.5 shadow-sm ring-1 ring-current/10">
                        <Title className="mx-auto" />
                        <Lines count={2} />
                        <span className="mx-auto h-2 w-2/5 rounded-sm bg-[var(--builder-accent)]" />
                    </div>
                </Frame>
            );
        case 'banner':
            return (
                <Frame className="items-center bg-[var(--builder-accent)] text-white">
                    <span className="h-1.5 w-3/5 rounded-full bg-white/90" />
                    <span className="h-1 w-2/5 rounded-full bg-white/60" />
                    <span className="h-2 w-1/3 rounded-sm bg-white" />
                </Frame>
            );
        case 'product':
            return (
                <Frame className="flex-row items-center gap-2">
                    <span className="aspect-square w-1/2 rounded-sm bg-current opacity-15" />
                    <div className="grid flex-1 gap-1">
                        <Title className="w-full" />
                        <span className="h-1.5 w-2/5 rounded-full bg-current opacity-60" />
                        <Lines count={2} />
                        <span className="h-2 w-full rounded-full bg-[var(--builder-accent)]" />
                    </div>
                </Frame>
            );
        case 'poster':
            return (
                <Frame className="justify-end bg-slate-800 text-white">
                    <span className="h-2 w-4/5 rounded-full bg-white/90" />
                    <span className="h-1 w-1/2 rounded-full bg-white/50" />
                    <span className="h-2 w-1/3 rounded-sm bg-[var(--builder-accent)]" />
                </Frame>
            );
        case 'editorial':
            return (
                <Frame className="flex-row items-start gap-2">
                    <div className="grid w-2/5 gap-1 border-t-2 border-current pt-1">
                        <span className="h-2 w-full rounded-full bg-current opacity-80" />
                        <span className="h-2 w-3/4 rounded-full bg-current opacity-80" />
                    </div>
                    <Lines count={5} className="flex-1" />
                </Frame>
            );
        case 'bento':
            return (
                <Frame>
                    <div className="grid flex-1 grid-cols-4 grid-rows-2 gap-1">
                        <span className="col-span-2 row-span-2 rounded-sm bg-[var(--builder-accent)]" />
                        <span className="rounded-sm border border-current/15" />
                        <span className="rounded-sm bg-current/10" />
                        <span className="rounded-sm bg-current/70" />
                        <span className="rounded-sm border border-current/15" />
                    </div>
                </Frame>
            );
        case 'steps':
            return (
                <Frame>
                    <div className="grid grid-cols-3 gap-1.5">
                        {['01', '02', '03'].map((number) => (
                            <div
                                key={number}
                                className="grid gap-1 border-t-2 border-[var(--builder-accent)] pt-1"
                            >
                                <span className="text-[9px] leading-none font-black opacity-40">
                                    {number}
                                </span>
                                <Lines count={2} />
                            </div>
                        ))}
                    </div>
                </Frame>
            );
        case 'stats':
            return (
                <Frame>
                    <div className="grid grid-cols-3 gap-1.5">
                        {['4', '99', '3x'].map((number) => (
                            <div key={number} className="grid gap-0.5">
                                <span className="text-sm leading-none font-black">
                                    {number}
                                </span>
                                <span className={cn(bar, 'h-1 opacity-25')} />
                            </div>
                        ))}
                    </div>
                </Frame>
            );
        case 'compare':
            return (
                <Frame>
                    <div className="grid grid-cols-2 gap-1">
                        <div className="grid gap-1 rounded-sm bg-current/5 p-1">
                            {[0, 1].map((index) => (
                                <span
                                    key={index}
                                    className="flex items-center gap-1"
                                >
                                    <span className="size-1.5 rounded-full bg-rose-500" />
                                    <span
                                        className={cn(
                                            bar,
                                            'h-1 flex-1 opacity-25',
                                        )}
                                    />
                                </span>
                            ))}
                        </div>
                        <div className="grid gap-1 rounded-sm border border-[var(--builder-accent)] p-1">
                            {[0, 1].map((index) => (
                                <span
                                    key={index}
                                    className="flex items-center gap-1"
                                >
                                    <span className="size-1.5 rounded-full bg-emerald-500" />
                                    <span
                                        className={cn(
                                            bar,
                                            'h-1 flex-1 opacity-25',
                                        )}
                                    />
                                </span>
                            ))}
                        </div>
                    </div>
                </Frame>
            );
        case 'marquee':
            return (
                <Frame className="bg-slate-900 text-white">
                    <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap">
                        {[0, 1, 2].map((index) => (
                            <span
                                key={index}
                                className="flex items-center gap-1.5"
                            >
                                <span className="h-1.5 w-8 rounded-full bg-white/80" />
                                <span className="text-[6px] text-[var(--builder-accent)]">
                                    ✦
                                </span>
                            </span>
                        ))}
                    </div>
                </Frame>
            );
        default:
            return (
                <Frame>
                    <Title />
                    <Lines count={4} />
                </Frame>
            );
    }
}
