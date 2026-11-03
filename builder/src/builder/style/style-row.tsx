import { RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { useT } from '@/lib/i18n';

/**
 * One style control with its label. A dot marks a value that differs
 * from the laptop one (on the laptop: any value of its own), and Reset
 * takes this device's value out. Without a value of its own, the line
 * under it says which value shows instead.
 */
export function StyleRow({
    styleKey,
    label,
    labelId,
    controlId,
    isChanged,
    hasOwnValue,
    inherited,
    onReset,
    children,
}: {
    styleKey: string;
    label: string;
    labelId: string;
    /** The input the label belongs to. Left out for a group of swatches. */
    controlId?: string;
    isChanged: boolean;
    hasOwnValue: boolean;
    /** The value shown when this device has none, with where it comes from. */
    inherited: { from: string; value: string } | null;
    onReset: () => void;
    children: ReactNode;
}) {
    const t = useT();

    return (
        <div
            data-style-key={styleKey}
            data-changed={String(isChanged)}
            className="grid gap-1.5"
        >
            <div className="flex min-h-7 items-center gap-2">
                <label
                    id={labelId}
                    htmlFor={controlId}
                    className="text-foreground text-sm font-medium"
                >
                    {label}
                </label>
                {isChanged && (
                    <span
                        title={t('Changed here')}
                        className="size-2 shrink-0 rounded-full bg-[var(--builder-select)]"
                    />
                )}
                <span className="flex-1" />
                {hasOwnValue && (
                    <button
                        type="button"
                        aria-label={t('Reset :label', { label })}
                        title={t('Reset :label', { label })}
                        onClick={onReset}
                        className="text-muted-foreground hover:bg-muted hover:text-foreground grid size-8 place-items-center rounded-md"
                    >
                        <RotateCcw className="size-3.5" />
                    </button>
                )}
            </div>
            {children}
            {!hasOwnValue && inherited && (
                <p className="text-muted-foreground text-xs">
                    {t('From :device: :value', {
                        device: inherited.from,
                        value: inherited.value,
                    })}
                </p>
            )}
        </div>
    );
}
