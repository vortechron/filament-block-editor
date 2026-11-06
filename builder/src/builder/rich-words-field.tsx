import { useT } from '@/lib/i18n';
import { lazy, Suspense, useId, useState } from 'react';
import { isPlainWords } from '@/lib/new-item-words';
import { richContent } from '@/lib/rich-text';
import { Textarea } from '@/ui/textarea';
import { Input } from '@/ui/input';
import { Skeleton } from '@/ui/skeleton';

const InlineWordsEditor = lazy(() => import('@/editor/inline-words-editor'));

/** Plain words keep their familiar box. Marked words use the complete inline editor. */
export function RichWordsField({
    label,
    value,
    multiline,
    onChange,
}: {
    label: string;
    value: string;
    multiline: boolean;
    onChange: (value: string) => void;
}) {
    const id = useId();
    const [formatting, setFormatting] = useState(false);
    const t = useT();
    let content;
    try {
        content = richContent(value);
    } catch (error) {
        return (
            <p role="alert">
                {t(
                    error instanceof Error
                        ? error.message
                        : 'Rich words contain invalid inline data. Reload the field and try again.',
                )}
            </p>
        );
    }
    const plain = isPlainWords(content);
    const text = content
        .map((item) => (item.type === 'text' ? item.text : ''))
        .join('');
    const change = (text: string) =>
        onChange(
            JSON.stringify({
                version: 1,
                content:
                    text === '' ? [] : [{ type: 'text', text, styles: {} }],
            }),
        );
    return (
        <div className="grid gap-2">
            <label htmlFor={id} className="text-foreground text-sm font-medium">
                {label}
            </label>
            {plain && !formatting ? (
                multiline ? (
                    <Textarea
                        id={id}
                        rows={4}
                        value={text}
                        onChange={(event) => change(event.target.value)}
                        className="bg-card"
                    />
                ) : (
                    <Input
                        id={id}
                        value={text}
                        onChange={(event) => change(event.target.value)}
                        className="bg-card"
                    />
                )
            ) : (
                <Suspense fallback={<Skeleton className="h-24" />}>
                    <InlineWordsEditor
                        label={label}
                        value={value}
                        onChange={onChange}
                    />
                </Suspense>
            )}
            {plain && !formatting && (
                <button
                    type="button"
                    onClick={() => setFormatting(true)}
                    className="justify-self-start text-xs underline underline-offset-4"
                >
                    {t('Format words')}
                </button>
            )}
        </div>
    );
}
