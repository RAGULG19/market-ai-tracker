import { useEffect, useState } from "react";
import { subscribe } from "../services/toast";

/** Renders toast notifications pushed via services/toast.js. */
export default function ToastHost() {
  const [items, setItems] = useState([]);

  useEffect(
    () =>
      subscribe((item) => {
        setItems((prev) => [...prev, item]);
        setTimeout(
          () => setItems((prev) => prev.filter((t) => t.id !== item.id)),
          5000
        );
      }),
    []
  );

  if (!items.length) return null;
  return (
    <div className="toast-host" role="region" aria-label="Notifications">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <span>{t.message}</span>
          <button
            type="button"
            aria-label="Dismiss notification"
            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
