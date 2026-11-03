import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/ui/tooltip';

/** A small square button with a tooltip, for a row of actions. */
export function ActionButton({
    label,
    onClick,
    disabled,
    destructive,
    isActive,
    children,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    destructive?: boolean;
    isActive?: boolean;
    children: ReactNode;
}) {
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <button
                    type="button"
                    aria-label={label}
                    disabled={disabled}
                    onClick={onClick}
                    className={cn(
                        'grid size-8 place-items-center rounded-lg transition-colors disabled:opacity-35 [&_svg]:size-4',
                        destructive
                            ? 'text-destructive hover:bg-destructive/10'
                            : 'text-muted-foreground hover:bg-card hover:text-foreground dark:hover:bg-input/50 hover:shadow-sm',
                        isActive &&
                            'bg-card text-foreground dark:bg-input/70 shadow-sm',
                    )}
                >
                    {children}
                </button>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
        </Tooltip>
    );
}
