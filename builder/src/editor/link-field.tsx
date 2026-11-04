import { useId } from 'react';
import { linkOrReference } from '@/blocks/button-url';
import { dynamicRef } from '@/lib/dynamic-values';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { pageOfUrl } from '@/lib/page-links';
import { Input } from '@/ui/input';
import { Label } from '@/ui/label';
import { DynamicRefChip, isDynamicRef } from './dynamic-picker';
import { DynamicValuePicker } from './dynamic-value-picker';

/**
 * A link: typed (https://, #, /, mailto:, tel:), or one of the site's own
 * links picked from "Shop links" and stored as `@key`, which then shows by
 * its label. When the host has pages, the same picker lists them first
 * ("Pages and links") and stores the page's plain url. Used by the button and by own blocks' link fields.
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
    const { pages } = useHost();
    const page = pageOfUrl(pages, value);
    const isBroken = value.trim() !== '' && linkOrReference(value) === null;

    return (
        <div className="grid grid-cols-1 content-start gap-1.5">
            <div className="flex min-h-7 items-center justify-between gap-2">
                <Label htmlFor={id}>{label}</Label>
                <DynamicValuePicker
                    type="link"
                    label={pages.length > 0 ? t('Pages and links') : t('Shop links')}
                    onPick={(key) => onChange(dynamicRef(key))}
                    pages={pages}
                    onPickPage={onChange}
                />
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
                        {page
                            ? t('Page: :title', { title: page.title })
                            : (hint ?? t('A web address, #link-name, /path, mailto: or tel:'))}
                    </p>
                )
            )}
        </div>
    );
}
