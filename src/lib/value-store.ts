import { useCallback, useSyncExternalStore } from 'react'

/**
 * One value that changes often, held outside React state: only the components that read a part of it re-render, and
 * only when that part changes (the screen holding it does not).
 */
export interface ValueStore<T> {
  get: () => T
  set: (next: T) => void
  subscribe: (listener: () => void) => () => void
}

export function createValueStore<T>(initial: T): ValueStore<T> {
  let value = initial
  const listeners = new Set<() => void>()
  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return
      value = next
      listeners.forEach((listener) => listener())
    },
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}

/**
 * The part of the store's value `select` picks, re-read when the value changes. `select` should be defined once (at
 * module level) and must return the same value (a primitive, or an object already in the store) for the same input,
 * or the component re-renders on every change.
 */
export function useStoreValue<T, S>(store: ValueStore<T>, select: (value: T) => S): S {
  const read = useCallback(() => select(store.get()), [store, select])
  return useSyncExternalStore(store.subscribe, read, read)
}
