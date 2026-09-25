/** Loading skeleton / spinner states shared across pages. */
export default function LoadingState({ label = "Loading market data…", rows = 0 }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{label}</p>
      {rows > 0 && (
        <div className="skeleton-stack" aria-hidden="true">
          {Array.from({ length: rows }).map((_, i) => (
            <div className="skeleton-row" key={i} />
          ))}
        </div>
      )}
    </div>
  );
}
