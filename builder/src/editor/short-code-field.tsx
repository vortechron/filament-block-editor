import { baseKeymap } from '@tiptap/pm/commands';
import { history, redo, undo } from '@tiptap/pm/history';
import { InputRule, inputRules } from '@tiptap/pm/inputrules';
import { keymap } from '@tiptap/pm/keymap';
import { Fragment, type Node, Slice } from '@tiptap/pm/model';
import { type Command, EditorState, Selection, TextSelection } from '@tiptap/pm/state';
import { EditorView, type NodeViewConstructor } from '@tiptap/pm/view';
import { useEffect, useId, useRef } from 'react';
import RULES from '@/generated/rules.json';
import { dynamicValuesOfType, findDynamicValue, findTextValue } from '@/lib/dynamic-values';
import { useHost } from '@/lib/host';
import { useT } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { DynamicValueDefinition } from '@/types';
import { Label } from '@/ui/label';
import {
    CHIP_CLASS,
    CHIP_MISSING_CLASS,
    CHIP_MISSING_NOTE_CLASS,
    CHIP_PREVIEW_CLASS,
} from './chip-style';
import { DynamicValuePicker } from './dynamic-value-picker';
import {
    docFromText,
    nodesFromText,
    shortCodeSchema,
    textFromDoc,
    textFromFragment,
} from './short-code-doc';

/** `{key}` typed by hand, just closed with `}`: it becomes a chip. */
const TYPED_SHORT_CODE = new RegExp(`\\{(${RULES.dynamic_key})\\}$`);

/**
 * An own block's text or textarea field that can hold the site's own
 * values: each `{key}` shows as the same chip as in the section's words
 * (its label and what it is now) and is deleted as one piece. "Shop value"
 * opens a search of the site's text values and puts the picked one where
 * the cursor was, or at the end. The field still stores plain words, with
 * `{key}` for each value (docs/v2-plan.md, section 6).
 *
 * A `text` field stays on one line (Enter does nothing); a `textarea` gets
 * a new line on Enter. Pasted text arrives as plain text.
 */
export function ShortCodeField({
    label,
    hint,
    value,
    multiline,
    onChange,
}: {
    label: string;
    hint?: string;
    value: string;
    multiline: boolean;
    onChange: (value: string) => void;
}) {
    const t = useT();
    const labelId = useId();
    const { dynamicValues } = useHost();
    const mount = useRef<HTMLDivElement>(null);
    const view = useRef<EditorView | null>(null);
    // The words the box holds now, to tell the host's value from ours.
    const current = useRef(value);
    const latestChange = useRef(onChange);
    // Before the cursor was ever in the box, a picked value goes at the end.
    const hasBeenFocused = useRef(false);
    const missing = t('no longer exists');
    const latestChips = useRef(chipView(dynamicValues, missing));

    latestChange.current = onChange;

    useEffect(() => {
        const element = mount.current;

        if (element === null) {
            return;
        }

        const editor = new EditorView(element, {
            state: EditorState.create({
                doc: docFromText(current.current),
                plugins: plugins(multiline),
            }),
            nodeViews: { shopValue: latestChips.current },
            attributes: {
                role: 'textbox',
                'aria-labelledby': labelId,
                'aria-multiline': multiline ? 'true' : 'false',
                class: cn(
                    'border-input bg-card focus-visible:border-ring focus-visible:ring-ring/50 w-full rounded-md border px-3 py-1.5 text-base leading-relaxed break-words whitespace-pre-wrap shadow-xs outline-none focus-visible:ring-[3px] md:text-sm',
                    multiline ? 'min-h-16' : 'min-h-9',
                ),
            },
            handlePaste: (target, event) => {
                insertText(target, event.clipboardData?.getData('text/plain') ?? '', multiline);

                return true;
            },
            handleDrop: (target, event, _slice, moved) => {
                if (moved) {
                    return false;
                }

                const place = target.posAtCoords({ left: event.clientX, top: event.clientY });

                if (place !== null) {
                    target.dispatch(target.state.tr.setSelection(TextSelection.create(target.state.doc, place.pos)));
                }

                insertText(target, event.dataTransfer?.getData('text/plain') ?? '', multiline);

                return true;
            },
            clipboardTextSerializer: (slice) => textFromFragment(slice.content),
            handleDOMEvents: {
                focus: () => {
                    hasBeenFocused.current = true;

                    return false;
                },
            },
            dispatchTransaction(transaction) {
                const next = editor.state.apply(transaction);

                editor.updateState(next);

                const text = textFromDoc(next.doc);

                if (text !== current.current) {
                    current.current = text;
                    latestChange.current(text);
                }
            },
        });

        view.current = editor;

        return () => {
            editor.destroy();
            view.current = null;
        };
        // The box is made once; its words follow `value` below.
    }, [multiline, labelId]);

    // Chips show the values the site has now, also after a shop info save.
    useEffect(() => {
        latestChips.current = chipView(dynamicValues, missing);
        view.current?.setProps({ nodeViews: { shopValue: latestChips.current } });
    }, [dynamicValues, missing]);

    // The host changed the words (another field, undo of the page): show them.
    useEffect(() => {
        const editor = view.current;

        if (editor === null || value === current.current) {
            return;
        }

        current.current = value;
        editor.dispatch(
            editor.state.tr
                .replaceWith(0, editor.state.doc.content.size, docFromText(value).content)
                .setMeta('addToHistory', false),
        );
    }, [value]);

    function insertValue(key: string) {
        const editor = view.current;

        if (editor === null) {
            return;
        }

        const chip = shortCodeSchema.nodes.shopValue.create({ key });
        const state = editor.state;
        const transaction = hasBeenFocused.current
            ? state.tr.replaceSelectionWith(chip, false)
            : state.tr.setSelection(Selection.atEnd(state.doc)).replaceSelectionWith(chip, false);

        editor.dispatch(transaction.scrollIntoView());
        editor.focus();
    }

    const hasTextValues = dynamicValuesOfType(dynamicValues, 'text').length > 0;

    return (
        <div role="group" aria-labelledby={labelId} className="grid grid-cols-1 content-start gap-1.5">
            <div className="flex min-h-7 items-center justify-between gap-2">
                <Label id={labelId} onClick={() => view.current?.focus()}>
                    {label}
                </Label>
                {hasTextValues && (
                    <DynamicValuePicker type="text" label={t('Shop value')} onPick={insertValue} />
                )}
            </div>
            <div ref={mount} />
            {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
        </div>
    );
}

function plugins(multiline: boolean) {
    const newLine: Command = multiline
        ? (state, dispatch) => {
              dispatch?.(state.tr.replaceSelectionWith(shortCodeSchema.nodes.hard_break.create()).scrollIntoView());

              return true;
          }
        : () => true;

    return [
        history(),
        inputRules({
            rules: [
                new InputRule(TYPED_SHORT_CODE, (state, match, start, end) =>
                    state.tr.replaceWith(start, end, shortCodeSchema.nodes.shopValue.create({ key: match[1] })),
                ),
            ],
        }),
        keymap({
            'Mod-z': undo,
            'Mod-y': redo,
            'Shift-Mod-z': redo,
            Enter: newLine,
            'Shift-Enter': newLine,
        }),
        keymap(baseKeymap),
    ];
}

/** Plain text where the cursor is, its `{key}` as chips; one line in a text field. */
function insertText(view: EditorView, text: string, multiline: boolean) {
    const lines = text.replace(/\r\n?/g, '\n');
    const nodes = nodesFromText(multiline ? lines : lines.replace(/\n+/g, ' '));

    if (nodes.length > 0) {
        view.dispatch(view.state.tr.replaceSelection(new Slice(Fragment.from(nodes), 0, 0)).scrollIntoView());
    }
}

/**
 * A chip like the section's words show: the label, then "· what it is now".
 * A key the words can not show (unknown, or a link or a picture, which the
 * page draws as nothing here) looks broken: "· no longer exists".
 */
function chipView(values: readonly DynamicValueDefinition[], missing: string): NodeViewConstructor {
    return (node: Node) => {
        const key = String(node.attrs.key);
        const definition = findTextValue(values, key);
        const dom = document.createElement('span');
        const name = document.createElement('span');

        dom.dataset.shortCode = key;
        dom.title = key;
        dom.contentEditable = 'false';
        dom.className = definition ? CHIP_CLASS : CHIP_MISSING_CLASS;
        name.textContent = definition?.label ?? findDynamicValue(values, key)?.label ?? key;
        dom.append(name);

        const note = definition ? definition.preview : missing;

        if (note) {
            const after = document.createElement('span');

            after.className = definition ? CHIP_PREVIEW_CLASS : CHIP_MISSING_NOTE_CLASS;
            after.textContent = `· ${note}`;
            dom.append(after);
        }

        return { dom, ignoreMutation: () => true };
    };
}
