import { Component, type ReactNode } from 'react';
import { useT } from '@/lib/i18n';

function EditorFailedMessage() {
    const t = useT();

    return (
        <>
            {t(
                'This section’s editor did not open. Reload the page to try again. Your saved work is safe.',
            )}
        </>
    );
}

/**
 * Keeps the rest of the page editor working when the section editor fails
 * to load (a dropped connection) or cannot open the stored document.
 */
export class EditorErrorBoundary extends Component<
    { children: ReactNode },
    { hasFailed: boolean }
> {
    state = { hasFailed: false };

    static getDerivedStateFromError(): { hasFailed: boolean } {
        return { hasFailed: true };
    }

    render() {
        if (this.state.hasFailed) {
            return (
                <p
                    role="alert"
                    className="text-destructive m-4 rounded-lg border border-dashed p-4 text-sm"
                >
                    <EditorFailedMessage />
                </p>
            );
        }

        return this.props.children;
    }
}
