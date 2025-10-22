/**
 * Optimistic UI Updates with Undo
 *
 * Provides instant feedback for user actions with the ability to undo.
 */

'use client';

import { useState, useCallback } from 'react';
import { message } from 'antd';
import { UndoOutlined } from '@ant-design/icons';

export interface OptimisticAction<T> {
  /** Original data before change */
  previousData: T[];
  /** Updated data after change */
  newData: T[];
  /** Action description */
  description: string;
  /** Server-side operation to perform */
  serverAction: () => Promise<void>;
  /** Undo operation */
  undoAction?: () => Promise<void>;
}

/**
 * Hook for optimistic updates with undo functionality
 */
export function useOptimisticUpdate<T>() {
  const [actionHistory, setActionHistory] = useState<OptimisticAction<T>[]>([]);

  /**
   * Perform an optimistic update
   */
  const performOptimistic = useCallback(
    async (
      currentData: T[],
      updater: (data: T[]) => T[],
      description: string,
      serverAction: () => Promise<void>,
      undoAction?: () => Promise<void>
    ): Promise<T[]> => {
      const previousData = [...currentData];
      const newData = updater(currentData);

      // Show immediate UI update
      const action: OptimisticAction<T> = {
        previousData,
        newData,
        description,
        serverAction,
        undoAction,
      };

      // Show undo message
      const key = `optimistic-${Date.now()}`;
      message.success({
        content: (
          <span>
            {description}
            {undoAction && (
              <a
                className="ml-2 underline"
                onClick={async () => {
                  message.destroy(key);
                  await performUndo(action);
                }}
              >
                <UndoOutlined className="mr-1" />
                Undo
              </a>
            )}
          </span>
        ),
        key,
        duration: 5,
      });

      // Perform server action in background
      try {
        await serverAction();
      } catch (error) {
        // Rollback on error
        message.error(`Failed to ${description}: ${(error as Error).message}`);
        return previousData; // Return original data
      }

      setActionHistory((prev) => [...prev, action]);

      return newData;
    },
    []
  );

  /**
   * Undo the last action
   */
  const performUndo = useCallback(async (action: OptimisticAction<T>) => {
    if (action.undoAction) {
      try {
        message.loading('Undoing...', 0);
        await action.undoAction();
        message.destroy();
        message.success('Action undone');
        return action.previousData;
      } catch (error) {
        message.destroy();
        message.error(`Failed to undo: ${(error as Error).message}`);
        return action.newData;
      }
    }
    return action.previousData;
  }, []);

  return {
    performOptimistic,
    performUndo,
    actionHistory,
  };
}

/**
 * Optimistic bulk delete
 */
export function useOptimisticBulkDelete<T extends { id: string }>(
  data: T[],
  setData: (data: T[]) => void,
  deleteAPI: (ids: string[]) => Promise<void>
) {
  const { performOptimistic } = useOptimisticUpdate<T>();

  const bulkDelete = useCallback(
    async (idsToDelete: string[]) => {
      const newData = await performOptimistic(
        data,
        (current) => current.filter((item) => !idsToDelete.includes(item.id)),
        `Deleted ${idsToDelete.length} items`,
        () => deleteAPI(idsToDelete),
        // Undo would require restore API
        undefined
      );

      setData(newData);
    },
    [data, setData, performOptimistic, deleteAPI]
  );

  return { bulkDelete };
}

/**
 * Optimistic bulk update
 */
export function useOptimisticBulkUpdate<T extends { id: string }>(
  data: T[],
  setData: (data: T[]) => void,
  updateAPI: (ids: string[], updates: Partial<T>) => Promise<void>
) {
  const { performOptimistic } = useOptimisticUpdate<T>();

  const bulkUpdate = useCallback(
    async (idsToUpdate: string[], updates: Partial<T>, description: string) => {
      const originalItems = data.filter((item) => idsToUpdate.includes(item.id));

      const newData = await performOptimistic(
        data,
        (current) =>
          current.map((item) =>
            idsToUpdate.includes(item.id) ? { ...item, ...updates } : item
          ),
        description,
        () => updateAPI(idsToUpdate, updates),
        // Undo restores original values
        () =>
          updateAPI(
            idsToUpdate,
            originalItems.reduce((acc, item) => ({ ...acc, ...item }), {} as Partial<T>)
          )
      );

      setData(newData);
    },
    [data, setData, performOptimistic, updateAPI]
  );

  return { bulkUpdate };
}

/**
 * Optimistic single action
 */
export function useOptimisticAction<T>(
  onSuccess?: (newData: T) => void,
  onError?: (error: Error) => void
) {
  const [isOptimisticUpdate, setIsOptimisticUpdate] = useState(false);

  const performAction = useCallback(
    async (
      currentData: T,
      updater: (data: T) => T,
      description: string,
      serverAction: () => Promise<void>
    ) => {
      const previousData = currentData;
      const newData = updater(currentData);

      // Immediate UI update
      setIsOptimisticUpdate(true);
      onSuccess?.(newData);

      // Server action
      try {
        await serverAction();
        message.success(description);
      } catch (error) {
        // Rollback
        setIsOptimisticUpdate(false);
        onSuccess?.(previousData);
        onError?.(error as Error);
        message.error(`Failed to ${description}`);
      } finally {
        setIsOptimisticUpdate(false);
      }
    },
    [onSuccess, onError]
  );

  return {
    performAction,
    isOptimisticUpdate,
  };
}
