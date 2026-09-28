import React from 'react';
import ReactDOM from 'react-dom/client';
import { Auth0Provider } from '@auth0/auth0-react';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

const root = ReactDOM.createRoot(document.getElementById('root'));
const auth0Domain = process.env.REACT_APP_AUTH0_DOMAIN;
const auth0ClientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
const auth0Audience = process.env.REACT_APP_AUTH0_AUDIENCE;

function AuthConfigurationMessage() {
  return (
    <main className="auth-screen">
      <section className="auth-panel" role="alert">
        <span className="auth-mark" aria-hidden="true">◈</span>
        <p className="auth-eyebrow">Market AI Tracker</p>
        <h1>Authentication is not configured</h1>
        <p className="auth-description">
          Set the Auth0 domain, client ID, and API audience for this environment.
        </p>
      </section>
    </main>
  );
}

root.render(
  <React.StrictMode>
    {auth0Domain && auth0ClientId && auth0Audience ? (
      <Auth0Provider
        domain={auth0Domain}
        clientId={auth0ClientId}
        cacheLocation="memory"
        useRefreshTokens
        useRefreshTokensFallback
        authorizationParams={{
          redirect_uri: window.location.origin,
          audience: auth0Audience,
        }}
      >
        <App />
      </Auth0Provider>
    ) : (
      <AuthConfigurationMessage />
    )}
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
