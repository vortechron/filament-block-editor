import { createContext, useContext, useState, type ReactNode } from 'react';
import { useT } from '@/lib/i18n';
import { HostContext } from '@/lib/host';
import { BuilderContext } from './builder-context';

export const PrepareTranslation = createContext<(() => void) | null>(null);
export const TextScope = createContext('');
export const FieldTextStore = createContext<{
    read: (locale: string, key: string) => string | undefined;
    write: (locale: string, key: string, value: string) => void;
} | null>(null);

/** Each control owns its language selection; the document owns all drafts. */
export function LocalizedText({
    path,
    label,
    value,
    onChange,
    children,
}: {
    path: string;
    label: string;
    value: string;
    onChange: (value: string) => void;
    children: (value: string, onChange: (value: string) => void) => ReactNode;
}) {
    const t = useT();
    const scope = useContext(TextScope);
    const store = useContext(FieldTextStore);
    const prepare = useContext(PrepareTranslation);
    const host = useContext(HostContext);
    const context = useContext(BuilderContext);
    const languages = host?.fieldLanguages;
    const [selected, setSelected] = useState(languages?.defaultLocale ?? '');
    if (!languages || languages.locales.length < 2 || !context) {
        return children(value, onChange);
    }
    const key = `${scope}${path}`;
    const translated = selected !== languages.defaultLocale;
    const override = store
        ? store.read(selected, key)
        : context.form.data.translations?.[selected]?.[key];
    const missing = translated && override === undefined;
    const displayed = translated ? (override ?? value) : value;
    const change = (text: string) => {
        if (!translated) {
            onChange(text);
            return;
        }
        prepare?.();
        if (store) {
            store.write(selected, key, text);
            return;
        }
        context.form.setData((current) => {
            const words = { ...current.translations?.[selected] };
            delete words[`${key}/_empty_fallback`];
            return {
                ...current,
                translations: {
                    ...current.translations,
                    [selected]: {
                        ...words,
                        [key]: text,
                    },
                },
            };
        }, `translation:${selected}:${key}`);
    };
    return (
        <div className="min-w-0" data-field-language={selected}>
            {children(displayed, change)}
            {missing && (
                <p className="text-muted-foreground mt-1 text-xs" role="status">
                    {t('No :language text yet. Showing :default.', {
                        language:
                            languages.locales.find(
                                (language) => language.locale === selected,
                            )?.label ?? selected,
                        default:
                            languages.locales.find(
                                (language) =>
                                    language.locale === languages.defaultLocale,
                            )?.label ?? languages.defaultLocale,
                    })}
                </p>
            )}
            <div className="flex justify-end">
                <select
                    aria-label={t(':label language', { label })}
                    value={selected}
                    onChange={(event) => setSelected(event.target.value)}
                    className="min-h-11 min-w-11 cursor-pointer border-0 bg-transparent px-2 text-right text-xs underline underline-offset-4 outline-offset-2"
                >
                    {languages.locales.map((language) => (
                        <option key={language.locale} value={language.locale}>
                            {language.label}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
}
