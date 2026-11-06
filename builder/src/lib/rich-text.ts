import { linkOrReference } from '@/blocks/button-url';

export type InlineWords = Array<
    | { type: 'text'; text: string; styles: Record<string, boolean | string> }
    | { type: 'link'; href: string; content: InlineWords }
    | { type: 'dynamic'; props: { key: string } }
>;
const invalid = () =>
    new Error(
        'Rich words contain invalid inline data. Reload the field and try again.',
    );
const object = (value: unknown): value is Record<string, unknown> =>
    !!value && typeof value === 'object' && !Array.isArray(value);
const only = (value: Record<string, unknown>, keys: string[]) => {
    if (
        Object.keys(value).some(
            (key) => value[key] !== undefined && !keys.includes(key),
        )
    )
        throw invalid();
};

export function inlineWords(raw: unknown, inLink = false): InlineWords {
    if (typeof raw === 'string')
        return raw === '' ? [] : [{ type: 'text', text: raw, styles: {} }];
    if (raw === undefined || raw === null) return [];
    if (!Array.isArray(raw) || raw.length > 2000) throw invalid();
    return raw.map((item: unknown) => {
        if (!object(item)) throw invalid();
        if (item.type === 'text') {
            only(item, ['type', 'text', 'styles']);
            if (
                typeof item.text !== 'string' ||
                (item.styles !== undefined && !object(item.styles))
            )
                throw invalid();
            const styles: Record<string, boolean | string> = {};
            for (const [key, value] of Object.entries(item.styles ?? {})) {
                if (
                    ['bold', 'italic', 'underline', 'strike', 'code'].includes(
                        key,
                    ) &&
                    typeof value === 'boolean'
                )
                    styles[key] = value;
                else if (
                    ['textColor', 'backgroundColor', 'fontFamily'].includes(
                        key,
                    ) &&
                    typeof value === 'string' &&
                    value.length <= 200
                )
                    styles[key] = value;
                else throw invalid();
            }
            return { type: 'text', text: item.text, styles };
        }
        if (item.type === 'link') {
            only(item, ['type', 'href', 'content']);
            if (
                inLink ||
                typeof item.href !== 'string' ||
                !linkOrReference(item.href)
            )
                throw invalid();
            return {
                type: 'link',
                href: item.href,
                content: inlineWords(item.content, true),
            };
        }
        if (item.type === 'dynamic') {
            only(item, ['type', 'props']);
            if (
                !object(item.props) ||
                typeof item.props.key !== 'string' ||
                !/^[a-z][a-z0-9_]*(?:\.[a-z0-9_]+){1,3}$/.test(item.props.key)
            )
                throw invalid();
            only(item.props, ['key']);
            return { type: 'dynamic', props: { key: item.props.key } };
        }
        throw invalid();
    });
}

export function richValue(content: unknown): string {
    const value = JSON.stringify({ version: 1, content: inlineWords(content) });
    if (new TextEncoder().encode(value).length > 100000)
        throw new Error(
            'Rich words are too large. Shorten this field before saving.',
        );
    return value;
}

export function richContent(value: string): InlineWords {
    if (new TextEncoder().encode(value).length > 100000)
        throw new Error(
            'Rich words are too large. Shorten this field before saving.',
        );
    let decoded: unknown;
    try {
        decoded = JSON.parse(value);
    } catch {
        throw new Error(
            'Rich words are not valid JSON. Reload the field and try again.',
        );
    }
    if (
        !object(decoded) ||
        decoded.version !== 1 ||
        !Array.isArray(decoded.content)
    )
        throw invalid();
    only(decoded, ['version', 'content']);
    return inlineWords(decoded.content);
}
