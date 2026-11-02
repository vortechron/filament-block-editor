import type { ReactNode } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from '@/ui/dropdown-menu';
import { useT } from '@/lib/i18n';
import type { SectionTemplate } from '@/types';
import { SectionThumb } from './section-thumbs';

/**
 * The ready-made sections in a small menu, opened from a "+" on the
 * canvas. Picking one adds it right there.
 */
export function TemplateMenu({
    templates,
    onPick,
    children,
    align = 'center',
}: {
    templates: SectionTemplate[];
    onPick: (template: SectionTemplate) => void;
    /** The button that opens the menu. */
    children: ReactNode;
    align?: 'start' | 'center' | 'end';
}) {
    const t = useT();

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
            <DropdownMenuContent
                align={align}
                sideOffset={8}
                className="max-h-[min(28rem,70vh)] w-[22rem] overflow-y-auto p-2"
            >
                <DropdownMenuLabel className="text-muted-foreground px-1 pb-2 text-xs font-medium">
                    {t('Add a ready-made section')}
                </DropdownMenuLabel>
                <div className="grid grid-cols-2 gap-2">
                    {templates.map((template) => (
                        <DropdownMenuItem
                            key={template.key}
                            onSelect={() => onPick(template)}
                            className="bg-muted/60 focus:bg-accent grid content-start gap-1.5 rounded-lg p-1.5 text-left"
                        >
                            <span className="ring-border block overflow-hidden rounded-md ring-1">
                                <SectionThumb layout={template.data.layout} />
                            </span>
                            <span className="px-0.5 text-xs leading-tight font-medium">
                                {template.label}
                            </span>
                        </DropdownMenuItem>
                    ))}
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
