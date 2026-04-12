/**
 * IPC Utilities
 * Adds timeout and error handling for IPC calls
 */

const DEFAULT_IPC_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Wrap an IPC call with timeout
 * Prevents hanging requests from blocking the UI indefinitely
 */
export async function withIpcTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = DEFAULT_IPC_TIMEOUT_MS,
  callName: string = 'IPC call'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${callName} timed out after ${timeoutMs}ms`)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Create a wrapped version of an async function with timeout
 */
export function withTimeout<Args extends any[], R>(
  fn: (...args: Args) => Promise<R>,
  timeoutMs: number = DEFAULT_IPC_TIMEOUT_MS,
  callName?: string
): (...args: Args) => Promise<R> {
  return async (...args: Args): Promise<R> => {
    const name = callName || fn.name || 'IPC call';
    return withIpcTimeout(fn(...args), timeoutMs, name);
  };
}

/**
 * Example usage in component:
 * 
 * const getTasks = withTimeout(
 *   async (date: string) => window.api.db.getTodayTasks(date),
 *   5000,
 *   'getTodayTasks'
 * );
 * 
 * try {
 *   const tasks = await getTasks(today);
 * } catch (error) {
 *   if (error.message.includes('timed out')) {
 *     // Handle timeout
 *   }
 * }
 */
