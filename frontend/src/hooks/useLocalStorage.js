import { useEffect, useState } from "react";

/** State persisted to localStorage (portfolio, recents, settings). */
export default function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = window.localStorage.getItem(key);
      return raw !== null ? JSON.parse(raw) : initialValue;
    } catch (e) {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* quota / private mode — ignore */
    }
  }, [key, value]);

  return [value, setValue];
}
