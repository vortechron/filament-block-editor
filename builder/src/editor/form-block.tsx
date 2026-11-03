import { createReactBlockSpec } from '@blocknote/react';
import { ClipboardList, Settings2 } from 'lucide-react';
import { useContext } from 'react';
import { parseForm } from '@/lib/form-definition';
import { useT } from '@/lib/i18n';
import { LOOK_PROP_SCHEMA } from './look-prop';
import { PageBlocksContext } from './page-blocks-context';

/**
 * The form block (docs/v2-plan.md, section 7): its fields, button, message
 * and actions live as JSON in the `form` prop. The server draws the real
 * form; the section's words show a card with its name and field count,
 * and the item panel edits it (builder/form/form-editor.tsx).
 */
export const formBlock = createReactBlockSpec(
    {
        type: 'form',
        propSchema: { form: { default: '' }, ...LOOK_PROP_SCHEMA },
        content: 'none',
    },
    {
        render: ({ block }) => <FormCard id={block.id} form={block.props.form} />,
    },
);

function FormCard({ id, form }: { id: string; form: string }) {
    const t = useT();
    const { openItem } = useContext(PageBlocksContext);
    const { name, fields } = parseForm(form);

    return (
        <div
            contentEditable={false}
            className="my-2 flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left text-slate-900 shadow-sm"
        >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-600">
                <ClipboardList className="size-5" />
            </span>
            <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate text-sm font-semibold">
                    {name || t('Form')}
                </span>
                <span className="truncate text-xs text-slate-500">
                    {fields.length === 1
                        ? t('1 field')
                        : t(':count fields', { count: fields.length })}
                </span>
            </span>
            {openItem && (
                <button
                    type="button"
                    aria-label={t('Edit form')}
                    onClick={() => openItem(id)}
                    className="flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-slate-200 px-2.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                    <Settings2 className="size-3.5" />
                    {t('Edit')}
                </button>
            )}
        </div>
    );
}
