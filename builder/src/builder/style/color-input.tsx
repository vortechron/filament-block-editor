import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useT } from '@/lib/i18n';
import type { KitColorChoice } from '@/lib/kit';
import { cleanColor } from '@/lib/style-bag';
import { cn } from '@/lib/utils';

const TRANSPARENT_SWATCH =
    'repeating-conic-gradient(#e2e8f0 0% 25%, #ffffff 0% 50%) 50% / 10px 10px';

/**
 * A colour: the kit's colours first (stored as `kit:<key>`, so they follow
 * the kit), then see-through, then any colour code.
 */
export function ColorInput({
    labelId,
    value,
    choices,
    onChange,
}: {
    labelId: string;
    value: string | null;
    choices: KitColorChoice[];
    onChange: (value: string | null) => void;
}) {
    const t = useT();
    const hex = value !== null && value.startsWith('#') ? value : '';
    const [code, setCode] = useState(hex);

    useEffect(() => setCode(hex), [hex]);

    return (
        <div className="grid gap-2">
            <div
                role="radiogroup"
                aria-labelledby={labelId}
                className="flex flex-wrap gap-1.5"
            >
                {choices.map((choice) => {
                    const stored = `kit:${choice.key}`;
                    const name = choice.fixed ? t(choice.label) : choice.label;

                    return (
                        <Swatch
                            key={choice.key}
                            name={name}
                            background={choice.value}
                            isChosen={value === stored}
                            onPick={() => onChange(stored)}
                        />
                    );
                })}
                <Swatch
                    name={t('See-through')}
                    background={TRANSPARENT_SWATCH}
                    isChosen={value === 'transparent'}
                    onPick={() => onChange('transparent')}
                />
            </div>
            <div className="flex items-center gap-2">
                <input
                    type="color"
                    value={/^#[0-9a-f]{6}$/.test(hex) ? hex : '#ffffff'}
                    aria-label={t('Pick your own colour')}
                    className="border-input h-10 w-12 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
                    onChange={(event) => onChange(event.target.value.toLowerCase())}
                />
                <input
                    type="text"
                    value={code}
                    maxLength={9}
                    placeholder="#0f172a"
                    aria-label={t('Colour code')}
                    autoComplete="off"
                    spellCheck={false}
                    onChange={(event) => {
                        const next = event.target.value.trim();
                        const clean = cleanColor(next);

                        setCode(next);

                        if (next === '') {
                            onChange(null);
                        } else if (clean !== null && clean.startsWith('#')) {
                            onChange(clean);
                        }
                    }}
                    className="border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-32 rounded-md border px-3 font-mono text-sm outline-none focus-visible:ring-[3px]"
                />
            </div>
        </div>
    );
}

function Swatch({
    name,
    background,
    isChosen,
    onPick,
}: {
    name: string;
    background: string;
    isChosen: boolean;
    onPick: () => void;
}) {
    return (
        <button
            type="button"
            role="radio"
            aria-checked={isChosen}
            aria-label={name}
            title={name}
            onClick={onPick}
            className={cn(
                'focus-visible:ring-ring/50 grid size-9 place-items-center rounded-full border ring-offset-2 transition outline-none focus-visible:ring-[3px]',
                isChosen && 'ring-foreground ring-2',
            )}
            style={{ background }}
        >
            {isChosen && (
                <Check className="size-4 text-slate-500 mix-blend-difference" />
            )}
        </button>
    );
}
