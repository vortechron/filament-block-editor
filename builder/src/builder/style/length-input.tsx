import { useEffect, useRef, useState } from 'react';
import { useT } from '@/lib/i18n';
import { LENGTH_UNITS } from '@/lib/style-bag';
import { cn } from '@/lib/utils';

/** A unit, or no unit (a plain number), or the design kit's own value. */
type Unit = (typeof LENGTH_UNITS)[number] | 'none' | 'kit';

const PARTS = /^(-?\d*(?:\.\d*)?)(px|rem|em|%|vw|vh)?$/;

/** The number and unit in a stored value, like "24px" or "kit:radius". */
function split(value: string | null, fallbackUnit: Unit): { number: string; unit: Unit } {
    if (value === null) {
        return { number: '', unit: fallbackUnit };
    }

    if (value.startsWith('kit:')) {
        return { number: '', unit: 'kit' };
    }

    const match = PARTS.exec(value);

    if (!match) {
        return { number: '', unit: fallbackUnit };
    }

    return {
        number: match[1],
        unit: (match[2] as Unit | undefined) ?? (value === '0' ? fallbackUnit : 'none'),
    };
}

/**
 * A length as a number and a unit picker. It only reports a value the
 * style bag takes (`validate`); while the number is half typed, like
 * "1.", it is marked and kept here.
 */
export function LengthInput({
    id,
    label,
    value,
    placeholder,
    allowNegative,
    extraUnit,
    kitValue = 'kit:radius',
    validate,
    onChange,
}: {
    id: string;
    label: string;
    value: string | null;
    placeholder?: string;
    allowNegative?: boolean;
    /** "none" offers a plain number (line height); "kit" the kit's value. */
    extraUnit?: 'none' | 'kit';
    kitValue?: string;
    validate: (value: string) => string | null;
    onChange: (value: string | null) => void;
}) {
    const t = useT();
    const [typed, setTyped] = useState(() => split(value, 'px'));
    // The last value sent, so the value coming back does not reset typing.
    const sent = useRef<string | null>(value);

    useEffect(() => {
        if (value !== sent.current) {
            sent.current = value;
            setTyped((current) => split(value, current.unit === 'kit' ? 'px' : current.unit));
        }
    }, [value]);

    function report(number: string, unit: Unit) {
        setTyped({ number, unit });

        if (unit === 'kit') {
            sent.current = kitValue;
            onChange(kitValue);

            return;
        }

        if (number === '') {
            sent.current = null;
            onChange(null);

            return;
        }

        const clean = validate(unit === 'none' ? number : `${number}${unit}`);

        if (clean !== null) {
            sent.current = clean;
            onChange(clean);
        }
    }

    const composed =
        typed.unit === 'none' ? typed.number : `${typed.number}${typed.unit}`;
    const isInvalid =
        typed.unit !== 'kit' && typed.number !== '' && validate(composed) === null;
    const units: Unit[] = [...LENGTH_UNITS, ...(extraUnit ? [extraUnit] : [])];

    return (
        <div className="flex items-center gap-1.5">
            <input
                id={id}
                type="text"
                inputMode={allowNegative ? undefined : 'decimal'}
                autoComplete="off"
                value={typed.unit === 'kit' ? '' : typed.number}
                placeholder={typed.unit === 'kit' ? t('Theme') : placeholder}
                disabled={typed.unit === 'kit'}
                aria-invalid={isInvalid || undefined}
                onChange={(event) =>
                    report(
                        event.target.value.replace(',', '.').trim(),
                        typed.unit === 'kit' ? 'px' : typed.unit,
                    )
                }
                className={cn(
                    'border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 h-10 min-w-0 flex-1 rounded-md border px-3 text-sm tabular-nums outline-none focus-visible:ring-[3px] disabled:opacity-60',
                    isInvalid && 'border-destructive',
                )}
            />
            <select
                aria-label={t('Unit for :label', { label })}
                value={typed.unit}
                onChange={(event) => report(typed.number, event.target.value as Unit)}
                className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-[4.75rem] shrink-0 rounded-md border px-2 text-sm outline-none focus-visible:ring-[3px]"
            >
                {units.map((unit) => (
                    <option key={unit} value={unit}>
                        {unit === 'none' ? '×' : unit === 'kit' ? t('Theme') : unit}
                    </option>
                ))}
            </select>
        </div>
    );
}
