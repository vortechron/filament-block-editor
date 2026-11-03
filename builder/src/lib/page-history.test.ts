import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    canRedo,
    canUndo,
    emptyHistory,
    changeGroup,
    HISTORY_LIMIT,
    record,
    redo,
    undo,
} from './page-history';

type Value = { words: string };

const value = (words: string): Value => ({ words });

describe('the page history', () => {
    it('starts with nothing to undo or redo', () => {
        const history = emptyHistory<Value>();

        expect(canUndo(history)).toBe(false);
        expect(canRedo(history)).toBe(false);
        expect(undo(history, value('a'))).toBeNull();
        expect(redo(history, value('a'))).toBeNull();
    });

    it('undoes a change back to the value before it, and redoes it again', () => {
        const history = record(emptyHistory<Value>(), value('a'), value('b'), {
            group: 'words',
            now: 0,
        });

        const undone = undo(history, value('b'));

        expect(undone?.value).toEqual(value('a'));
        expect(canUndo(undone!.history)).toBe(false);
        expect(canRedo(undone!.history)).toBe(true);

        const redone = redo(undone!.history, value('a'));

        expect(redone?.value).toEqual(value('b'));
        expect(canUndo(redone!.history)).toBe(true);
        expect(canRedo(redone!.history)).toBe(false);
    });
});

/** Types "Hello" into one group, a letter every `gap` ms from `start`. */
function typeHello(gap: number, start = 0) {
    let history = emptyHistory<Value>();
    let words = '';

    [...'Hello'].forEach((letter, index) => {
        const before = value(words);

        words += letter;
        history = record(history, before, value(words), {
            group: 'words:hero',
            now: start + index * gap,
        });
    });

    return history;
}

describe('steps', () => {
    it('are one step for changes in one group less than a second apart, like typing a sentence', () => {
        // 5 letters over 2.4 s: each one within 600 ms of the one before.
        const history = typeHello(600);

        expect(history.past).toEqual([value('')]);
        expect(undo(history, value('Hello'))?.value).toEqual(value(''));
    });

    it('start again after a pause longer than a second', () => {
        let history = typeHello(100);

        history = record(history, value('Hello'), value('Hello!'), {
            group: 'words:hero',
            now: 400 + 1001,
        });

        expect(history.past).toEqual([value(''), value('Hello')]);
    });

    it('start again for a change in another group, however soon: a builder action is its own step', () => {
        let history = typeHello(100);

        history = record(history, value('Hello'), value('Hello, hidden'), {
            group: 'action:1',
            now: 450,
        });
        history = record(history, value('Hello, hidden'), value('Hello, hidden!'), {
            group: 'words:hero',
            now: 500,
        });

        expect(history.past).toEqual([value(''), value('Hello'), value('Hello, hidden')]);
    });

    it('are one for a builder action (a "step:" group) whose changes come far apart, like an item added once its editor opens', () => {
        let history = record(emptyHistory<Value>(), value(''), value('section'), {
            group: 'step:7',
            now: 0,
        });

        history = record(history, value('section'), value('section, item'), {
            group: 'step:7',
            now: 5000,
        });

        expect(history.past).toEqual([value('')]);
    });

    it('record nothing for a change that leaves the value as it was, like an editor writing the same words back', () => {
        const history = typeHello(100);
        // A copy, not the same object: equal values are no change.
        const same = record(history, value('Hello'), value('Hello'), {
            group: 'action:2',
            now: 450,
        });

        expect(same).toBe(history);
    });

    it('are dropped when the changes end where they began, so an undo always changes something', () => {
        let history = typeHello(100);

        history = record(history, value('Hello'), value(''), {
            group: 'words:hero',
            now: 500,
        });

        expect(canUndo(history)).toBe(false);

        // The next change starts its own step from there.
        history = record(history, value(''), value('H'), { group: 'words:hero', now: 600 });

        expect(history.past).toEqual([value('')]);
    });

    it('are at most 100: the oldest drops', () => {
        let history = emptyHistory<Value>();

        for (let index = 0; index < HISTORY_LIMIT + 5; index++) {
            history = record(history, value(String(index)), value(String(index + 1)), {
                group: `action:${index}`,
                now: index,
            });
        }

        expect(history.past).toHaveLength(HISTORY_LIMIT);
        expect(history.past[0]).toEqual(value('5'));
        expect(history.past.at(-1)).toEqual(value('104'));
    });
});

describe('undo and redo', () => {
    it('lose the redo steps when a new change comes after an undo', () => {
        const undone = undo(typeHello(100), value('Hello'))!;
        const history = record(undone.history, value(''), value('Hi'), {
            group: 'words:hero',
            now: 5000,
        });

        expect(canRedo(history)).toBe(false);
        expect(history.past).toEqual([value('')]);
    });

    it('end the step, so typing right after an undo is a step of its own', () => {
        const undone = undo(
            record(emptyHistory<Value>(), value('a'), value('ab'), { group: 'words:hero', now: 0 }),
            value('ab'),
        )!;
        const history = record(undone.history, value('a'), value('ac'), {
            group: 'words:hero',
            now: 10,
        });

        expect(history.past).toEqual([value('a')]);
        expect(undo(history, value('ac'))?.value).toEqual(value('a'));
    });

    it('go back and forth through several steps', () => {
        let history = emptyHistory<Value>();

        history = record(history, value('a'), value('b'), { group: 'one', now: 0 });
        history = record(history, value('b'), value('c'), { group: 'two', now: 0 });

        const first = undo(history, value('c'))!;
        const second = undo(first.history, first.value)!;

        expect([first.value, second.value]).toEqual([value('b'), value('a')]);
        expect(undo(second.history, second.value)).toBeNull();

        const again = redo(second.history, second.value)!;

        expect(again.value).toEqual(value('b'));
        expect(redo(again.history, again.value)?.value).toEqual(value('c'));
    });
});

describe('a change group', () => {
    it('names what changed, a few levels deep, so another field is another group', () => {
        const before = { anchor: null, width: 'normal', style: { desktop: { padding_top: '8px' } } };

        expect(changeGroup('look:hero', before, { ...before, anchor: 'tent' })).toBe('look:hero:anchor');
        expect(changeGroup('look:hero', before, { ...before, anchor: 'tentang' })).toBe('look:hero:anchor');
        expect(changeGroup('look:hero', before, { ...before, width: 'full' })).toBe('look:hero:width');
        expect(
            changeGroup('look:hero', before, {
                ...before,
                style: { desktop: { padding_top: '8px', margin_top: '4px' } },
            }),
        ).toBe('look:hero:style.desktop.margin_top');
        expect(
            changeGroup('item:butn', { text: 'Hubungi' }, { text: 'Hubungi kami', url: '/' }),
        ).toBe('item:butn:text,url');
    });
});

describe('comparing pages', () => {
    type Page = { sections: { id: string; data: { words: string; style: Record<string, string> } }[] };

    const page: Page = {
        sections: Array.from({ length: 30 }, (_, index) => ({
            id: `s${index}`,
            data: { words: `Seksyen ${index}`, style: { padding: '8px' } },
        })),
    };
    const withWords = (from: Page, index: number, words: string): Page => ({
        sections: from.sections.map((section, at) =>
            at === index ? { ...section, data: { ...section.data, words } } : section,
        ),
    });

    afterEach(() => vi.restoreAllMocks());

    it('records nothing for the same page, without turning it into JSON', () => {
        const json = vi.spyOn(JSON, 'stringify');
        const history = emptyHistory<Page>();

        expect(record(history, page, page, { group: 'words:s3', now: 0 })).toBe(history);
        expect(json).not.toHaveBeenCalled();
    });

    it('looks only at the sections that changed, and turns none into JSON', () => {
        const json = vi.spyOn(JSON, 'stringify');
        let history = record(emptyHistory<Page>(), page, withWords(page, 3, 'Baru'), {
            group: 'words:s3',
            now: 0,
        });

        history = record(history, withWords(page, 3, 'Baru'), withWords(page, 3, 'Baru!'), {
            group: 'words:s3',
            now: 10,
        });

        expect(history.past).toEqual([page]);
        expect(json).not.toHaveBeenCalled();
    });

    it('still finds a copy with the same words the same page', () => {
        const copy = withWords(page, 3, 'Seksyen 3');
        const history = emptyHistory<Page>();

        expect(copy.sections[3]).not.toBe(page.sections[3]);
        expect(record(history, page, copy, { group: 'words:s3', now: 0 })).toBe(history);
    });
});
