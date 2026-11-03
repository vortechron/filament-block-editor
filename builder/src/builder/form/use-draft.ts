import { useState } from 'react';

/**
 * Text being typed into a box whose stored value is stricter than the
 * text, like an email address or a list of choices. The box keeps what is
 * typed; `commit` gets the value whenever the text reads as a good one.
 * When the stored value changes from elsewhere, the box shows it.
 */
export function useDraft<T>({
    value,
    format,
    parse,
    commit,
}: {
    value: T;
    format: (value: T) => string;
    /** The value the text stands for, or null while it is not a good one. */
    parse: (text: string) => T | null;
    commit: (value: T) => void;
}): { text: string; setText: (text: string) => void; isInvalid: boolean } {
    const [text, setTextState] = useState(() => format(value));
    const [shown, setShown] = useState(value);

    if (!same(shown, value)) {
        setShown(value);

        const typed = parse(text);

        if (typed === null || !same(typed, value)) {
            setTextState(format(value));
        }
    }

    function setText(next: string) {
        setTextState(next);

        const parsed = parse(next);

        if (parsed !== null && !same(parsed, value)) {
            commit(parsed);
        }
    }

    return { text, setText, isInvalid: parse(text) === null };
}

function same(a: unknown, b: unknown): boolean {
    return JSON.stringify(a) === JSON.stringify(b);
}
