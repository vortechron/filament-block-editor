import { safeButtonUrl } from '@/blocks/button-url';
import { useT } from '@/lib/i18n';
import { SegmentedChoice } from '../editor/segmented-choice';
import { Group, TextField } from './item-fields';

/** The button's words, link and look. */
export function ButtonFields({
    text,
    url,
    variant,
    onChange,
}: {
    text: string;
    url: string;
    variant: string;
    onChange: (props: Record<string, unknown>) => void;
}) {
    const t = useT();
    const isBroken = url.trim() !== '' && safeButtonUrl(url) === null;

    return (
        <div className="grid grid-cols-1 gap-4">
            <TextField
                label={t('Button text')}
                value={text}
                maxLength={80}
                onChange={(value) => onChange({ text: value })}
            />
            <TextField
                label={t('Link')}
                hint={
                    isBroken
                        ? undefined
                        : t('A web address, #link-name, /path, mailto: or tel:')
                }
                error={
                    isBroken
                        ? t('This link will not work. Use https://, #, /, mailto: or tel:.')
                        : undefined
                }
                value={url}
                placeholder="https://"
                onChange={(value) => onChange({ url: value })}
            />
            <Group label={t('Look')}>
                <SegmentedChoice
                    label={t('Look')}
                    value={variant === 'outline' ? 'outline' : 'solid'}
                    options={[
                        { value: 'solid', label: t('Solid') },
                        { value: 'outline', label: t('Outline') },
                    ]}
                    onChange={(value) => onChange({ variant: value })}
                />
            </Group>
        </div>
    );
}
