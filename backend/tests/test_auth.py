import time
import unittest
from types import SimpleNamespace
from unittest.mock import patch

import jwt
from cryptography.hazmat.primitives.asymmetric import rsa
from flask import g

import app as backend


class FakeJwksClient:
    def __init__(self, key):
        self.key = key

    def get_signing_key_from_jwt(self, _token):
        return SimpleNamespace(key=self.key)


class AuthRouteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
        )
        cls.public_key = cls.private_key.public_key()

    def setUp(self):
        self.client = backend.app.test_client()
        self.jwks_patcher = patch.object(
            backend,
            "_get_jwks_client",
            return_value=FakeJwksClient(self.public_key),
        )
        self.jwks_patcher.start()
        self.addCleanup(self.jwks_patcher.stop)

    def make_token(self, **overrides):
        now = int(time.time())
        claims = {
            "iss": backend.AUTH0_ISSUER,
            "aud": backend.AUTH0_AUDIENCE,
            "sub": "auth0|portfolio-test-user",
            "iat": now,
            "exp": now + 300,
        }
        claims.update(overrides)
        return jwt.encode(
            claims,
            self.private_key,
            algorithm="RS256",
            headers={"kid": "unit-test-key"},
        )

    def test_health_remains_public(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["status"], "ok")

    def test_cors_allows_configured_origin_but_not_arbitrary_origin(self):
        allowed_origin = backend.CORS_ORIGINS.split(",")[0].strip()
        allowed = self.client.options(
            "/search",
            headers={
                "Origin": allowed_origin,
                "Access-Control-Request-Method": "GET",
                "Access-Control-Request-Headers": "Authorization",
            },
        )
        self.assertEqual(
            allowed.headers.get("Access-Control-Allow-Origin"), allowed_origin
        )
        self.assertIn(
            "authorization",
            allowed.headers.get("Access-Control-Allow-Headers", "").lower(),
        )

        denied = self.client.options(
            "/search",
            headers={
                "Origin": "https://untrusted.example",
                "Access-Control-Request-Method": "GET",
            },
        )
        self.assertIsNone(denied.headers.get("Access-Control-Allow-Origin"))

    def test_all_tracker_data_routes_require_authentication(self):
        protected_paths = [
            "/watchlists",
            "/search?q=TCS",
            "/quote/TCS",
            "/quote-summary/TCS",
            "/stock/TCS",
            "/history/TCS",
            "/indicators/TCS",
            "/predict/TCS",
            "/signal/TCS",
            "/news/TCS",
            "/news?q=market",
            "/compare?symbols=TCS,INFY",
            "/predict?ticker=TCS",
        ]
        for path in protected_paths:
            with self.subTest(path=path):
                response = self.client.get(path)
                self.assertEqual(response.status_code, 401)
                self.assertEqual(
                    response.get_json(), {"error": "Authentication required."}
                )

    def test_invalid_token_is_rejected_without_details(self):
        response = self.client.get(
            "/search?q=TCS",
            headers={"Authorization": "Bearer not-a-jwt"},
        )
        self.assertEqual(response.status_code, 401)
        self.assertEqual(
            response.get_json(), {"error": "Invalid or expired access token."}
        )

    def test_wrong_audience_is_rejected(self):
        token = self.make_token(aud="https://wrong-api")
        response = self.client.get(
            "/search?q=TCS",
            headers={"Authorization": "Bearer %s" % token},
        )
        self.assertEqual(response.status_code, 401)

    def test_wrong_issuer_is_rejected(self):
        token = self.make_token(iss="https://untrusted.example/")
        response = self.client.get(
            "/search?q=TCS",
            headers={"Authorization": "Bearer %s" % token},
        )
        self.assertEqual(response.status_code, 401)

    def test_invalid_signature_is_rejected(self):
        other_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        token = jwt.encode(
            {
                "iss": backend.AUTH0_ISSUER,
                "aud": backend.AUTH0_AUDIENCE,
                "sub": "auth0|forged-user",
                "exp": int(time.time()) + 300,
            },
            other_key,
            algorithm="RS256",
            headers={"kid": "unit-test-key"},
        )
        response = self.client.get(
            "/search?q=TCS",
            headers={"Authorization": "Bearer %s" % token},
        )
        self.assertEqual(response.status_code, 401)

    def test_expired_token_is_rejected(self):
        token = self.make_token(exp=int(time.time()) - 60)
        response = self.client.get(
            "/search?q=TCS",
            headers={"Authorization": "Bearer %s" % token},
        )
        self.assertEqual(response.status_code, 401)

    def test_valid_token_authorizes_api_and_exposes_subject(self):
        token = self.make_token()

        def search_with_identity(query, limit=10):
            self.assertEqual(g.auth_user_id, "auth0|portfolio-test-user")
            return [{"symbol": "TCS.NS"}]

        with patch.object(
            backend.search,
            "search_symbols",
            side_effect=search_with_identity,
        ):
            response = self.client.get(
                "/search?q=TCS",
                headers={"Authorization": "Bearer %s" % token},
            )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["results"][0]["symbol"], "TCS.NS")


if __name__ == "__main__":
    unittest.main()
