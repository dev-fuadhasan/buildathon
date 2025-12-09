/**
 * Safe Async Wrapper for Event Handlers
 * Prevents unhandled promise rejections from breaking the entire app
 * 
 * ROOT CAUSE: Async onClick handlers without try-catch cause unhandled rejections
 * SOLUTION: Universal wrapper that catches all errors and prevents app breakage
 */

type AsyncFunction = (...args: any[]) => Promise<any>;

/**
 * Wraps an async function to catch all errors and prevent unhandled rejections
 * @param fn - Async function to wrap
 * @param onError - Optional custom error handler
 * @returns Wrapped function that never throws
 */
export function safeAsync<T extends AsyncFunction>(
  fn: T,
  onError?: (error: Error) => void
): T {
  return ((...args: any[]) => {
    Promise.resolve(fn(...args)).catch((error) => {
      console.error('[SafeAsync] Caught error in async handler:', error);
      
      // Call custom error handler if provided
      if (onError) {
        try {
          onError(error);
        } catch (handlerError) {
          console.error('[SafeAsync] Error handler itself threw:', handlerError);
        }
      }
      
      // Prevent unhandled rejection
      // Error is logged but doesn't break the app
    });
  }) as T;
}

/**
 * React-specific wrapper for async onClick handlers
 * Automatically handles loading states and error messages
 * 
 * @example
 * ```tsx
 * <button onClick={safeAsyncClick(async () => {
 *   await fetch('/api/endpoint');
 * }, setLoading, setError)}>
 *   Click me
 * </button>
 * ```
 */
export function safeAsyncClick(
  fn: () => Promise<void>,
  setLoading?: (loading: boolean) => void,
  setError?: (error: string) => void
): () => void {
  return () => {
    if (setLoading) setLoading(true);
    if (setError) setError("");
    
    Promise.resolve(fn())
      .catch((error) => {
        console.error('[SafeAsyncClick] Error:', error);
        if (setError) {
          setError(error.message || "An error occurred. Please try again.");
        }
      })
      .finally(() => {
        if (setLoading) setLoading(false);
      });
  };
}

/**
 * Global unhandled rejection handler
 * Call this once in your app's root component
 */
export function initGlobalErrorHandlers() {
  // Handle unhandled promise rejections
  if (typeof window !== 'undefined') {
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[Global] Unhandled promise rejection:', event.reason);
      
      // Prevent default behavior (which can break the app)
      event.preventDefault();
      
      // Log to monitoring service if available
      // trackError('unhandled_rejection', event.reason);
    });
    
    // Handle global errors
    window.addEventListener('error', (event) => {
      console.error('[Global] Uncaught error:', event.error);
      
      // Don't prevent default for script errors
      // but log them for monitoring
    });
    
    console.log('[SafeAsync] Global error handlers initialized');
  }
}

