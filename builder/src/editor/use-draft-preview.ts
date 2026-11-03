import { useEffect, useRef, useState } from 'react';
import { useHost } from '@/lib/host';
import { normalizeValue } from '@/lib/page-value';
import type { Kit, PageValue } from '@/types';

/** Wait this long after the last key press before asking for a new preview. */
const TYPING_PAUSE_MS = 450;

export type DraftPreview = {
    /** The page HTML. Null until the first preview arrives. */
    html: string | null;
    isUpdating: boolean;
    /** The last update failed, so the preview shows an older version. */
    isStale: boolean;
};

/**
 * Asks the host to draw the builder's unsaved page value and returns the
 * page HTML. A new request starts when the user stops typing; the answer
 * to an older request is thrown away. Nothing is saved.
 *
 * `draft` is the page value as a JSON string, so a new request only
 * starts when something in it really changed. The same goes for `kit`,
 * the design kit, which is sent along so its unsaved changes show.
 */
export function useDraftPreview(
    draft: string,
    /** The design kit as JSON, with changes not saved yet, or null. */
    kit: string | null = null,
): DraftPreview {
    const { adapter } = useHost();
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

                        return kit === null
                            ? adapter.preview(value)
                            : adapter.preview(value, {
                                  kit: JSON.parse(kit) as Kit,
                              });
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
    }, [adapter, draft, kit]);

    return { html, isUpdating, isStale };
}
