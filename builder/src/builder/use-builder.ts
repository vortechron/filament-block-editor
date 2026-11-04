import { useRef, useState } from 'react';
import {
    lastRich,
    MAX_SECTIONS,
    newSectionId,
    sectionFromTemplate,
} from '@/lib/page-value';
import { useHost } from '@/lib/host';
import { isLocked, withoutDeveloperData } from '@/lib/locks';
import type { LockKey, PartKey, Section, SectionTemplate } from '@/types';
import { duplicateBlock, withHidden } from '../editor/block-meta';
import {
    insertAfter,
    moveItem,
    moveToIndex,
    replaceItem,
} from '../editor/helpers';
import type { HistoryMove, PageState } from '../editor/use-page-state';
import { followChange } from './follow-history';
import { followInFrame, scrollFrameTo } from './frame-dom';
import { isTextItem } from './page-frame-updates';
import {
    type HomePanelName,
    type ItemKey,
    type ItemPlace,
    NOTHING_SELECTED,
    type PagePlace,
    panelUnder,
    type SectionEditorHandle,
    type SectionTab,
    type Selection,
    type SidebarPanel,
} from './types';

/** Where a new item goes: a section and a place in it. */
export type ItemTarget = { sectionId: string; place: ItemPlace | PagePlace };

/**
 * The state of the page builder: what is picked on the canvas, which
 * sidebar panel is open, and the open editor of the picked section. The
 * sections themselves live in the page state (use-page-state.ts).
 */
export function useBuilder({
    form,
    templates,
}: {
    form: PageState;
    templates: SectionTemplate[];
}) {
    const blocks = form.data.sections;
    const { developer } = useHost();
    /** Does a lock stop this user doing `key` to the section? */
    const locked = (sectionId: string, key: LockKey) =>
        isLocked(
            blocks.find((block) => block.id === sectionId),
            key,
            developer,
        );
    const [selection, setSelection] = useState<Selection>(NOTHING_SELECTED);
    const [panel, setPanel] = useState<SidebarPanel>({ name: 'add' });
    const [homePanel, setHomePanel] = useState<HomePanelName>('add');
    // Here, not in the section panel, so a click on the page's words can
    // bring the words back from the Style tab.
    const [sectionTab, setSectionTab] = useState<SectionTab>('content');
    const [handles, setHandles] = useState<
        ReadonlyMap<string, SectionEditorHandle>
    >(() => new Map());
    // Work waiting for a section's editor to open: a new section loads
    // its editor a moment after it is added.
    const waiting = useRef(
        new Map<string, (handle: SectionEditorHandle) => void>(),
    );
    // Goes up when an undo or a redo changes the picked section's words:
    // its editor reads them only when it opens, so it opens again.
    const [wordsVersion, setWordsVersion] = useState(0);

    /**
     * Changes the sections from the latest ones. An editor can report a
     * change before React draws again, so never start from `blocks`.
     * `group` names the change for the undo history (use-page-state.ts);
     * left out, as for every section action here, the change is a step
     * of its own.
     */
    function updateBlocks(
        update: (current: Section[]) => Section[],
        group?: string,
    ) {
        form.setData((data) => {
            const sections = update(data.sections);

            return sections === data.sections ? data : { ...data, sections };
        }, group);
    }

    function updateAt(
        sectionId: string,
        update: (current: Section[], index: number) => Section[],
        group?: string,
    ) {
        updateBlocks((current) => {
            const index = current.findIndex((block) => block.id === sectionId);

            return index === -1 ? current : update(current, index);
        }, group);
    }

    function indexOf(sectionId: string): number {
        return blocks.findIndex((block) => block.id === sectionId);
    }

    function openPanel(next: SidebarPanel) {
        if (next.name === 'add' || next.name === 'layers') {
            setHomePanel(next.name);
        }

        setPanel(next);
    }

    function selectSection(sectionId: string) {
        if (selection.sectionId !== sectionId) {
            setSectionTab('content');
        }

        setSelection((current) =>
            current.sectionId === sectionId && current.itemId === null
                ? current
                : { sectionId, itemId: null },
        );
        setPanel((current) =>
            current.name === 'section' ? current : { name: 'section' },
        );
    }

    function selectItem(sectionId: string, itemId: string) {
        setSelection((current) =>
            current.sectionId === sectionId && current.itemId === itemId
                ? current
                : { sectionId, itemId },
        );
        setPanel((current) =>
            current.name === 'item' ? current : { name: 'item' },
        );
    }

    /**
     * Marks an item as picked without leaving the section's words, like
     * when the cursor moves onto it while the user types.
     */
    function pointAtItem(sectionId: string, itemId: string) {
        setSelection((current) =>
            current.sectionId === sectionId && current.itemId === itemId
                ? current
                : { sectionId, itemId },
        );
        setPanel((current) =>
            current.name === 'section' || current.name === 'item'
                ? current
                : { name: 'section' },
        );
    }

    /**
     * A click on the page. Text puts the cursor in the section's words;
     * anything else, like a photo or a button, opens its settings.
     * `path` is the item's place, as the page marks it.
     */
    function pickOnPage(sectionId: string, path: string | null) {
        selectSection(sectionId);

        // A section locked for content has no words editor to open items in.
        if (path === null || locked(sectionId, 'content')) {
            return;
        }

        withHandle(sectionId, (handle) => {
            const itemId = handle.itemAtPath(path);
            const item = itemId ? handle.getItem(itemId) : null;

            if (itemId && item) {
                openItem(handle, sectionId, itemId, item.type);
            }
        });
    }

    /**
     * Text opens in the section's words with the cursor in it; anything
     * else opens its settings.
     */
    function openItem(
        handle: SectionEditorHandle,
        sectionId: string,
        itemId: string,
        type: string,
    ) {
        if (!isTextItem(type)) {
            selectItem(sectionId, itemId);

            return;
        }

        setSectionTab('content');
        pointAtItem(sectionId, itemId);
        // Once the words show, if they were on the Style tab.
        window.requestAnimationFrame(() => handle.focusItem(itemId));
    }

    /**
     * Back from an item's settings to the section's words, with the cursor
     * on the item. The editor shows again first, then takes the cursor.
     */
    function editInSection(sectionId: string, itemId: string) {
        setSelection({ sectionId, itemId });
        setPanel({ name: 'section' });
        setSectionTab('content');
        window.requestAnimationFrame(() =>
            handles.get(sectionId)?.focusItem(itemId),
        );
    }

    function clearSelection() {
        setSelection(NOTHING_SELECTED);
        setPanel((current) => {
            const under = panelUnder(current);

            return under.name === 'section' ||
                under.name === 'item' ||
                under.name === 'part'
                ? { name: homePanel }
                : current;
        });
    }

    /** A tap on the header or footer: its panel, and no section picked. */
    function selectPart(part: PartKey) {
        setSelection(NOTHING_SELECTED);
        setPanel({ name: 'part', part });
    }

    function registerHandle(
        sectionId: string,
        editorHandle: SectionEditorHandle | null,
    ) {
        const handle = editorHandle && withItemSteps(editorHandle);

        setHandles((current) => {
            const next = new Map(current);

            if (handle === null) {
                next.delete(sectionId);
            } else {
                next.set(sectionId, handle);
            }

            return next;
        });

        if (handle !== null) {
            waiting.current.get(sectionId)?.(handle);
            waiting.current.delete(sectionId);
        }
    }

    /**
     * Adding, moving, copying, deleting an item or changing its kind is
     * a step of its own to undo. Changing its settings is not: typing in
     * them joins up like typing words (item-panel.tsx names the group).
     */
    function withItemSteps(handle: SectionEditorHandle): SectionEditorHandle {
        return {
            ...handle,
            insertItem: (...args) => form.asStep(() => handle.insertItem(...args)),
            changeItemType: (...args) =>
                form.asStep(() => handle.changeItemType(...args)),
            moveItem: (...args) => form.asStep(() => handle.moveItem(...args)),
            duplicateItem: (...args) =>
                form.asStep(() => handle.duplicateItem(...args)),
            removeItem: (...args) => form.asStep(() => handle.removeItem(...args)),
        };
    }

    function withHandle(
        sectionId: string,
        run: (handle: SectionEditorHandle) => void,
    ) {
        const handle = handles.get(sectionId);

        if (handle) {
            run(handle);
        } else {
            waiting.current.set(sectionId, run);
        }
    }

    /**
     * Scrolls the page on the canvas to a section. A section added a
     * moment ago is scrolled to once the page shows it.
     */
    function scrollToSection(sectionId: string) {
        scrollFrameTo({ sectionId, path: null });
    }

    /**
     * Scrolls the picked item, or else the picked section, to the top of
     * the page. On a phone that puts it above the sheet.
     */
    function scrollToPicked() {
        const { sectionId, itemId } = selection;

        if (sectionId === null) {
            return;
        }

        scrollFrameTo({
            sectionId,
            path: itemId
                ? (handles.get(sectionId)?.pathOf(itemId) ?? null)
                : null,
        });
    }

    /** Adds a section from a template at `index` (the end when left out). */
    function addSection(
        template: SectionTemplate,
        index?: number,
    ): string | null {
        return insertSection(sectionFromTemplate(template), index);
    }

    /** Adds a synced section, as a ref to it, at `index` and picks it. */
    function addSyncedSection(
        ref: number | string,
        index?: number,
    ): string | null {
        return insertSection({ id: newSectionId(), type: 'ref', ref }, index);
    }

    /** Puts a new section at `index` (the end when left out) and picks it. */
    function insertSection(block: Section, index?: number): string | null {
        if (blocks.length >= MAX_SECTIONS) {
            return null;
        }

        const at = index === undefined ? blocks.length : index;

        updateBlocks((current) => [
            ...current.slice(0, at),
            block,
            ...current.slice(at),
        ]);
        selectSection(block.id);
        scrollToSection(block.id);

        return block.id;
    }

    /** Where a new section goes: after the picked one, or at the end. */
    function sectionInsertIndex(): number {
        const picked = selection.sectionId ? indexOf(selection.sectionId) : -1;

        return picked === -1 ? blocks.length : picked + 1;
    }

    /**
     * Where a tapped item goes: after the picked item, at the end of the
     * picked section, or at the end of the last section.
     */
    function defaultItemTarget(): ItemTarget | null {
        const picked = blocks.find(
            (block) => block.id === selection.sectionId,
        );

        if (picked?.type === 'rich') {
            return {
                sectionId: picked.id,
                place: selection.itemId
                    ? { blockId: selection.itemId, placement: 'after' }
                    : { blockId: null },
            };
        }

        const last = lastRich(blocks);

        return last ? { sectionId: last.id, place: { blockId: null } } : null;
    }

    function addItem(
        key: ItemKey,
        target: ItemTarget | null = defaultItemTarget(),
    ) {
        let goal = target;
        // The new item may land once the section's editor opens: one step.
        const step = form.newGroup();

        // An empty page gets a blank section to hold the item.
        if (goal === null) {
            const blank =
                templates.find((template) => template.key === 'blank') ??
                templates.at(-1);
            const sectionId = blank
                ? form.asStep(() => addSection(blank), step)
                : null;

            if (sectionId === null) {
                return;
            }

            goal = { sectionId, place: { blockId: null } };
        }

        const { sectionId, place } = goal;
        const section = blocks.find((block) => block.id === sectionId);

        // A synced section's words are not in this page.
        if (section?.type === 'ref' || locked(sectionId, 'content')) {
            return;
        }

        const layout = section?.data.layout ?? 'plain';

        // Only the picked section's editor is open, in the sidebar.
        if (!handles.has(sectionId)) {
            selectSection(sectionId);
        }

        withHandle(sectionId, (handle) => {
            const itemId = form.asStep(
                () =>
                    handle.insertItem(
                        key,
                        'path' in place ? besidePath(handle, place) : place,
                        layout,
                    ),
                step,
            );
            const item = itemId ? handle.getItem(itemId) : null;

            if (itemId && item) {
                openItem(handle, sectionId, itemId, item.type);
            } else {
                selectSection(sectionId);
            }
        });
    }

    /**
     * Puts a new item in the place of a picked one, like a photo where a
     * drawn picture was: one step to undo. The new item opens, as after Add.
     */
    function swapItem(sectionId: string, itemId: string, key: ItemKey) {
        const section = blocks.find((block) => block.id === sectionId);

        if (section?.type === 'ref' || locked(sectionId, 'content')) {
            return;
        }

        const layout = section?.data.layout ?? 'plain';

        withHandle(sectionId, (handle) => {
            const newId = form.asStep(() => {
                const inserted = handle.insertItem(
                    key,
                    { blockId: itemId, placement: 'after' },
                    layout,
                );

                if (inserted !== null && inserted !== itemId) {
                    handle.removeItem(itemId);
                }

                return inserted;
            });
            const item = newId ? handle.getItem(newId) : null;

            if (newId && item) {
                openItem(handle, sectionId, newId, item.type);
            } else {
                selectSection(sectionId);
            }
        });
    }

    /**
     * Changes one section, starting from its latest version. `group`
     * names the change for the undo history, like "words:<id>"; left
     * out, the change is a step of its own.
     */
    function updateSection(
        sectionId: string,
        update: (block: Section) => Section,
        group?: string,
    ) {
        updateAt(
            sectionId,
            (current, index) => replaceItem(current, index, update(current[index])),
            group,
        );
    }

    /**
     * Puts another section in a section's place, like a synced section's
     * copy, and picks it when the old one was picked.
     */
    function replaceSection(sectionId: string, next: Section) {
        updateSection(sectionId, () => next);

        if (next.id !== sectionId && selection.sectionId === sectionId) {
            selectSection(next.id);
        }
    }

    function moveSection(sectionId: string, offset: -1 | 1) {
        if (locked(sectionId, 'move')) {
            return;
        }

        updateAt(sectionId, (current, index) =>
            moveItem(current, index, offset),
        );
        // The page still shows the old order now.
        followInFrame({ sectionId, path: null });
    }

    function moveSectionTo(sectionId: string, target: number) {
        if (locked(sectionId, 'move')) {
            return;
        }

        updateAt(sectionId, (current, index) =>
            moveToIndex(current, index, target),
        );
    }

    function duplicateSection(sectionId: string) {
        const index = indexOf(sectionId);

        if (index === -1 || blocks.length >= MAX_SECTIONS) {
            return;
        }

        const copy = developer
            ? duplicateBlock(blocks[index])
            : withoutDeveloperData(duplicateBlock(blocks[index]));

        updateAt(sectionId, (current, at) => insertAfter(current, at, copy));
        selectSection(copy.id);
        scrollToSection(copy.id);
    }

    function removeSection(sectionId: string) {
        // Already gone, like after an undo: there is nothing to delete.
        if (indexOf(sectionId) === -1 || locked(sectionId, 'remove')) {
            return;
        }

        updateBlocks((current) =>
            current.filter((block) => block.id !== sectionId),
        );

        if (selection.sectionId === sectionId) {
            clearSelection();
        }
    }

    function toggleHidden(sectionId: string) {
        if (locked(sectionId, 'remove')) {
            return;
        }

        updateSection(sectionId, (block) => withHidden(block, !block.hidden));
    }

    /** One step back, and the pick follows the change. */
    function undo() {
        follow(form.undo());
    }

    /** One undone step forward again, and the pick follows the change. */
    function redo() {
        follow(form.redo());
    }

    function follow(move: HistoryMove | null) {
        if (move === null) {
            return;
        }

        const plan = followChange(move.before, move.after, selection);

        if (plan.kind === 'bring') {
            selectSection(plan.sectionId);
            scrollToSection(plan.sectionId);

            return;
        }

        if (plan.kind === 'clear') {
            clearSelection();

            return;
        }

        if (plan.words) {
            setWordsVersion((version) => version + 1);
        }

        if (plan.sectionOnly && selection.sectionId !== null) {
            selectSection(selection.sectionId);
        }
    }

    return {
        blocks,
        selection,
        panel,
        homePanel,
        sectionTab,
        setSectionTab,
        canAddSection: blocks.length < MAX_SECTIONS,
        handleFor: (sectionId: string | null) =>
            sectionId ? (handles.get(sectionId) ?? null) : null,
        openPanel,
        selectSection,
        selectItem,
        pointAtItem,
        pickOnPage,
        editInSection,
        clearSelection,
        selectPart,
        registerHandle,
        addSection,
        addSyncedSection,
        sectionInsertIndex,
        defaultItemTarget,
        addItem,
        swapItem,
        updateSection,
        replaceSection,
        moveSection,
        moveSectionTo,
        duplicateSection,
        removeSection,
        toggleHidden,
        scrollToSection,
        scrollToPicked,
        undo,
        redo,
        /** Changes when the picked section's editor must open again (undo). */
        wordsVersion,
    };
}

export type Builder = ReturnType<typeof useBuilder>;

/** A place on the page as a place in the editor. Unknown is the end. */
function besidePath(handle: SectionEditorHandle, place: PagePlace): ItemPlace {
    const blockId = handle.itemAtPath(place.path);

    return blockId === null
        ? { blockId: null }
        : { blockId, placement: place.placement };
}
