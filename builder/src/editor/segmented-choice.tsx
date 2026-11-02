import { cn } from '@/lib/utils';

type Option<T extends string> = { value: T; label: string };

/**
 * Two or three big buttons where exactly one is chosen. Easier to tap on
 * a phone than a drop-down.
 */
export function SegmentedChoice<T extends string>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: T;
    options: Option<T>[];
    onChange: (value: T) => void;
}) {
    return (
        <div role="radiogroup" aria-label={label} className="flex gap-2">
            {options.map((option) => (
                <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={value === option.value}
                    onClick={() => onChange(option.value)}
                    className={cn(
                        'focus-visible:ring-ring/50 flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors outline-none focus-visible:ring-[3px]',
                        value === option.value
                            ? 'border-foreground bg-secondary text-foreground'
                            : 'text-muted-foreground hover:bg-secondary/60',
                    )}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
}
