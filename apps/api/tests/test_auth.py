import httpx
from fastapi.testclient import TestClient

from app import main


client = TestClient(main.app)


def supabase_response(status_code: int, payload: dict) -> httpx.Response:
    return httpx.Response(
        status_code,
        json=payload,
        request=httpx.Request("GET", "https://example.supabase.co"),
    )


def configure_supabase_admin(monkeypatch) -> None:
    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key")


def test_user_id_availability_requires_admin_env(monkeypatch) -> None:
    monkeypatch.delenv("SUPABASE_URL", raising=False)
    monkeypatch.delenv("SUPABASE_SERVICE_ROLE_KEY", raising=False)

    response = client.get(
        "/api/auth/user-id-availability",
        params={"user_id": "runner"},
    )

    assert response.status_code == 503


def test_user_id_availability_returns_available(monkeypatch) -> None:
    configure_supabase_admin(monkeypatch)

    def fake_get(*args, **kwargs) -> httpx.Response:
        return supabase_response(200, {"users": []})

    monkeypatch.setattr(main.httpx, "get", fake_get)

    response = client.get(
        "/api/auth/user-id-availability",
        params={"user_id": "Runner"},
    )

    assert response.status_code == 200
    assert response.json() == {"user_id": "runner", "available": True}


def test_user_id_availability_returns_unavailable(monkeypatch) -> None:
    configure_supabase_admin(monkeypatch)

    def fake_get(*args, **kwargs) -> httpx.Response:
        return supabase_response(
            200,
            {"users": [{"email": "runner@polling-in-run.local"}]},
        )

    monkeypatch.setattr(main.httpx, "get", fake_get)

    response = client.get(
        "/api/auth/user-id-availability",
        params={"user_id": "runner"},
    )

    assert response.status_code == 200
    assert response.json() == {"user_id": "runner", "available": False}


def test_delete_account_requires_bearer_token() -> None:
    response = client.delete("/api/auth/account")

    assert response.status_code == 401


def test_delete_account_verifies_and_deletes_supabase_user(monkeypatch) -> None:
    configure_supabase_admin(monkeypatch)
    calls = []

    def fake_get(url, **kwargs) -> httpx.Response:
        calls.append(("get", url, kwargs["headers"]["Authorization"]))
        return supabase_response(200, {"id": "auth-user-id"})

    def fake_delete(url, **kwargs) -> httpx.Response:
        calls.append(("delete", url, kwargs["headers"]["Authorization"]))
        return supabase_response(200, {})

    monkeypatch.setattr(main.httpx, "get", fake_get)
    monkeypatch.setattr(main.httpx, "delete", fake_delete)

    response = client.delete(
        "/api/auth/account",
        headers={"Authorization": "Bearer user-access-token"},
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Account deleted"}
    assert calls == [
        (
            "get",
            "https://example.supabase.co/auth/v1/user",
            "Bearer user-access-token",
        ),
        (
            "delete",
            "https://example.supabase.co/auth/v1/admin/users/auth-user-id",
            "Bearer service-role-key",
        ),
    ]
