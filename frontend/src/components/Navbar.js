/** Primary navigation + brand header. Responsive: collapses on mobile. */
export default function Navbar({ route, onNavigate, children, userLabel, onLogout }) {
  const links = [
    { id: "dashboard", label: "Dashboard" },
    { id: "markets", label: "Markets" },
    { id: "compare", label: "Compare" },
    { id: "portfolio", label: "Portfolio" },
    { id: "news", label: "News" },
    { id: "analytics", label: "Analytics" },
    { id: "settings", label: "Settings" },
  ];

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <button
          type="button"
          className="brand"
          onClick={() => onNavigate("dashboard")}
          aria-label="Market AI Tracker home"
        >
          <span className="brand-mark" aria-hidden="true">
            ◈
          </span>
          <span className="brand-text">
            Market <strong>AI</strong> Tracker
          </span>
        </button>

        <nav className="nav-links" aria-label="Main navigation">
          {links.map((l) => (
            <button
              key={l.id}
              type="button"
              className={`nav-link ${route === l.id ? "active" : ""}`}
              onClick={() => onNavigate(l.id)}
              aria-current={route === l.id ? "page" : undefined}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <div className="navbar-search">{children}</div>
        <div className="account-controls">
          <span className="account-label" title={userLabel}>{userLabel}</span>
          <button type="button" className="btn btn-ghost btn-small" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
