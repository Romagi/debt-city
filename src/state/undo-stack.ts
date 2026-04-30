import { useCallback, useRef, useState } from 'react';
import type { GridState } from '../types/portfolio';

/** Lightweight undo/redo for *construction* actions only.
 *
 *  The hook stores grid snapshots (one per construction action) in two stacks:
 *  - `undoStack`: snapshots of grids BEFORE each action. Pop = undo.
 *  - `redoStack`: snapshots of grids that were "current" when undo was called.
 *
 *  Usage in App.tsx:
 *  1. Wrap any construction-related dispatch with a call to `pushSnapshot(currentGrid)`
 *     BEFORE the dispatch — so the stack always holds the "before" state.
 *  2. Bind Cmd+Z to `undo()` and Cmd+Shift+Z to `redo()`.
 *  3. The hook dispatches a RESTORE_GRID action on undo/redo to replace the grid.
 *
 *  Memory: capped at `maxSize` snapshots. Each snapshot = one GridState (~few hundred KB).
 *  At 50 entries, total memory footprint is bounded to ~10 MB worst case.
 */

interface Dispatch {
  (action: { type: 'RESTORE_GRID'; payload: { grid: GridState } }): void;
}

interface UseUndoStackResult {
  pushSnapshot: (snapshot: GridState) => void;
  undo: () => boolean;
  redo: () => boolean;
  /** Reactive sizes — re-render consumers (Toolbar) when stacks change so the
   *  Cmd+Z hint can be enabled/disabled accordingly. */
  canUndo: boolean;
  canRedo: boolean;
  clear: () => void;
}

export function useUndoStack(
  currentGrid: GridState,
  dispatch: Dispatch,
  maxSize = 50,
): UseUndoStackResult {
  const undoRef = useRef<GridState[]>([]);
  const redoRef = useRef<GridState[]>([]);

  // Mirror current grid in a ref so undo/redo callbacks stay stable
  const gridRef = useRef(currentGrid);
  gridRef.current = currentGrid;

  // Reactive sizes — used to drive UI affordances (e.g. disable button)
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const pushSnapshot = useCallback((snapshot: GridState) => {
    undoRef.current.push(snapshot);
    if (undoRef.current.length > maxSize) undoRef.current.shift();
    // Any new construction action invalidates the redo branch
    redoRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [maxSize]);

  const undo = useCallback((): boolean => {
    const prev = undoRef.current.pop();
    if (!prev) return false;
    redoRef.current.push(gridRef.current);
    dispatch({ type: 'RESTORE_GRID', payload: { grid: prev } });
    setCanUndo(undoRef.current.length > 0);
    setCanRedo(true);
    return true;
  }, [dispatch]);

  const redo = useCallback((): boolean => {
    const next = redoRef.current.pop();
    if (!next) return false;
    undoRef.current.push(gridRef.current);
    dispatch({ type: 'RESTORE_GRID', payload: { grid: next } });
    setCanUndo(true);
    setCanRedo(redoRef.current.length > 0);
    return true;
  }, [dispatch]);

  const clear = useCallback(() => {
    undoRef.current = [];
    redoRef.current = [];
    setCanUndo(false);
    setCanRedo(false);
  }, []);

  return { pushSnapshot, undo, redo, canUndo, canRedo, clear };
}
