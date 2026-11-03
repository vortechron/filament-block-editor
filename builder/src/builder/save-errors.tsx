import { CircleAlert, X } from 'lucide-react';
import { useT } from '@/lib/i18n';

/** The section a save error belongs to, from a key like "sections.2.data". */
export function sectionIndexOfError(key: string): number | null {
    const match = /^(?:sections|content)\.(\d+)(?:\.|$)/.exec(key);

    return match ? Number(match[1]) : null;
}

/**
 * Lists what went wrong on the last Save. An error that belongs to a
 * section says which one, and a tap opens it.
 */
export function SaveErrors({
    title,
    errors,
    onShowSection,
    onDismiss,
}: {
    /** The first line. "Your changes were not saved" when left out. */
    title?: string;
    errors: Record<string, string>;
    onShowSection: (index: number) => void;
    onDismiss: () => void;
}) {
    const t = useT();
    const entries = Object.entries(errors);

    if (entries.length === 0) {
        return null;
    }

    return (
        <div
            role="alert"
            className="border-destructive/30 bg-card text-foreground relative grid gap-1.5 rounded-xl border p-3 pr-10 text-sm shadow-lg"
        >
            <p className="text-destructive flex items-center gap-2 font-semibold">
                <CircleAlert className="size-4 shrink-0" />
                {title ?? t('Your changes were not saved')}
            </p>
            <ul className="grid grid-cols-1 gap-1 pl-6 text-xs">
                {entries.slice(0, 6).map(([key, message]) => {
                    const index = sectionIndexOfError(key);

                    return (
                        <li key={key}>
                            {index !== null && (
                                <>
                                    <button
                                        type="button"
                                        className="font-medium underline underline-offset-2"
                                        onClick={() => onShowSection(index)}
                                    >
                                        {t('Section :number', {
                                            number: index + 1,
                                        })}
                                    </button>
                                    {': '}
                                </>
                            )}
                            {message}
                        </li>
                    );
                })}
            </ul>
            <button
                type="button"
                aria-label={t('Close')}
                onClick={onDismiss}
                className="text-muted-foreground hover:bg-muted absolute top-2 right-2 grid size-7 place-items-center rounded-md"
            >
                <X className="size-4" />
            </button>
        </div>
    );
}
