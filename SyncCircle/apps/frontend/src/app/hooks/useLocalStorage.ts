import { useState, useEffect, useCallback } from 'react';

/**
 * A generic React hook for reading and writing typed values to localStorage
 * with automatic re-render on change and cross-tab synchronization.
 *
 * @param key - The localStorage key to read/write
 * @param initialValue - The default value if nothing is stored
 * @returns A tuple of [storedValue, setValue] similar to useState
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  // Initialize state with value from localStorage or the provided initial value
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item !== null ? (JSON.parse(item) as T) : initialValue;
    } catch {
      // If JSON parse fails, fall back to initialValue
      return initialValue;
    }
  });

  // Setter that persists to localStorage and triggers re-render
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      setStoredValue((prev) => {
        const nextValue =
          value instanceof Function ? value(prev) : value;

        try {
          window.localStorage.setItem(key, JSON.stringify(nextValue));
        } catch {
          // Silently handle storage errors (e.g., quota exceeded)
          console.warn(
            `[useLocalStorage] Failed to write key "${key}" to localStorage`
          );
        }

        return nextValue;
      });
    },
    [key]
  );

  // Listen for storage events to sync across tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== key) return;

      try {
        const newValue =
          event.newValue !== null
            ? (JSON.parse(event.newValue) as T)
            : initialValue;
        setStoredValue(newValue);
      } catch {
        // If parse fails on cross-tab update, fall back to initialValue
        setStoredValue(initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [key, initialValue]);

  return [storedValue, setValue];
}
