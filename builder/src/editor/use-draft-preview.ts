import { useEffect, useRef, useState } from 'react';
import { useHost } from '@/lib/host';
import { normalizeValue } from '@/lib/page-value';
import type { Kit, PageValue, PreviewExtra, SiteInfo } from '@/types';

/** Wait this long after the last key press before asking for a new preview. */
const TYPING_PAUSE_MS = 450;

export type DraftPreview = {
    /** The page HTML. Null until the first preview arrives. */
    html: string | null;
    isUpdating: boolean;
    /** The last update failed, so the preview shows an older version. */
    isStale: boolean;
};

export type DraftExtras = {
    /** The design kit as JSON, with changes not saved yet, or null. */
    kit?: string | null;
    /** The shop info form's values as JSON, with changes not saved yet, or null. */
    siteInfo?: string | null;
    siteInfoTranslations?: string | null;
    /** Asks again when it goes up, though nothing in the page changed. */
    reloads?: number;
};

/**
 * Asks the host to draw the builder's unsaved page value and returns the
 * page HTML. A new request starts when the user stops typing; the answer
 * to an older request is thrown away. Nothing is saved.
 *
 * `draft` is the page value as a JSON string, so a new request only
 * starts when something in it really changed. The same goes for `kit`,
 * the design kit, and `siteInfo`, the shop info, which are sent along so
 * their unsaved changes show, and for `reloads`, raised when something
 * outside the page changed (the shop info was saved).
 */
export function useDraftPreview(
    draft: string,
    {
        kit = null,
        siteInfo = null,
        siteInfoTranslations = null,
        reloads = 0,
    }: DraftExtras = {},
): DraftPreview {
    const { adapter, fieldLanguages, previewLocale } = useHost();
    const selectedLocale = fieldLanguages ? previewLocale : undefined;
    const [html, setHtml] = useState<string | null>(null);
    const [isUpdating, setIsUpdating] = useState(true);
    const [isStale, setIsStale] = useState(false);
    const hasPreview = useRef(false);

    useEffect(() => {
        let isCurrent = true;
        const timer = window.setTimeout(
            () => {
                setIsUpdating(true);

                Promise.resolve()
                    .then(() => {
                        const value = normalizeValue(
                            JSON.parse(draft) as PageValue,
                        );
                        const extra = previewExtra(kit, siteInfo);
                        const localizedExtra =
                            selectedLocale || siteInfoTranslations
                                ? {
                                      ...extra,
                                      ...(selectedLocale
                                          ? { contentLocale: selectedLocale }
                                          : {}),
                                      ...(siteInfoTranslations
                                          ? {
                                                siteInfoTranslations:
                                                    JSON.parse(
                                                        siteInfoTranslations,
                                                    ) as NonNullable<
                                                        SiteInfo['translations']
                                                    >,
                                            }
                                          : {}),
                                  }
                                : extra;

                        return localizedExtra === null
                            ? adapter.preview(value)
                            : adapter.preview(value, localizedExtra);
                    })
                    .then((page) => {
                        if (!isCurrent) {
                            return;
                        }

                        if (typeof page !== 'string') {
                            throw new Error('The preview is not HTML.');
                        }

                        hasPreview.current = true;
                        setHtml(page);
                        setIsStale(false);
                        setIsUpdating(false);
                    })
                    .catch(() => {
                        if (!isCurrent) {
                            return;
                        }

                        // A half-typed value, like a colour code, may fail
                        // the host's checks. Keep the last good preview.
                        setIsStale(true);
                        setIsUpdating(false);
                    });
            },
            hasPreview.current ? TYPING_PAUSE_MS : 0,
        );

        return () => {
            isCurrent = false;
            window.clearTimeout(timer);
        };
    }, [
        adapter,
        draft,
        kit,
        siteInfo,
        reloads,
        selectedLocale,
        siteInfoTranslations,
    ]);

    return { html, isUpdating, isStale };
}

/** The unsaved kit and shop info for the preview, or null with neither. */
function previewExtra(
    kit: string | null,
    siteInfo: string | null,
): PreviewExtra | null {
    if (kit === null && siteInfo === null) {
        return null;
    }

    return {
        ...(kit === null ? {} : { kit: JSON.parse(kit) as Kit }),
        ...(siteInfo === null
            ? {}
            : { siteInfo: JSON.parse(siteInfo) as SiteInfo['values'] }),
    };
}
