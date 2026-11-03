import {
    ArrowLeft,
    Check,
    ExternalLink,
    Eye,
    LoaderCircle,
    Monitor,
    Palette,
    Smartphone,
    Tablet,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';
import type { Device } from './types';

/**
 * The bar across the top of the page builder: back to the host's list
 * (when it gave a back link), the page title, laptop, tablet or phone view, then
 * Design (when the host has a design kit), Preview, View page (when it
 * gave a page link) and Save.
 */
export function BuilderTopBar({
    device,
    onDeviceChange,
    isDesktop,
    hasUnsavedChanges,
    recentlySaved,
    isSaving,
    onPreview,
    onDesign,
    onSave,
}: {
    device: Device;
    onDeviceChange: (device: Device) => void;
    isDesktop: boolean;
    hasUnsavedChanges: boolean;
    recentlySaved: boolean;
    isSaving: boolean;
    onPreview: () => void;
    /** Opens the design panel. Left out, there is no design button. */
    onDesign?: () => void;
    onSave: () => void;
}) {
    const t = useT();
    const { title, backUrl, viewUrl } = useHost();
    const canSave = hasUnsavedChanges && !isSaving;

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
                <h1 className="text-foreground min-w-0 truncate text-sm font-semibold sm:text-[15px] md:max-w-[10rem] lg:max-w-[18rem] xl:max-w-[26rem]">
                    {title || t('Page')}
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
                            isActive={device === 'desktop'}
                            onClick={() => onDeviceChange('desktop')}
                        >
                            <Monitor />
                        </DeviceButton>
                        <DeviceButton
                            label={t('Tablet')}
                            isActive={device === 'tablet'}
                            onClick={() => onDeviceChange('tablet')}
                        >
                            <Tablet />
                        </DeviceButton>
                        <DeviceButton
                            label={t('Phone')}
                            isActive={device === 'phone'}
                            onClick={() => onDeviceChange('phone')}
                        >
                            <Smartphone />
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

                {onDesign && (
                    <Button
                        type="button"
                        variant="ghost"
                        size={isDesktop ? 'sm' : 'icon'}
                        onClick={onDesign}
                        aria-label={t('Design')}
                    >
                        <Palette />
                        {isDesktop && (
                            <span className="hidden lg:inline">{t('Design')}</span>
                        )}
                    </Button>
                )}

                <Button
                    type="button"
                    variant="ghost"
                    size={isDesktop ? 'sm' : 'icon'}
                    onClick={onPreview}
                    aria-label={t('Preview')}
                >
                    <Eye />
                    {isDesktop && (
                        <span className="hidden lg:inline">{t('Preview')}</span>
                    )}
                </Button>

                {viewUrl && (
                    <Button
                        asChild
                        variant="ghost"
                        size={isDesktop ? 'sm' : 'icon'}
                        aria-label={t('View page')}
                    >
                        <a href={viewUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink />
                            {isDesktop && (
                                <span className="hidden lg:inline">
                                    {t('View page')}
                                </span>
                            )}
                        </a>
                    </Button>
                )}

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
            <span className="text-warning mr-1 hidden items-center gap-1.5 text-xs font-medium xl:flex">
                <span className="bg-warning size-1.5 rounded-full" />
                {t('Unsaved changes')}
            </span>
        );
    }

    return recentlySaved ? null : (
        <span className="text-muted-foreground mr-1 hidden items-center gap-1.5 text-xs xl:flex">
            <Check className="size-3.5" />
            {t('All changes saved')}
        </span>
    );
}
