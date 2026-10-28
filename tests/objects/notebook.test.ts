import { describe, expect, it } from 'vitest';
import { notebook, type NotebookBinding } from '../../src/objects/notebook';

function fakeBook() {
  const log: string[] = [];
  let pending: (() => void) | undefined;
  const binding: NotebookBinding = {
    open(done) {
      log.push('open');
      pending = done;
    },
    close(done) {
      log.push('close');
      pending = done;
    },
    setContentVisible: (v) => log.push(v ? 'show' : 'hide'),
  };
  return { log, binding, finish: () => pending?.() };
}

describe('notebook', () => {
  it('hides the spread on bind', () => {
    const book = fakeBook();
    notebook.bind(book.binding);
    expect(book.log).toEqual(['hide']);
  });

  it('opens the cover on arrival and shows the spread once it is open', () => {
    const book = fakeBook();
    notebook.bind(book.binding);
    notebook.onEnter?.();
    expect(book.log).toEqual(['hide', 'open']);
    book.finish();
    expect(book.log).toEqual(['hide', 'open', 'show']);
  });

  it('on exit hides the spread, closes the cover, and resolves when it is closed', async () => {
    const book = fakeBook();
    notebook.bind(book.binding);
    notebook.onEnter?.();
    book.finish();
    let closed = false;
    const exiting = notebook.onExit?.();
    void exiting?.then(() => (closed = true));
    expect(book.log.slice(-2)).toEqual(['hide', 'close']);
    await Promise.resolve();
    expect(closed).toBe(false);
    book.finish();
    await exiting;
    expect(closed).toBe(true);
  });

  it('has a top-down focus view', () => {
    expect(notebook.focus?.viewDirection).toEqual([0, -1, 0]);
  });
});
