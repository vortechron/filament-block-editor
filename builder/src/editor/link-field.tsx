import { useId } from 'react';
import { linkOrReference } from '@/blocks/button-url';
import { useT } from '@/lib/i18n';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { DynamicPicker, DynamicRefChip, isDynamicRef } from './dynamic-picker';

/**
 * A link: typed (https://, #, /, mailto:, tel:), or one of the site's own
 * links picked from "Shop links" and stored as `@key`, which then shows by
 * its label. Used by the button and by own blocks' link fields.
 */
export function LinkField({
    label,
    hint,
    value,
    onChange,
}: {
    label: string;
    hint?: string;
    value: string;
    onChange: (value: string) => void;
}) {
    const t = useT();
    const id = useId();
    const isBroken = value.trim() !== '' && linkOrReference(value) === null;

    return (
        <div className="grid grid-cols-1 content-start gap-1.5">
            <div className="flex min-h-7 items-center justify-between gap-2">
                <Label htmlFor={id}>{label}</Label>
                <DynamicPicker type="link" onPick={onChange} />
            </div>
            {isDynamicRef(value) ? (
                <DynamicRefChip
                    label={label}
                    value={value}
                    clearLabel={t('Remove shop link')}
                    onClear={() => onChange('')}
                />
            ) : (
                <Input
                    id={id}
                    value={value}
                    inputMode="url"
                    placeholder="https://"
                    aria-invalid={isBroken ? true : undefined}
                    className="bg-card"
                    onChange={(event) => onChange(event.target.value)}
                />
            )}
            {isBroken ? (
                <p role="alert" className="text-destructive text-xs">
                    {t('This link will not work. Use https://, #, /, mailto: or tel:.')}
                </p>
            ) : (
                !isDynamicRef(value) && (
                    <p className="text-muted-foreground text-xs">
                        {hint ?? t('A web address, #link-name, /path, mailto: or tel:')}
                    </p>
                )
            )}
        </div>
    );
}
