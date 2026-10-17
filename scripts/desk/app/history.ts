import { useRef } from 'react';

// Undo and redo for an editor's whole state. Changes less than a moment apart
// (a burst of typing) count as one step.
export function useHistory<T>() {
  const past = useRef<T[]>([]);
  const future = useRef<T[]>([]);
  const last = useRef(0);
  return {
    // Call with the state as it was, before a change.
    record(before: T) {
      const now = Date.now();
      if (now - last.current > 800 || !past.current.length) {
        past.current.push(structuredClone(before));
        if (past.current.length > 200) past.current.shift();
      }
      last.current = now;
      future.current = [];
    },
    undo(current: T): T | null {
      const prev = past.current.pop();
      if (prev === undefined) return null;
      future.current.push(structuredClone(current));
      last.current = 0;
      return prev;
    },
    redo(current: T): T | null {
      const next = future.current.pop();
      if (next === undefined) return null;
      past.current.push(structuredClone(current));
      last.current = 0;
      return next;
    },
  };
}
