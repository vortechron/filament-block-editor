import { useMemo } from 'react';
import { safeSvg } from '@/lib/safe-svg';
import { cn } from '@/lib/utils';

type IconOption = { value: string; label: string; svg?: string };

/** Up to this many icons, each shows its name beside its picture. */
const NAMED = 4;

/** A select whose choices come with pictures (Field::icons()). */
export function hasIconPictures(options: IconOption[]): boolean {
    return options.some((option) => typeof option.svg === 'string');
}

/**
 * The icons of a select as pictures to tap, so the owner sees each icon
 * instead of its name. A few show their name beside the picture; many
 * show a grid, with the picked one's name under it.
 */
export function IconChoice({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: IconOption[];
    onChange: (value: string) => void;
}) {
    const pictures = useMemo(
        () => options.map((option) => (option.svg ? safeSvg(option.svg) : null)),
        [options],
    );
    const named = options.length <= NAMED;
    const picked = options.find((option) => option.value === value);

    return (
        <div className="grid gap-2">
            <div
                role="radiogroup"
                aria-label={label}
                className={cn('grid gap-1.5', named ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-6')}
            >
                {options.map((option, index) => {
                    const isPicked = option.value === value;
                    const picture = pictures[index];

                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={isPicked}
                            aria-label={option.label}
                            title={option.label}
                            onClick={() => onChange(option.value)}
                            className={cn(
                                'focus-visible:ring-ring/50 flex items-center rounded-md border transition-colors outline-none focus-visible:ring-[3px]',
                                named ? 'gap-2.5 px-3 py-2 text-left text-sm font-medium' : 'aspect-square justify-center',
                                isPicked
                                    ? 'border-foreground bg-secondary text-foreground'
                                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                            )}
                        >
                            {picture ? (
                                <span
                                    aria-hidden="true"
                                    className="grid size-5 shrink-0 place-items-center [&_svg]:size-full"
                                    dangerouslySetInnerHTML={{ __html: picture }}
                                />
                            ) : (
                                !named && <span className="truncate px-0.5 text-[10px]">{option.label}</span>
                            )}
                            {named && <span className="min-w-0 truncate">{option.label}</span>}
                        </button>
                    );
                })}
            </div>
            {!named && picked && (
                <p className="text-muted-foreground text-xs">{picked.label}</p>
            )}
        </div>
    );
}
