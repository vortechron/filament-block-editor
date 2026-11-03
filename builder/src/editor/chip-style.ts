/**
 * The look of a shop value chip: in the section's words (dynamic-inline.tsx)
 * and in an own block's text fields (short-code-field.tsx), so both read
 * the same: the value's label, then "· what it is now".
 */
export const CHIP_CLASS =
    'mx-0.5 inline-flex items-baseline gap-1 rounded-md bg-sky-100 px-1.5 py-px align-baseline text-[0.9em] font-medium text-sky-900 ring-1 ring-sky-200';

export const CHIP_PREVIEW_CLASS = 'font-normal text-sky-700';

/** A chip whose value the site no longer has. */
export const CHIP_MISSING_CLASS =
    'mx-0.5 inline-flex items-baseline gap-1 rounded-md bg-amber-50 px-1.5 py-px align-baseline text-[0.9em] font-medium text-amber-900 ring-1 ring-amber-200';

export const CHIP_MISSING_NOTE_CLASS = 'font-normal text-amber-700 italic';
