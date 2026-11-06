import {
    DeleteLinkButton,
    LinkToolbar,
    OpenLinkButton,
    useBlockNoteEditor,
    useComponentsContext,
    useDictionary,
    useEditorState,
    useExtension,
    type LinkToolbarProps,
} from '@blocknote/react';
import {
    FormattingToolbarExtension,
    ShowSelectionExtension,
} from '@blocknote/core/extensions';
import { Link } from 'lucide-react';
import { useEffect, useState } from 'react';
import { linkOrReference } from '@/blocks/button-url';
import { useT } from '@/lib/i18n';

/** Preserve page paths and references; the upstream form prepends https:// to them. */
function PageLinkForm({
    url,
    text,
    range,
    done,
}: {
    url: string;
    text: string;
    range: { from: number; to: number };
    done: () => void;
}) {
    const editor = useBlockNoteEditor();
    const Components = useComponentsContext()!;
    const dict = useDictionary();
    const t = useT();
    const [value, setValue] = useState(url);
    const [invalid, setInvalid] = useState(false);
    const submit = () => {
        const safe = linkOrReference(value);
        if (!safe) {
            setInvalid(true);
            return;
        }
        editor.editLink(safe, text, range.from);
        done();
    };
    return (
        <Components.Generic.Form.Root>
            <Components.Generic.Form.TextInput
                className="bn-text-input"
                name="url"
                icon={<Link size={16} />}
                autoFocus
                placeholder={dict.link_toolbar.form.url_placeholder}
                value={value}
                onChange={(event) => {
                    setValue(event.currentTarget.value);
                    setInvalid(false);
                }}
                onKeyDown={(event) => {
                    if (
                        event.key === 'Enter' &&
                        !event.nativeEvent.isComposing
                    ) {
                        event.preventDefault();
                        submit();
                    }
                }}
                onSubmit={submit}
            />
            {invalid && (
                <p role="alert" className="max-w-64 text-sm text-destructive">
                    {t(
                        'A translated link is unsafe or invalid. Use a page path, https, email or telephone link.',
                    )}
                </p>
            )}
        </Components.Generic.Form.Root>
    );
}

export function CreatePageLinkButton() {
    const editor = useBlockNoteEditor();
    const Components = useComponentsContext()!;
    const dict = useDictionary();
    const formatting = useExtension(FormattingToolbarExtension);
    const { showSelection } = useExtension(ShowSelectionExtension);
    const [draft, setDraft] = useState<{
        url: string;
        text: string;
        range: { from: number; to: number };
    } | null>(null);
    const open = draft !== null;
    const selection = useEditorState({
        editor,
        selector: ({ editor }) => {
            const blocks = editor.getSelection()?.blocks ?? [
                editor.getTextCursorPosition().block,
            ];
            if (
                !editor.isEditable ||
                !blocks.some((block) => Array.isArray(block.content))
            )
                return undefined;
            return {
                url: editor.getSelectedLinkUrl() ?? '',
                text: editor.getSelectedText(),
                range: {
                    from: editor.prosemirrorState.selection.from,
                    to: editor.prosemirrorState.selection.to,
                },
            };
        },
    });
    useEffect(() => {
        showSelection(open, 'pageLinkButton');
        return () => showSelection(false, 'pageLinkButton');
    }, [open, showSelection]);
    useEffect(() => {
        const keydown = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
                event.preventDefault();
                setDraft(selection ?? null);
            }
        };
        editor.domElement?.addEventListener('keydown', keydown);
        return () => editor.domElement?.removeEventListener('keydown', keydown);
    }, [editor, selection]);
    if (!selection) return null;
    return (
        <Components.Generic.Popover.Root
            open={open}
            onOpenChange={(open) => setDraft(open ? (selection ?? null) : null)}
        >
            <Components.Generic.Popover.Trigger>
                <Components.FormattingToolbar.Button
                    className="bn-button"
                    label={dict.formatting_toolbar.link.tooltip}
                    mainTooltip={dict.formatting_toolbar.link.tooltip}
                    icon={<Link size={16} />}
                    onClick={() =>
                        setDraft((value) =>
                            value ? null : (selection ?? null),
                        )
                    }
                />
            </Components.Generic.Popover.Trigger>
            <Components.Generic.Popover.Content
                className="bn-popover-content bn-form-popover"
                variant="form-popover"
            >
                {draft && (
                    <PageLinkForm
                        {...draft}
                        done={() => {
                            setDraft(null);
                            formatting.store.setState(false);
                        }}
                    />
                )}
            </Components.Generic.Popover.Content>
        </Components.Generic.Popover.Root>
    );
}

/** The same URL rule when editing an existing link from its hover menu. */
export function PageLinkToolbar(props: LinkToolbarProps) {
    const Components = useComponentsContext()!;
    const dict = useDictionary();
    return (
        <LinkToolbar {...props}>
            <Components.Generic.Popover.Root
                onOpenChange={props.setToolbarPositionFrozen}
            >
                <Components.Generic.Popover.Trigger>
                    <Components.LinkToolbar.Button
                        className="bn-button"
                        mainTooltip={dict.link_toolbar.edit.tooltip}
                        isSelected={false}
                    >
                        {dict.link_toolbar.edit.text}
                    </Components.LinkToolbar.Button>
                </Components.Generic.Popover.Trigger>
                <Components.Generic.Popover.Content
                    className="bn-popover-content bn-form-popover"
                    variant="form-popover"
                >
                    <PageLinkForm
                        {...props}
                        done={() => {
                            props.setToolbarOpen?.(false);
                            props.setToolbarPositionFrozen?.(false);
                        }}
                    />
                </Components.Generic.Popover.Content>
            </Components.Generic.Popover.Root>
            <OpenLinkButton url={props.url} />
            <DeleteLinkButton
                range={props.range}
                setToolbarOpen={props.setToolbarOpen}
            />
        </LinkToolbar>
    );
}
