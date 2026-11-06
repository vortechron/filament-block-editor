import { type ReactNode, useId } from 'react';
import { LocalizedText } from './field-language';
import { Input } from '@/ui/input';

/**
 * Small parts the item panel's settings share: a titled group, a grey
 * note, and a text box with a hint and an error.
 */

/** A prop as text, for a field. Anything that is not text or a number is left out. */
export function propText(value: unknown, fallback: string): string {
    if (typeof value === 'string') {
        return value;
    }

    return typeof value === 'number' ? String(value) : fallback;
}

export function Group({
    label,
    hint,
    children,
}: {
    label: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <p className="text-foreground text-sm font-medium">{label}</p>
            {children}
            {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
    );
}

export function InfoCard({
    children,
    action,
}: {
    children: ReactNode;
    action?: ReactNode;
}) {
    return (
        <div className="bg-muted/60 text-muted-foreground grid gap-2 rounded-xl p-3 text-sm leading-relaxed">
            <p>{children}</p>
            {action}
        </div>
    );
}

export function TextField({
    label,
    hint,
    error,
    value,
    placeholder,
    maxLength,
    onChange,
    translationPath,
}: {
    translationPath?: string;
    label: string;
    hint?: string;
    error?: string;
    value: string;
    placeholder?: string;
    maxLength?: number;
    onChange: (value: string) => void;
}) {
    const id = useId();
    if (translationPath) {
        return (
            <LocalizedText
                path={translationPath}
                label={label}
                value={value}
                onChange={onChange}
            >
                {(text, change) => (
                    <TextField
                        label={label}
                        hint={hint}
                        error={error}
                        value={text}
                        placeholder={placeholder}
                        maxLength={maxLength}
                        onChange={change}
                    />
                )}
            </LocalizedText>
        );
    }

    return (
        <div className="grid gap-2">
            <label htmlFor={id} className="text-foreground text-sm font-medium">
                {label}
            </label>
            <Input
                id={id}
                value={value}
                placeholder={placeholder}
                maxLength={maxLength}
                aria-invalid={error ? true : undefined}
                onChange={(event) => onChange(event.target.value)}
                className="bg-card"
            />
            {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
            {error && (
                <p role="alert" className="text-destructive text-xs">
                    {error}
                </p>
            )}
        </div>
    );
}
