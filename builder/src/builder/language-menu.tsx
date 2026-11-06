import { Check, ChevronDown, Languages, LoaderCircle } from 'lucide-react';
import { type MouseEvent, useRef, useState } from 'react';
import { ConfirmDialog } from '@/editor/confirm-dialog';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { builderLanguageUrl } from '@/lib/languages';
import type { PageBuilderLanguage } from '@/types';
import { Button } from '@/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/ui/dropdown-menu';
import { useBuilderContext } from './builder-context';

/** Each language opens a new editor, with its own content and undo history. */
export function LanguageMenu() {
    const t = useT();
    const { languages, adapter } = useHost();
    const { hasUnsavedChanges, leaveTo, form, kit, siteInfo } = useBuilderContext();
    const draft = JSON.stringify([form.data, kit.kit, siteInfo.values]);
    const latest = useRef({ draft, hasUnsavedChanges });
    latest.current = { draft, hasUnsavedChanges };
    const [pending, setPending] = useState<PageBuilderLanguage | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const creating = useRef(false);
    const [error, setError] = useState(false);
    const current = languages.find((language) => language.current);

    if (languages.length < 2) {
        return null;
    }

    async function openLanguage(language: PageBuilderLanguage) {
        if (language.url !== null) {
            leaveTo(language.url);
            return;
        }
        if (!adapter.createTranslation || creating.current || language.current) {
            return;
        }

        const draftAtStart = latest.current.draft;
        creating.current = true;
        setIsCreating(true);
        setError(false);
        try {
            const result: unknown = await adapter.createTranslation(language.locale);
            const url = typeof result === 'object' && result !== null && 'url' in result
                ? builderLanguageUrl(result.url)
                : null;
            if (url === null) {
                throw new Error('Invalid translation URL');
            }
            if (latest.current.hasUnsavedChanges && latest.current.draft !== draftAtStart) {
                setPending({ ...language, url });
            } else {
                leaveTo(url);
            }
        } catch {
            setError(true);
        } finally {
            creating.current = false;
            setIsCreating(false);
        }
    }

    function handlePick(event: MouseEvent<HTMLAnchorElement>, language: PageBuilderLanguage) {
        if (hasUnsavedChanges) {
            event.preventDefault();
            setPending(language);
        }
    }

    function handleCreate(language: PageBuilderLanguage) {
        if (hasUnsavedChanges) {
            setPending(language);
        } else {
            void openLanguage(language);
        }
    }

    return (
        <>
            <div className="relative shrink-0">
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={isCreating}
                            aria-label={t('Content language: :language', { language: current?.label ?? t('Language') })}
                        >
                            {isCreating ? <LoaderCircle className="size-4 animate-spin" /> : <Languages className="hidden xl:block" />}
                            <span className="uppercase xl:hidden">{current?.locale ?? t('Language')}</span>
                            <span className="hidden max-w-24 truncate xl:inline">{current?.label ?? t('Language')}</span>
                            <ChevronDown className="hidden sm:block" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        {languages.map((language) => language.url !== null ? (
                            <DropdownMenuItem key={language.locale} asChild>
                                <a
                                    href={language.url}
                                    onClick={(event) => handlePick(event, language)}
                                    aria-current={language.current ? 'page' : undefined}
                                >
                                    <span className="flex-1">{language.label}</span>
                                    {language.current && <Check className="size-4" />}
                                </a>
                            </DropdownMenuItem>
                        ) : (
                            <DropdownMenuItem
                                key={language.locale}
                                disabled={!adapter.createTranslation || language.current || isCreating}
                                onSelect={() => handleCreate(language)}
                            >
                                {t('Create :language draft', { language: language.label })}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
                {error && (
                    <p role="alert" className="bg-card text-destructive absolute left-0 top-full z-50 w-64 rounded-md border p-3 text-sm shadow-md">
                        {t('The language draft could not be opened. Your changes are still here. Try again.')}
                    </p>
                )}
            </div>
            <ConfirmDialog
                open={pending !== null}
                onOpenChange={(open) => !open && setPending(null)}
                title={t('Leave without saving?')}
                description={t('This page has changes that are not saved yet. Save first to keep them.')}
                confirmLabel={t('Leave')}
                onConfirm={() => {
                    const language = pending;
                    setPending(null);
                    if (language !== null) void openLanguage(language);
                }}
            />
        </>
    );
}
