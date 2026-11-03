import { LoaderCircle } from 'lucide-react';
import { type FormEvent, useId, useState } from 'react';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { normalizeValue } from '@/lib/page-value';
import type { RichSection, SaveSectionResult } from '@/types';
import { Button } from '@/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/ui/dialog';
import { Input } from '@/ui/input';
import { useBuilderContext } from './builder-context';

export type SaveSectionMode = 'template' | 'synced';

const NAME_LENGTH = 100;

/**
 * Asks for a name, then saves the section through `adapter.saveSection`:
 * as a template (a copy in Add, under Saved sections), or as a synced
 * section, which then takes this section's place on the page.
 */
export function SaveSectionDialog({
    mode,
    section,
    onClose,
}: {
    /** Null keeps the dialog closed. */
    mode: SaveSectionMode | null;
    section: RichSection;
    onClose: () => void;
}) {
    const t = useT();
    const id = useId();
    const { adapter } = useHost();
    const { builder, library } = useBuilderContext();
    const [title, setTitle] = useState('');
    const [errors, setErrors] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const isSynced = mode === 'synced';

    function close() {
        setTitle('');
        setErrors([]);
        onClose();
    }

    async function save(event: FormEvent) {
        event.preventDefault();

        const name = title.trim();

        if (name === '' || !adapter.saveSection || mode === null) {
            return;
        }

        const copy = normalizeValue([section]).sections[0] as RichSection;

        setIsSaving(true);

        let result: SaveSectionResult;

        try {
            result = await adapter.saveSection(copy, { title: name, synced: isSynced });
        } catch (error) {
            result = {
                ok: false,
                errors: {
                    section:
                        error instanceof Error && error.message !== ''
                            ? error.message
                            : t('The section could not be saved.'),
                },
            };
        }

        setIsSaving(false);

        if (!result || result.ok === false) {
            setErrors(Object.values(result?.errors ?? {}));

            return;
        }

        if (result.template) {
            library.addTemplate(result.template);
        } else if (!isSynced) {
            library.addTemplate({
                key: `saved-${String(result.id)}`,
                label: name,
                category: 'saved',
                section: { data: copy.data },
            });
        }

        if (isSynced) {
            const ref = result.id;

            library.addSynced({ id: ref, title: name, editUrl: null, section: copy });
            builder.updateSection(section.id, (current) => ({
                id: current.id,
                type: 'ref',
                ref,
                ...(current.hidden ? { hidden: true as const } : {}),
            }));
        }

        close();
    }

    return (
        <Dialog open={mode !== null} onOpenChange={(open) => !open && close()}>
            <DialogContent>
                <form onSubmit={(event) => void save(event)} className="grid gap-4">
                    <DialogHeader>
                        <DialogTitle>
                            {isSynced ? t('Make this section synced') : t('Save as a template')}
                        </DialogTitle>
                        <DialogDescription>
                            {isSynced
                                ? t('Every page that uses it shows the same section. Change it once and it changes on all of them.')
                                : t('A copy shows under Saved sections in Add, for every page. Changing this section later does not change the copy.')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-1.5">
                        <label htmlFor={id} className="text-foreground text-sm font-medium">
                            {t('Name')}
                        </label>
                        <Input
                            id={id}
                            value={title}
                            maxLength={NAME_LENGTH}
                            autoFocus
                            onChange={(event) => setTitle(event.target.value)}
                        />
                        {errors.map((message) => (
                            <p key={message} role="alert" className="text-destructive text-xs">
                                {message}
                            </p>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={close}>
                            {t('Cancel')}
                        </Button>
                        <Button type="submit" disabled={isSaving || title.trim() === ''}>
                            {isSaving && <LoaderCircle className="animate-spin" />}
                            {t('Save')}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
