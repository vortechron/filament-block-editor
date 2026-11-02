import {
    ArrowLeft,
    ArrowRight,
    ImagePlus,
    LoaderCircle,
    X,
} from 'lucide-react';
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { useT } from '@/lib/i18n';

/** The most photos a slideshow holds. Same limit as the PHP renderer. */
export const MAX_GALLERY_PHOTOS = 10;

/** BlockNote props hold only text, so the addresses are kept one per line. */
export function galleryUrls(images: string): string[] {
    return images
        .split('\n')
        .map((url) => url.trim())
        .filter((url) => url !== '');
}

/**
 * The photo slideshow in the editor: the photos in order, with buttons to
 * add, move and remove them. The public page draws it in
 * the gallery partial of resources/views.
 */
export function GalleryBlock({
    images,
    uploadFile,
    onAdd,
    onChange,
}: {
    images: string;
    uploadFile: ((file: File) => Promise<string | object>) | undefined;
    /** Adds to the photos the block has when the uploads finish. */
    onAdd: (urls: string[]) => void;
    onChange: (urls: string[]) => void;
}) {
    const t = useT();
    const inputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const urls = galleryUrls(images);
    const slotsLeft = MAX_GALLERY_PHOTOS - urls.length;

    async function addPhotos(event: ChangeEvent<HTMLInputElement>) {
        const files = Array.from(event.target.files ?? []).slice(0, slotsLeft);
        event.target.value = '';

        if (!uploadFile || files.length === 0) {
            return;
        }

        setIsUploading(true);
        setError(null);

        const added: string[] = [];

        try {
            for (const file of files) {
                const uploaded = await uploadFile(file);

                if (typeof uploaded === 'string') {
                    added.push(uploaded);
                }
            }
        } catch (uploadError) {
            setError(
                uploadError instanceof Error
                    ? uploadError.message
                    : t('A photo could not be uploaded. Please try again.'),
            );
        } finally {
            setIsUploading(false);
            onAdd(added);
        }
    }

    function move(index: number, step: number) {
        const next = [...urls];
        const [url] = next.splice(index, 1);
        next.splice(index + step, 0, url);
        onChange(next);
    }

    return (
        <div
            className="my-2 grid w-full gap-2 rounded-xl border border-dashed p-3"
            contentEditable={false}
        >
            {urls.length > 0 && (
                <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {urls.map((url, index) => (
                        <li
                            key={url}
                            className="group relative overflow-hidden rounded-lg border bg-slate-100"
                        >
                            <img
                                src={url}
                                alt=""
                                className="aspect-square w-full object-cover"
                            />
                            <div className="absolute inset-x-1 bottom-1 flex justify-between gap-1">
                                <PhotoButton
                                    label={t('Move photo left')}
                                    disabled={index === 0}
                                    onClick={() => move(index, -1)}
                                >
                                    <ArrowLeft className="size-3.5" />
                                </PhotoButton>
                                <PhotoButton
                                    label={t('Remove photo')}
                                    onClick={() =>
                                        onChange(
                                            urls.filter((_, i) => i !== index),
                                        )
                                    }
                                >
                                    <X className="size-3.5" />
                                </PhotoButton>
                                <PhotoButton
                                    label={t('Move photo right')}
                                    disabled={index === urls.length - 1}
                                    onClick={() => move(index, 1)}
                                >
                                    <ArrowRight className="size-3.5" />
                                </PhotoButton>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={addPhotos}
            />
            <button
                type="button"
                disabled={isUploading || slotsLeft === 0 || !uploadFile}
                onClick={() => inputRef.current?.click()}
                className="inline-flex items-center justify-center gap-2 rounded-lg border bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
                {isUploading ? (
                    <LoaderCircle className="size-4 animate-spin" />
                ) : (
                    <ImagePlus className="size-4" />
                )}
                {isUploading ? t('Uploading…') : t('Add photos')}
            </button>
            {error && (
                <p role="alert" className="text-destructive text-xs">
                    {error}
                </p>
            )}
            <p className="text-center text-xs text-slate-500">
                {t('Photo slideshow. Visitors swipe through the photos.')}{' '}
                {slotsLeft === 0
                    ? t('It is full at :max photos.', {
                          max: MAX_GALLERY_PHOTOS,
                      })
                    : t('Add up to :max photos.', {
                          max: MAX_GALLERY_PHOTOS,
                      })}
            </p>
        </div>
    );
}

function PhotoButton({
    label,
    disabled = false,
    onClick,
    children,
}: {
    label: string;
    disabled?: boolean;
    onClick: () => void;
    children: ReactNode;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            disabled={disabled}
            onClick={onClick}
            className="grid size-6 place-items-center rounded-full bg-white/90 text-slate-700 shadow-sm hover:bg-white disabled:invisible"
        >
            {children}
        </button>
    );
}
