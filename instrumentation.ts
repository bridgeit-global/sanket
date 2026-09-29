import { registerOTel } from '@vercel/otel';

/**
 * Node 25 defines `globalThis.localStorage` even when `--localstorage-file`
 * is missing, but `getItem` is not a function. Next.js dev overlay and other
 * SSR code treat "localStorage exists" as "it is usable" and crash the page.
 */
function installServerLocalStorage() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  let usable = false;
  try {
    usable = typeof globalThis.localStorage?.getItem === 'function';
  } catch {
    usable = false;
  }
  if (usable) return;

  const memory = new Map<string, string>();
  const storage: Storage = {
    get length() {
      return memory.size;
    },
    clear() {
      memory.clear();
    },
    getItem(key) {
      const value = memory.get(String(key));
      return value === undefined ? null : value;
    },
    key(index) {
      return Array.from(memory.keys())[index] ?? null;
    },
    removeItem(key) {
      memory.delete(String(key));
    },
    setItem(key, value) {
      memory.set(String(key), String(value));
    },
  };

  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: storage,
  });
}

export function register() {
  installServerLocalStorage();
  registerOTel({ serviceName: 'ai-chatbot' });
}
