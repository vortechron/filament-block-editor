import {
    ArrowLeft,
    Check,
    Ellipsis,
    ExternalLink,
    Eye,
    LoaderCircle,
    Monitor,
    Palette,
    PanelLeftOpen,
    Redo2,
    Smartphone,
    Store,
    Tablet,
    Undo2,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { isPartKey, partLabel } from '@/lib/site-parts';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import type { Device } from './types';
import { PageMenu } from './page-menu';
import { historyShortcuts } from './use-builder-shortcuts';

/**
 * The bar across the top of the page builder: back to the host's list
 * (when it gave a back link), the page title (with "Header" or "Footer"
 * when the builder edits one), laptop, tablet or phone view, then
 * Design (when the host has a design kit), Shop info (when it has a shop
 * info form), Preview, View page (when it gave a page link), Undo, Redo
 * and Save. Below 1024px there is no room for all of them beside the
 * device switch (or, on a phone, the title), so the host's extra buttons
 * (Design, Shop info, View page) go into a More menu when there are two
 * or more of them.
 */
export function BuilderTopBar({
    device,
    onDeviceChange,
    isWide,
    onWide,
    isDesktop,
    hasUnsavedChanges,
    recentlySaved,
    isSaving,
    onPreview,
    onDesign,
    onSiteInfo,
    onSave,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
}: {
    device: Device;
    onDeviceChange: (device: Device) => void;
    /** The editor panel has the whole width, with no page beside it. */
    isWide: boolean;
    onWide: () => void;
    isDesktop: boolean;
    hasUnsavedChanges: boolean;
    recentlySaved: boolean;
    isSaving: boolean;
    onPreview: () => void;
    /** Opens the design panel. Left out, there is no design button. */
    onDesign?: () => void;
    /** Opens the whole shop info form. Left out, there is no such button. */
    onSiteInfo?: () => void;
    onSave: () => void;
    canUndo: boolean;
    canRedo: boolean;
    onUndo: () => void;
    onRedo: () => void;
}) {
    const t = useT();
    const { title, backUrl, viewUrl, kind } = useHost();
    const kindLabel = isPartKey(kind) ? partLabel(kind, t) : null;
    const canSave = hasUnsavedChanges && !isSaving;
    const keys = historyShortcuts();
    const extras: Extra[] = [
        ...(onDesign ? [{ label: t('Design'), icon: Palette, onSelect: onDesign }] : []),
        ...(onSiteInfo ? [{ label: t('Shop info'), icon: Store, onSelect: onSiteInfo }] : []),
        ...(viewUrl ? [{ label: t('View page'), icon: ExternalLink, href: viewUrl }] : []),
    ];
    const isTucked = extras.length >= 2;
    // The extra buttons themselves show from 1024px only, when tucked.
    const extraClass = isTucked ? 'hidden lg:inline-flex' : undefined;

    return (
        <header className="bg-card relative z-30 flex h-14 shrink-0 items-center gap-2 border-b px-2 sm:gap-3 sm:px-3">
            {backUrl && (
                <>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                asChild
                                variant="ghost"
                                size="icon"
                                aria-label={t('Back')}
                            >
                                <a href={backUrl}>
                                    <ArrowLeft />
                                </a>
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">{t('Back')}</TooltipContent>
                    </Tooltip>

                    <div className="bg-border h-6 w-px shrink-0" />
                </>
            )}

            <div className="flex min-w-0 flex-1 items-center gap-2 pl-1 md:flex-none">
                {kindLabel && (
                    <span className="shrink-0 rounded-md bg-[var(--builder-select)]/10 px-2 py-0.5 text-xs font-semibold text-[var(--builder-select)]">
                        {kindLabel}
                    </span>
                )}
                <h1 className="text-foreground min-w-0 text-sm font-semibold sm:text-[15px] md:max-w-[10rem] lg:max-w-[18rem] xl:max-w-[26rem]">
                    <PageMenu title={title || kindLabel || t('Page')} />
                </h1>
            </div>

            {isDesktop && (
                <div className="pointer-events-none absolute inset-x-0 flex justify-center">
                    <div
                        role="radiogroup"
                        aria-label={t('View the page on')}
                        className="bg-muted pointer-events-auto flex items-center gap-0.5 rounded-lg p-0.5"
                    >
                        <DeviceButton
                            label={t('Laptop')}
                            isActive={!isWide && device === 'desktop'}
                            onClick={() => onDeviceChange('desktop')}
                        >
                            <Monitor />
                        </DeviceButton>
                        <DeviceButton
                            label={t('Tablet')}
                            isActive={!isWide && device === 'tablet'}
                            onClick={() => onDeviceChange('tablet')}
                        >
                            <Tablet />
                        </DeviceButton>
                        <DeviceButton
                            label={t('Phone')}
                            isActive={!isWide && device === 'phone'}
                            onClick={() => onDeviceChange('phone')}
                        >
                            <Smartphone />
                        </DeviceButton>
                        <span aria-hidden="true" className="bg-border mx-0.5 h-5 w-px" />
                        <DeviceButton
                            label={t('Edit without the page')}
                            isActive={isWide}
                            onClick={onWide}
                        >
                            <PanelLeftOpen />
                        </DeviceButton>
                    </div>
                </div>
            )}

            <div className="relative ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
                {isDesktop && (
                    <SaveState
                        hasUnsavedChanges={hasUnsavedChanges}
                        recentlySaved={recentlySaved}
                    />
                )}

                {isTucked && <MoreMenu extras={extras} />}

                {onDesign && (
                    <Button
                        type="button"
                        variant="ghost"
                        size={isDesktop ? 'sm' : 'icon'}
                        className={extraClass}
                        onClick={onDesign}
                        aria-label={t('Design')}
                        title={t('Design')}
                    >
                        <Palette />
                        {isDesktop && (
                            <span className="hidden 2xl:inline">{t('Design')}</span>
                        )}
                    </Button>
                )}

                {onSiteInfo && (
                    <Button
                        type="button"
                        variant="ghost"
                        size={isDesktop ? 'sm' : 'icon'}
                        className={extraClass}
                        onClick={onSiteInfo}
                        aria-label={t('Shop info')}
                        title={t('Shop info')}
                    >
                        <Store />
                        {isDesktop && (
                            <span className="hidden 2xl:inline">{t('Shop info')}</span>
                        )}
                    </Button>
                )}

                <Button
                    type="button"
                    variant="ghost"
                    size={isDesktop ? 'sm' : 'icon'}
                    onClick={onPreview}
                    aria-label={t('Preview')}
                    title={t('Preview')}
                >
                    <Eye />
                    {isDesktop && (
                        <span className="hidden 2xl:inline">{t('Preview')}</span>
                    )}
                </Button>

                {viewUrl && (
                    <Button
                        asChild
                        variant="ghost"
                        size={isDesktop ? 'sm' : 'icon'}
                        className={extraClass}
                        aria-label={t('View page')}
                        title={t('View page')}
                    >
                        <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink />
                            {isDesktop && (
                                <span className="hidden 2xl:inline">
                                    {t('View page')}
                                </span>
                            )}
                        </a>
                    </Button>
                )}

                <div className="flex items-center">
                    <Button
                        type="button"
                        variant="ghost"
                        size={isDesktop ? 'icon-sm' : 'icon'}
                        disabled={!canUndo}
                        onClick={onUndo}
                        aria-label={t('Undo')}
                        aria-keyshortcuts={keys.undo.aria}
                        title={`${t('Undo')} (${keys.undo.shown})`}
                    >
                        <Undo2 />
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size={isDesktop ? 'icon-sm' : 'icon'}
                        disabled={!canRedo}
                        onClick={onRedo}
                        aria-label={t('Redo')}
                        aria-keyshortcuts={keys.redo.aria}
                        title={`${t('Redo')} (${keys.redo.shown})`}
                    >
                        <Redo2 />
                    </Button>
                </div>

                <Button
                    type="button"
                    size="sm"
                    disabled={!canSave}
                    onClick={onSave}
                    className="min-w-20 bg-[var(--builder-select)] text-white hover:bg-[var(--builder-select)]/90"
                >
                    {isSaving ? (
                        <LoaderCircle className="animate-spin" />
                    ) : (
                        !hasUnsavedChanges && recentlySaved && <Check />
                    )}
                    {!hasUnsavedChanges && recentlySaved && !isSaving
                        ? t('Saved')
                        : t('Save')}
                </Button>
            </div>
        </header>
    );
}

/** A button of the host's own, in the More menu below 1024px. */
type Extra = { label: string; icon: LucideIcon } & (
    | { onSelect: () => void; href?: undefined }
    | { href: string; onSelect?: undefined }
);

function MoreMenu({ extras }: { extras: Extra[] }) {
    const t = useT();

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    aria-label={t('More')}
                    title={t('More')}
                >
                    <Ellipsis />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
                {extras.map(({ label, icon: Icon, onSelect, href }) =>
                    href === undefined ? (
                        <DropdownMenuItem key={label} onSelect={onSelect}>
                            <Icon />
                            {label}
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem key={label} asChild>
                            <a href={href} target="_blank" rel="noopener noreferrer">
                                <Icon />
                                {label}
                            </a>
                        </DropdownMenuItem>
                    ),
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function DeviceButton({
    label,
    isActive,
    onClick,
    children,
}: {
    label: string;
    isActive: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    aria-label={label}
                    onClick={onClick}
                    className={cn(
                        'grid h-8 w-10 place-items-center rounded-md transition-colors [&_svg]:size-[18px]',
                        isActive
                            ? 'bg-card text-foreground dark:bg-input/70 shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                    )}
                >
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
    );
}

function SaveState({
    hasUnsavedChanges,
    recentlySaved,
}: {
    hasUnsavedChanges: boolean;
    recentlySaved: boolean;
}) {
    const t = useT();

    if (hasUnsavedChanges) {
        return (
            <span className="text-warning mr-1 hidden items-center gap-1.5 text-xs font-medium 2xl:flex">
                <span className="bg-warning size-1.5 rounded-full" />
                {t('Unsaved changes')}
            </span>
        );
    }

    return recentlySaved ? null : (
        <span className="text-muted-foreground mr-1 hidden items-center gap-1.5 text-xs 2xl:flex">
            <Check className="size-3.5" />
            {t('All changes saved')}
        </span>
    );
}
