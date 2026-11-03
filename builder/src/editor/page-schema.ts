import {
    BlockNoteSchema,
    createBlockSpecFromTiptapNode,
    defaultBlockSpecs,
    defaultStyleSpecs,
    propsToAttributes,
} from '@blocknote/core';
import { ColumnBlock, withMultiColumn } from '@blocknote/xl-multi-column';
import {
    cardSpec,
    columnListWithItemProps,
    fontFamilyStyleSpec,
    spacerSpec,
    withItemProps,
    withVideoEmbeds,
} from '@vortechron/blocknote-kit';
import { LOOK_PROP_SCHEMA } from './look-prop';
import { pageBlockSpecs } from './page-blocks';


/** A BlockNote block spec, loosely: the builder only adds one prop. */
type AnySpec = {
    config: { type: string; content: string; propSchema: Record<string, unknown> };
    implementation: { node?: AnyNode } & Record<string, unknown>;
    extensions?: unknown[];
};

type AnyNode = {
    extend: (config: Record<string, unknown>) => AnyNode;
};

/**
 * The same spec with the `look` prop. Most specs get their TipTap node
 * from the prop schema when the schema is made; a spec that brings its
 * own node (columns, tables) gets the attribute on the node as well.
 */
export function withLookProp<T>(spec: T): T {
    const loose = spec as unknown as AnySpec;
    const propSchema = { ...loose.config.propSchema, ...LOOK_PROP_SCHEMA };
    const node = loose.implementation.node;

    if (node === undefined) {
        return {
            ...loose,
            config: { ...loose.config, propSchema },
        } as unknown as T;
    }

    const withAttribute = node.extend({
        addAttributes(this: { parent?: () => Record<string, unknown> }) {
            return {
                ...this.parent?.(),
                ...propsToAttributes(LOOK_PROP_SCHEMA as never),
            };
        },
    });
    const rebuilt = createBlockSpecFromTiptapNode(
        {
            node: withAttribute as never,
            type: loose.config.type,
            content: loose.config.content as never,
        },
        propSchema as never,
        loose.extensions as never,
    );

    return {
        ...loose,
        ...rebuilt,
        implementation: { ...loose.implementation, node: withAttribute },
    } as unknown as T;
}

/**
 * A React block (made with createReactBlockSpec) draws itself with the
 * prop schema of the config it was made with, not the schema's copy, and
 * fails on a prop it does not know. blocknote-kit's card and spacer are
 * React blocks the builder can not remake, so their shared config gets
 * the `look` prop added, once. The page's own React blocks declare it
 * themselves (page-blocks.tsx).
 */
function addLookToKitReactBlock<T>(spec: T): T {
    const config = (spec as unknown as AnySpec).config;

    if (!Object.hasOwn(config.propSchema, 'look')) {
        config.propSchema = { ...config.propSchema, ...LOOK_PROP_SCHEMA };
    }

    return spec;
}

/** Every spec in the map with the `look` prop. */
export function withLookProps<T extends Record<string, unknown>>(specs: T): T {
    return Object.fromEntries(
        Object.entries(specs).map(([type, spec]) => [type, withLookProp(spec)]),
    ) as T;
}

/**
 * The kit's schema (blocknote-kit's createKitSchema) with the page's own
 * blocks, where every block, the kit's columns too, has the `look` prop.
 * The kit itself is not changed; its parts are put together here.
 */
export function createPageSchema() {
    return withMultiColumn(
        BlockNoteSchema.create({
            blockSpecs: withLookProps({
                ...withItemProps(
                    withVideoEmbeds({
                        ...defaultBlockSpecs,
                        spacer: addLookToKitReactBlock(spacerSpec()),
                        card: addLookToKitReactBlock(cardSpec()),
                    }),
                ),
                ...pageBlockSpecs,
            }),
            styleSpecs: {
                ...defaultStyleSpecs,
                fontFamily: fontFamilyStyleSpec([]),
            },
        }),
    ).extend({
        blockSpecs: withLookProps({
            column: ColumnBlock,
            columnList: columnListWithItemProps(),
        }),
    });
}
