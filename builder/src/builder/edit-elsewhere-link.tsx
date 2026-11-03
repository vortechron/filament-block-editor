import { ExternalLink } from 'lucide-react';
import { type MouseEvent, useState } from 'react';
import { useT } from '@/lib/i18n';
import { ConfirmDialog } from '../editor/confirm-dialog';
import { useBuilderContext } from './builder-context';

/**
 * A link to the host's own editor for something this page only shows,
 * like a synced section or the header. With unsaved changes it asks
 * first, because leaving loses them.
 */
export function EditElsewhereLink({
    href,
    label,
}: {
    href: string;
    label: string;
}) {
    const t = useT();
    const { hasUnsavedChanges, leaveTo } = useBuilderContext();
    const [isAsking, setIsAsking] = useState(false);

    function handleClick(event: MouseEvent<HTMLAnchorElement>) {
        if (hasUnsavedChanges) {
            event.preventDefault();
            setIsAsking(true);
        }
    }

    return (
        <>
            <a
                href={href}
                onClick={handleClick}
                className="bg-card flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium hover:border-[var(--builder-select)] hover:text-[var(--builder-select)]"
            >
                <ExternalLink className="size-4" />
                {label}
            </a>
            <ConfirmDialog
                open={isAsking}
                onOpenChange={setIsAsking}
                title={t('Leave without saving?')}
                description={t(
                    'This page has changes that are not saved yet. Save first to keep them.',
                )}
                confirmLabel={t('Leave')}
                onConfirm={() => {
                    setIsAsking(false);
                    leaveTo(href);
                }}
            />
        </>
    );
}
