import type { ReactNode } from 'react';

/** A titled part of the design panel. */
export function KitSection({
    title,
    hint,
    children,
}: {
    title: string;
    hint?: string;
    children: ReactNode;
}) {
    return (
        <section className="bg-card grid gap-3 rounded-xl border p-3">
            <div className="grid gap-0.5">
                <h3 className="text-foreground text-sm font-semibold">{title}</h3>
                {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
            </div>
            {children}
        </section>
    );
}

/** A label over its control, inside a KitSection. */
export function KitField({
    label,
    htmlFor,
    children,
}: {
    label: string;
    htmlFor?: string;
    children: ReactNode;
}) {
    return (
        <div className="grid gap-1.5">
            <label htmlFor={htmlFor} className="text-sm font-medium">
                {label}
            </label>
            {children}
        </div>
    );
}
