/**
 * Tiny pub/sub toast bus — avoids prop drilling or a context dependency.
 * Components call toast(message, type); <ToastHost /> renders them.
 */
let listeners = [];

export function toast(message, type = "info") {
  const item = { id: Date.now() + Math.random(), message, type };
  listeners.forEach((fn) => fn(item));
}

export function subscribe(fn) {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((f) => f !== fn);
  };
}

export default toast;
