import type { PageBuilderAdapter, UploadKind } from '@/types';
import type { Translate } from './i18n';

/** What kind of upload a file is, for the adapter. */
export function uploadKindOf(file: File): UploadKind {
    if (file.type.startsWith('image/')) {
        return 'image';
    }

    return file.type.startsWith('video/') ? 'video' : 'file';
}

/** The page value keeps URLs only: http(s), or a path on the same site. */
export function isMediaUrl(url: unknown): url is string {
    return (
        typeof url === 'string' &&
        (/^https?:\/\/\S+$/i.test(url) || /^\/(?!\/)\S*$/.test(url))
    );
}

/**
 * Uploads a file through the host's adapter and resolves to its URL.
 * With a `kind`, a file of another kind is refused before it is sent.
 */
export function uploadWith(adapter: PageBuilderAdapter, t: Translate) {
    return async (file: File, kind?: UploadKind): Promise<string> => {
        const fileKind = uploadKindOf(file);

        if (kind === 'image' && fileKind !== 'image') {
            throw new Error(t('Please choose a photo.'));
        }

        if (kind === 'video' && fileKind !== 'video') {
            throw new Error(t('Please choose a video file.'));
        }

        let result: { url?: unknown } | null | undefined;

        try {
            result = await adapter.upload(file, kind ?? fileKind);
        } catch (error) {
            throw new Error(
                error instanceof Error && error.message !== ''
                    ? error.message
                    : t('The upload did not work. Please try again.'),
            );
        }

        if (!isMediaUrl(result?.url)) {
            throw new Error(t('The upload did not work. Please try again.'));
        }

        return result.url;
    };
}
