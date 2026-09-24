/**
 * Consistent, non-blocking error panel. Uses the backend's honest error
 * messages (invalid symbol, rate limit, timeout...) instead of alert().
 */
export default function ErrorState({ error, onRetry = null }) {
  const message =
    typeof error === "string"
      ? error
      : error && error.message
      ? error.message
      : "Unexpected error.";

  return (
    <div className="error-state" role="alert">
      <span className="error-icon" aria-hidden="true">
        ⚠
      </span>
      <div>
        <p className="error-title">Unable to load data</p>
        <p className="error-detail">{message}</p>
        {onRetry && (
          <button type="button" className="btn btn-ghost" onClick={onRetry}>
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
