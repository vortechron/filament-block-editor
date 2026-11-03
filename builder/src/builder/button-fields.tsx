import { useT } from '@/lib/i18n';
import { LinkField } from '../editor/link-field';
import { SegmentedChoice } from '../editor/segmented-choice';
import { Group, TextField } from './item-fields';

/** The button's words, link (typed, or one of the shop's links) and look. */
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

    return (
        <div className="grid grid-cols-1 gap-4">
            <TextField
                label={t('Button text')}
                value={text}
                maxLength={80}
                onChange={(value) => onChange({ text: value })}
            />
            <LinkField
                label={t('Link')}
                value={url}
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
