import { useMemo } from 'react';
import { safeSvg } from '@/lib/safe-svg';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/ui/select';

type IconOption = { value: string; label: string; svg?: string };

/** Radix keeps "" for "nothing picked", so an empty choice goes by this. */
const NONE = '__none__';

/** A select whose choices come with pictures (Field::icons()). */
export function hasIconPictures(options: IconOption[]): boolean {
    return options.some((option) => typeof option.svg === 'string');
}

/**
 * The icons of a select as a drop-down: each choice shows its picture on
 * the left and its name on the right, and so does the picked one, so the
 * owner sees each icon instead of guessing from its name.
 */
export function IconChoice({
    id,
    label,
    value,
    options,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    options: IconOption[];
    onChange: (value: string) => void;
}) {
    const pictures = useMemo(
        () => new Map(options.map((option) => [option.value, option.svg ? safeSvg(option.svg) : null])),
        [options],
    );
    const picked = options.find((option) => option.value === value);

    return (
        <Select value={value === '' ? NONE : value} onValueChange={(next) => onChange(next === NONE ? '' : next)}>
            <SelectTrigger id={id} aria-label={label}>
                <SelectValue>
                    {picked && <IconRow picture={pictures.get(picked.value) ?? null} label={picked.label} />}
                </SelectValue>
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option.value} value={option.value === '' ? NONE : option.value} text={option.label}>
                        <IconRow picture={pictures.get(option.value) ?? null} label={option.label} />
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}

/** A picture on the left, its name on the right. */
function IconRow({ picture, label }: { picture: string | null; label: string }) {
    return (
        <span className="flex min-w-0 items-center gap-2.5">
            {picture ? (
                <span
                    aria-hidden="true"
                    className="text-foreground grid size-5 shrink-0 place-items-center [&_svg]:size-full"
                    dangerouslySetInnerHTML={{ __html: picture }}
                />
            ) : (
                <span aria-hidden="true" className="size-5 shrink-0" />
            )}
            <span className="truncate">{label}</span>
        </span>
    );
}
