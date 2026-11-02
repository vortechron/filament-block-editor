import { useId, type ReactNode } from 'react';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { Switch } from '@/ui/switch';
import { Textarea } from '@/ui/textarea';
import { cn } from '@/lib/utils';

type FieldProps = {
    label: string;
    htmlFor: string;
    hint?: ReactNode;
    error?: string;
    counter?: ReactNode;
    children: ReactNode;
    className?: string;
};

/**
 * A label, the input, an optional hint and the error from the server.
 */
export function Field({
    label,
    htmlFor,
    hint,
    error,
    counter,
    children,
    className,
}: FieldProps) {
    return (
        <div
            className={cn('grid grid-cols-1 content-start gap-1.5', className)}
        >
            <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={htmlFor}>{label}</Label>
                {counter}
            </div>
            {children}
            {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
            {error && (
                <p role="alert" className="text-destructive text-xs">
                    {error}
                </p>
            )}
        </div>
    );
}

/**
 * "120/200". It stays hidden until the text is close to the limit, unless
 * `always` is set.
 */
export function CharCounter({
    length,
    limit,
    always = false,
}: {
    length: number;
    limit: number;
    always?: boolean;
}) {
    if (!always && length < limit * 0.7) {
        return null;
    }

    return (
        <span
            className={cn(
                'text-muted-foreground text-xs tabular-nums',
                length >= limit * 0.9 && 'text-warning',
                length >= limit && 'text-destructive',
            )}
        >
            {length}/{limit}
        </span>
    );
}

type TextFieldProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
    limit?: number;
    hint?: ReactNode;
    error?: string;
    placeholder?: string;
    alwaysShowCounter?: boolean;
    className?: string;
};

export function TextField({
    label,
    value,
    onChange,
    limit,
    hint,
    error,
    placeholder,
    alwaysShowCounter,
    className,
}: TextFieldProps) {
    const id = useId();

    return (
        <Field
            label={label}
            htmlFor={id}
            hint={hint}
            error={error}
            className={className}
            counter={
                limit && (
                    <CharCounter
                        length={value.length}
                        limit={limit}
                        always={alwaysShowCounter}
                    />
                )
            }
        >
            <Input
                id={id}
                value={value}
                maxLength={limit}
                placeholder={placeholder}
                aria-invalid={error ? true : undefined}
                onChange={(event) => onChange(event.target.value)}
            />
        </Field>
    );
}

export function TextAreaField({
    label,
    value,
    onChange,
    limit,
    hint,
    error,
    placeholder,
    alwaysShowCounter,
    className,
}: TextFieldProps) {
    const id = useId();

    return (
        <Field
            label={label}
            htmlFor={id}
            hint={hint}
            error={error}
            className={className}
            counter={
                limit && (
                    <CharCounter
                        length={value.length}
                        limit={limit}
                        always={alwaysShowCounter}
                    />
                )
            }
        >
            <Textarea
                id={id}
                value={value}
                maxLength={limit}
                placeholder={placeholder}
                aria-invalid={error ? true : undefined}
                onChange={(event) => onChange(event.target.value)}
            />
        </Field>
    );
}

/**
 * A switch with a title and one line that explains it.
 */
export function SwitchRow({
    label,
    description,
    checked,
    onCheckedChange,
    disabled,
}: {
    label: string;
    description?: ReactNode;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
}) {
    const id = useId();

    return (
        <div className="flex items-start justify-between gap-4">
            <div className="grid grid-cols-1 gap-1">
                <Label htmlFor={id}>{label}</Label>
                {description && (
                    <p className="text-muted-foreground text-xs">
                        {description}
                    </p>
                )}
            </div>
            <Switch
                id={id}
                checked={checked}
                disabled={disabled}
                onCheckedChange={onCheckedChange}
            />
        </div>
    );
}
