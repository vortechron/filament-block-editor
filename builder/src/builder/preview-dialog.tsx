import { ArrowLeft, Monitor, Smartphone, Tablet } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { useState } from 'react';
import { Button } from '@/ui/button';
import { usePortalContainer } from '@/ui/portal';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { LivePreview } from '../editor/live-preview';
import type { Device } from './types';

/**
 * The page exactly as visitors get it, drawn by the host with the changes
 * that are not saved yet. Opened from Preview in the top bar.
 */
export function PreviewDialog({
    open,
    onOpenChange,
    draft,
    kit,
    initialDevice,
    isDesktop,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    draft: string;
    /** The design kit as JSON, with changes not saved yet, or null. */
    kit: string | null;
    initialDevice: Device;
    isDesktop: boolean;
}) {
    const t = useT();
    const container = usePortalContainer();
    const [device, setDevice] = useState<Device>(initialDevice);
    const isPhone = !isDesktop || device === 'phone';

    return (
        <DialogPrimitive.Root
            open={open}
            onOpenChange={(next) => {
                if (next) {
                    setDevice(initialDevice);
                }

                onOpenChange(next);
            }}
        >
            <DialogPrimitive.Portal container={container}>
                <DialogPrimitive.Overlay className="data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm" />
                <DialogPrimitive.Content className="data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98] fixed inset-0 z-50 flex flex-col outline-none">
                    <DialogPrimitive.Title className="sr-only">
                        {t('Preview')}
                    </DialogPrimitive.Title>
                    <DialogPrimitive.Description className="sr-only">
                        {t(
                            'Your page with the changes you have not saved yet.',
                        )}
                    </DialogPrimitive.Description>

                    <div className="flex h-14 shrink-0 items-center gap-3 px-3 text-white">
                        <DialogPrimitive.Close asChild>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-white hover:bg-white/10 hover:text-white"
                            >
                                <ArrowLeft />
                                {t('Back to editing')}
                            </Button>
                        </DialogPrimitive.Close>
                        {isDesktop && (
                            <div
                                role="radiogroup"
                                aria-label={t('View the page on')}
                                className="mx-auto flex gap-0.5 rounded-lg bg-white/10 p-0.5"
                            >
                                {(
                                    [
                                        ['desktop', Monitor, t('Laptop')],
                                        ['tablet', Tablet, t('Tablet')],
                                        ['phone', Smartphone, t('Phone')],
                                    ] as const
                                ).map(([value, Icon, label]) => (
                                    <button
                                        key={value}
                                        type="button"
                                        role="radio"
                                        aria-checked={device === value}
                                        aria-label={label}
                                        onClick={() => setDevice(value)}
                                        className={cn(
                                            'flex h-8 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors',
                                            device === value
                                                ? 'bg-white text-slate-900'
                                                : 'text-white/80 hover:text-white',
                                        )}
                                    >
                                        <Icon className="size-4" />
                                        {label}
                                    </button>
                                ))}
                            </div>
                        )}
                        {isDesktop && <span className="w-[9.5rem]" />}
                    </div>

                    <div className="min-h-0 flex-1 px-3 pb-3">
                        <div
                            className={cn(
                                'mx-auto h-full transition-[max-width] duration-300',
                                isPhone
                                    ? 'max-w-[24.375rem]'
                                    : device === 'tablet'
                                      ? 'max-w-[51.25rem]'
                                      : 'max-w-[80rem]',
                            )}
                        >
                            {open && (
                                <LivePreview
                                    draft={draft}
                                    kit={kit}
                                    editingBlockId={null}
                                    className="h-full grid-rows-[auto_minmax(0,1fr)_auto] rounded-2xl bg-white p-3"
                                    frameClassName="h-full"
                                />
                            )}
                        </div>
                    </div>
                </DialogPrimitive.Content>
            </DialogPrimitive.Portal>
        </DialogPrimitive.Root>
    );
}
