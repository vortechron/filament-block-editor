import { ImagePlus, LoaderCircle, Trash2 } from 'lucide-react';
import { type ChangeEvent, useId, useRef, useState } from 'react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { Button } from '@/ui/button';
import { Label } from '@/ui/label';

/**
 * Pick a photo, upload it through the host's adapter, and hand back its
 * URL, which the page value keeps.
 */
export function ImageField({
    label,
    url,
    hint,
    onChange,
}: {
    label: string;
    url: string | null;
    hint?: string;
    onChange: (url: string | null) => void;
}) {
    const t = useT();
    const { upload } = useHost();
    const inputId = useId();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [problem, setProblem] = useState<string | null>(null);

    async function pick(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];
        event.target.value = '';

        if (!file) {
            return;
        }

        setProblem(null);
        setIsUploading(true);

        try {
            onChange(await upload(file, 'image'));
        } catch (error) {
            setProblem(
                error instanceof Error && error.message !== ''
                    ? error.message
                    : t('The upload did not work. Please try again.'),
            );
        } finally {
            setIsUploading(false);
        }
    }

    return (
        <div className="grid grid-cols-1 gap-1.5">
            <Label htmlFor={inputId}>{label}</Label>
            <div className="flex items-center gap-3">
                <div className="bg-secondary text-muted-foreground flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-md border">
                    {url ? (
                        <img
                            src={url}
                            alt=""
                            className="size-full object-cover"
                        />
                    ) : (
                        <ImagePlus className="size-6" />
                    )}
                </div>
                <div className="grid grid-cols-1 gap-2">
                    <div className="flex flex-wrap gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isUploading}
                            onClick={() => inputRef.current?.click()}
                        >
                            {isUploading ? (
                                <LoaderCircle className="animate-spin" />
                            ) : (
                                <ImagePlus />
                            )}
                            {url ? t('Change photo') : t('Add photo')}
                        </Button>
                        {url && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={isUploading}
                                onClick={() => onChange(null)}
                            >
                                <Trash2 />
                                {t('Remove image')}
                            </Button>
                        )}
                    </div>
                    {hint && (
                        <p className="text-muted-foreground text-xs">{hint}</p>
                    )}
                </div>
            </div>
            <input
                ref={inputRef}
                id={inputId}
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isUploading}
                onChange={(event) => void pick(event)}
            />
            {problem && (
                <p role="alert" className="text-destructive text-xs">
                    {problem}
                </p>
            )}
        </div>
    );
}
