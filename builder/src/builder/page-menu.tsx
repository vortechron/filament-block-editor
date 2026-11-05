import { Check, ChevronDown } from 'lucide-react';
import { type MouseEvent, useState } from 'react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { ConfirmDialog } from '../editor/confirm-dialog';
import { useBuilderContext } from './builder-context';

/**
 * The page title. With other pages to build (the host's `pageMenu`), a
 * tap opens the list, and each one opens its own builder, asking first
 * when there are changes not saved. Without them, just the title.
 */
export function PageMenu({ title }: { title: string }) {
    const t = useT();
    const { pageMenu } = useHost();
    const { hasUnsavedChanges, leaveTo } = useBuilderContext();
    const [leavingFor, setLeavingFor] = useState<string | null>(null);

    if (pageMenu.length < 2) {
        return <span className="block truncate">{title}</span>;
    }

    function handlePick(event: MouseEvent<HTMLAnchorElement>, url: string) {
        if (hasUnsavedChanges) {
            event.preventDefault();
            setLeavingFor(url);
        }
    }

    return (
        <>
            <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className="hover:bg-muted data-[state=open]:bg-muted -mx-1.5 flex max-w-full min-w-0 items-center gap-1 rounded-md px-1.5 py-1 transition-colors"
                    >
                        <span className="truncate">{title}</span>
                        <ChevronDown className="text-muted-foreground size-4 shrink-0" />
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="max-h-[70vh] w-64">
                    <DropdownMenuLabel className="text-muted-foreground text-xs font-medium">
                        {t('Build another page')}
                    </DropdownMenuLabel>
                    {pageMenu.map((page) => (
                        <DropdownMenuItem key={page.url} asChild>
                            <a
                                href={page.url}
                                aria-current={page.current ? 'page' : undefined}
                                onClick={(event) => handlePick(event, page.url)}
                                className={cn('flex items-center gap-2', page.current && 'font-semibold')}
                            >
                                <span className="min-w-0 flex-1 truncate">{page.title}</span>
                                {page.current && <Check className="size-4" />}
                            </a>
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>
            <ConfirmDialog
                open={leavingFor !== null}
                onOpenChange={(open) => !open && setLeavingFor(null)}
                title={t('Leave without saving?')}
                description={t('This page has changes that are not saved yet. Save first to keep them.')}
                confirmLabel={t('Leave')}
                onConfirm={() => {
                    const url = leavingFor;

                    setLeavingFor(null);

                    if (url !== null) {
                        leaveTo(url);
                    }
                }}
            />
        </>
    );
}
