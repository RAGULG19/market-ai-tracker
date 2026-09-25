/**
 * Real news headlines (Yahoo Finance) with lexicon sentiment badges.
 * Shows a clean unavailable state instead of fabricated content.
 */
function sentimentClass(label) {
  if (label === "Positive") return "pos";
  if (label === "Negative") return "neg";
  return "neu";
}

export default function NewsPanel({ news, compact = false }) {
  if (!news) return null;

  if (!news.available) {
    return (
      <div className="card news-card">
        <h3 className="card-title">News</h3>
        <p className="empty-state">
          News unavailable — {news.unavailable_reason || "no recent articles returned."}
        </p>
      </div>
    );
  }

  return (
    <div className="card news-card">
      <div className="news-head">
        <h3 className="card-title">News</h3>
        <span className="method-badge" title={news.method}>
          Sentiment: lexicon scoring
        </span>
      </div>
      <ul className="news-list">
        {news.items.slice(0, compact ? 4 : 10).map((item, i) => (
          <li className="news-item" key={`${item.url || item.title}-${i}`}>
            <div className="news-item-head">
              <span
                className={`sentiment ${sentimentClass(item.sentiment.label)}`}
                title={`Score ${item.sentiment.score} · ${news.method}`}
              >
                {item.sentiment.label}
              </span>
              <span className="news-source">{item.source}</span>
              {item.published && (
                <time className="news-time">
                  {String(item.published).slice(0, 10)}
                </time>
              )}
            </div>
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="news-title"
              >
                {item.title}
              </a>
            ) : (
              <span className="news-title">{item.title}</span>
            )}
          </li>
        ))}
      </ul>
      <p className="chart-note">{news.method}</p>
    </div>
  );
}
