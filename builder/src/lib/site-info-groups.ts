import { parseValues } from '@/blocks/own-block-values';
import type {
    DynamicValueDefinition,
    OwnBlockDefinition,
    OwnBlockField,
} from '@/types';
import { DYNAMIC_KEY, dynamicRefKey, findDynamicValue } from './dynamic-values';
import { parseForm } from './form-definition';
import { shortCodeKeys } from './short-codes';

/**
 * The shop info an item shows, so its panel can list it as short rows
 * ("From shop info"). Mostly shop values, by key: the values an own block
 * shows (`showsValues`), the chips in its words, the short codes in an own
 * block's text fields, and the `@key` of a link, a picture or a form
 * action. A value counts when it comes from a shop info group (its
 * `settings`). A group an own block names (`siteInfo`) is only a fallback:
 * it is left out when one of the item's values already comes from it.
 */

/** A block as the editor or the page value holds it. Only what is read here. */
type BlockLike = {
    type?: unknown;
    props?: unknown;
    content?: unknown;
    children?: unknown;
};

/** One row: a shop value by key, or a whole shop info group. */
export type SiteInfoUse = { key: string } | { group: string };

/** What an item and the blocks inside it use, each once, in page order. */
export function siteInfoUsesFor(
    source: BlockLike | null | undefined,
    ownBlocks: readonly OwnBlockDefinition[],
    dynamicValues: readonly DynamicValueDefinition[],
): SiteInfoUse[] {
    if (!isObject(source)) {
        return [];
    }

    const groupOf = (key: string) => findDynamicValue(dynamicValues, key)?.settings;
    const uses = usesOf(source, ownBlocks).filter(
        (use) => !('key' in use) || groupOf(use.key) !== undefined,
    );
    const covered = new Set(uses.flatMap((use) => ('key' in use ? [groupOf(use.key)] : [])));
    const seen = new Set<string>();

    return uses.filter((use) => {
        const id = 'key' in use ? `key:${use.key}` : `group:${use.group}`;

        if (seen.has(id) || ('group' in use && covered.has(use.group))) {
            return false;
        }

        seen.add(id);

        return true;
    });
}

/** One block, then its words, then the blocks inside it (columns, nested items). */
function usesOf(block: BlockLike, ownBlocks: readonly OwnBlockDefinition[]): SiteInfoUse[] {
    const props = isObject(block.props) ? block.props : {};
    const children = Array.isArray(block.children) ? block.children : [];

    return [
        ...propUses(block.type, props, ownBlocks),
        ...asKeys(contentKeys(block.content)),
        ...children.filter(isObject).flatMap((child) => usesOf(child as BlockLike, ownBlocks)),
    ];
}

function propUses(
    type: unknown,
    props: Record<string, unknown>,
    ownBlocks: readonly OwnBlockDefinition[],
): SiteInfoUse[] {
    switch (type) {
        case 'ownBlock': {
            const definition = ownBlocks.find((entry) => entry.kind === props.kind);

            return definition
                ? [
                      ...asKeys(namedKeys(definition.showsValues)),
                      ...namedGroups(definition.siteInfo),
                      ...asKeys(fieldKeys(definition.fields, parseValues(props.values))),
                  ]
                : [];
        }
        case 'form':
            return asKeys(formKeys(props.form));
        case 'button':
        case 'image':
        case 'video':
            return asKeys(refKeys([props.url]));
        default:
            return [];
    }
}

function namedKeys(raw: unknown): string[] {
    return Array.isArray(raw)
        ? raw.filter((key): key is string => typeof key === 'string' && DYNAMIC_KEY.test(key))
        : [];
}

function namedGroups(raw: unknown): SiteInfoUse[] {
    return Array.isArray(raw)
        ? raw
              .filter((group): group is string => typeof group === 'string' && group !== '')
              .map((group) => ({ group }))
        : [];
}

function asKeys(keys: readonly string[]): SiteInfoUse[] {
    return keys.map((key) => ({ key }));
}

/**
 * Shop values in an own block's fields: `@key` in links and pictures,
 * short codes in text and textareas, rows of lists too.
 */
function fieldKeys(fields: readonly OwnBlockField[], values: Record<string, unknown>): string[] {
    return fields.flatMap((field) => {
        const value = values[field.name];

        if (field.type === 'link' || field.type === 'image') {
            return refKeys([value]);
        }

        if ((field.type === 'text' || field.type === 'textarea') && typeof value === 'string') {
            return shortCodeKeys(value);
        }

        if (field.type === 'list' && Array.isArray(value)) {
            return value
                .filter(isObject)
                .flatMap((row) => fieldKeys(field.fields ?? [], row as Record<string, unknown>));
        }

        return [];
    });
}

/** Shop values the form's actions send to, like `@site.email`. */
function formKeys(form: unknown): string[] {
    return refKeys(
        parseForm(form).actions.map((action) =>
            action.type === 'email' || action.type === 'whatsapp' ? action.to : action.url,
        ),
    );
}

/** Chips (`dynamic`) and `@key` links in a block's words, at any depth (tables, links). */
function contentKeys(content: unknown): string[] {
    if (Array.isArray(content)) {
        return content.flatMap(contentKeys);
    }

    if (!isObject(content)) {
        return [];
    }

    const props = isObject(content.props) ? content.props : {};
    const own =
        content.type === 'dynamic' && typeof props.key === 'string'
            ? [props.key]
            : content.type === 'link'
              ? refKeys([content.href])
              : [];

    return [
        ...own,
        ...Object.entries(content)
            .filter(([name]) => name !== 'props' && name !== 'type')
            .flatMap(([, value]) => contentKeys(value)),
    ];
}

function refKeys(values: readonly unknown[]): string[] {
    return values.flatMap((value) => {
        const key = dynamicRefKey(value);

        return key === null ? [] : [key];
    });
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
