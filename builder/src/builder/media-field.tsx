import { ImageUp, LoaderCircle } from 'lucide-react';
import { type ChangeEvent, useId, useRef, useState } from 'react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { Input } from '@/ui/input';
import { DynamicPicker, DynamicRefChip, isDynamicRef } from '../editor/dynamic-picker';

/**
 * The photo of a photo item: pick one and it uploads through the host,
 * then shows on the page right away. Or pick one of the shop's pictures,
 * stored as `@key`. Works while the section's words are out
 * of sight, so a tap on an empty photo spot on the page leads straight
 * here.
 */
export function PhotoField({
    url,
    onChange,
}: {
    url: string;
    onChange: (url: string) => void;
}) {
    const t = useT();
    const { upload } = useHost();
    const input = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);

    async function pick(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) {
            return;
        }

        setIsUploading(true);
        setProblem(null);

        try {
            onChange(await upload(file, 'image'));
        } catch (error) {
            setProblem(
                error instanceof Error && error.message
                    ? error.message
                    : t('That photo could not be uploaded. Please try again.'),
            );
        } finally {
            setIsUploading(false);
        }
    }

    if (isDynamicRef(url)) {
        return (
            <DynamicRefChip
                label={t('Photo')}
                value={url}
                clearLabel={t('Remove shop picture')}
                onClear={() => onChange('')}
            />
        );
    }

    return (
        <div className="grid gap-2">
            <div className="flex justify-end empty:hidden">
                <DynamicPicker type="image" onPick={onChange} />
            </div>
            <input
                ref={input}
                type="file"
                accept="image/*"
                className="sr-only"
                tabIndex={-1}
                aria-hidden="true"
                onChange={pick}
            />
            <button
                type="button"
                disabled={isUploading}
                onClick={() => input.current?.click()}
                className="bg-card flex h-10 items-center justify-center gap-2 rounded-lg border text-sm font-medium hover:border-[var(--builder-select)] hover:text-[var(--builder-select)] disabled:opacity-60"
            >
                {isUploading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                ) : (
                    <ImageUp className="size-4" />
                )}
                {isUploading
                    ? t('Uploading…')
                    : url
                      ? t('Change photo')
                      : t('Add photo')}
            </button>
            {problem && (
                <p role="alert" className="text-destructive text-xs">
                    {problem}
                </p>
            )}
        </div>
    );
}

/** The link of a video item. */
export function VideoField({
    url,
    onChange,
}: {
    url: string;
    onChange: (url: string) => void;
}) {
    const t = useT();
    const id = useId();

    return (
        <div className="grid gap-2">
            <label htmlFor={id} className="text-foreground text-sm font-medium">
                {t('Video link')}
            </label>
            <Input
                id={id}
                type="url"
                inputMode="url"
                value={url}
                placeholder="https://youtu.be/…"
                onChange={(event) => onChange(event.target.value.trim())}
                className="bg-card"
            />
            <p className="text-muted-foreground text-xs">
                {t('Paste a YouTube, Vimeo or Loom link.')}
            </p>
        </div>
    );
}
