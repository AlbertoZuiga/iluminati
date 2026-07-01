import { useSyncExternalStore } from "react"

const STORAGE_KEY = "iluminati.currentUserId"
const EVENT = "iluminati:currentUserChanged"

function getSnapshot() {
  return localStorage.getItem(STORAGE_KEY)
}

function subscribe(callback) {
  window.addEventListener(EVENT, callback)
  window.addEventListener("storage", callback)
  return () => {
    window.removeEventListener(EVENT, callback)
    window.removeEventListener("storage", callback)
  }
}

export function setCurrentUserId(id) {
  if (id) localStorage.setItem(STORAGE_KEY, id)
  else localStorage.removeItem(STORAGE_KEY)
  window.dispatchEvent(new Event(EVENT))
}

export function useCurrentUserId() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
