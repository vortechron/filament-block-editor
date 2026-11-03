import { parseValues } from '@/blocks/own-block-values';
import type {
    DynamicValueDefinition,
    OwnBlockDefinition,
    OwnBlockField,
    Section,
} from '@/types';
import { dynamicRefKey } from './dynamic-values';
import { parseForm } from './form-definition';

/**
 * Which groups of the shop info form (`siteInfo.groups`, by key) an item
 * or a section shows, so its panel can offer just those groups. A group
 * comes from an own block's `siteInfo`, or from a shop value it uses: a
 * chip in its words, or an `@key` in a link, a picture or a form action,
 * through that value's `settings` group.
 */

/** A block as the editor or the page value holds it. Only what is read here. */
type BlockLike = {
    type?: unknown;
    props?: unknown;
    content?: unknown;
    children?: unknown;
};

/** One thing an item uses: a group by name, or a shop value by key. */
type Use = { group: string } | { key: string };

/** The groups an item, or every item of a section, uses, each once, in page order. */
export function siteInfoGroupsFor(
    source: Section | BlockLike | null | undefined,
    ownBlocks: readonly OwnBlockDefinition[],
    dynamicValues: readonly DynamicValueDefinition[],
): string[] {
    const groups = blocksOf(source)
        .flatMap((block) => usesOf(block, ownBlocks))
        .flatMap((use) => {
            const group =
                'group' in use
                    ? use.group
                    : dynamicValues.find((value) => value.key === use.key)?.settings;

            return typeof group === 'string' && group !== '' ? [group] : [];
        });

    return [...new Set(groups)];
}

function blocksOf(source: Section | BlockLike | null | undefined): BlockLike[] {
    if (!isObject(source) || source.type === 'ref') {
        return [];
    }

    if (source.type === 'rich' && 'data' in source && isObject(source.data)) {
        const document = source.data.document;

        return Array.isArray(document) ? document.filter(isObject) : [];
    }

    return [source];
}

/** One block, then its words, then the blocks inside it (columns, nested items). */
function usesOf(block: BlockLike, ownBlocks: readonly OwnBlockDefinition[]): Use[] {
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
): Use[] {
    switch (type) {
        case 'ownBlock': {
            const definition = ownBlocks.find((entry) => entry.kind === props.kind);

            return definition
                ? [
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

function namedGroups(raw: unknown): Use[] {
    return Array.isArray(raw)
        ? raw
              .filter((group): group is string => typeof group === 'string' && group !== '')
              .map((group) => ({ group }))
        : [];
}

function asKeys(keys: readonly string[]): Use[] {
    return keys.map((key) => ({ key }));
}

/** Shop values in an own block's link and picture fields, rows of lists too. */
function fieldKeys(fields: readonly OwnBlockField[], values: Record<string, unknown>): string[] {
    return fields.flatMap((field) => {
        const value = values[field.name];

        if (field.type === 'link' || field.type === 'image') {
            return refKeys([value]);
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
