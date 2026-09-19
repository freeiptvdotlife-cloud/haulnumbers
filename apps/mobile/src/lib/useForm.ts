import { useCallback, useState } from "react";

/** String state for a form: every field is text so a blank field can be told apart from 0. */
export function useForm<T extends Record<string, string>>(initial: T) {
  const [v, setV] = useState<T>(initial);
  const set = useCallback(<K extends keyof T>(key: K) => (text: string) => setV((prev) => ({ ...prev, [key]: text })), []);
  return { v, set };
}
