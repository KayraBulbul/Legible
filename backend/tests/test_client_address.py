from fastapi import Request

from api.client_address import client_address

TRUSTED_PROXIES = "127.0.0.1,10.0.0.0/8,100.0.0.0/8"


def request_from(
    peer: str,
    real_ip: str | None = None,
    forwarded_for: str | None = None,
) -> Request:
    headers = []
    if real_ip is not None:
        headers.append((b"x-real-ip", real_ip.encode("ascii")))
    if forwarded_for is not None:
        headers.append((b"x-forwarded-for", forwarded_for.encode("ascii")))
    return Request({"type": "http", "client": (peer, 1234), "headers": headers})


def test_railway_real_ip_is_used_for_trusted_proxy() -> None:
    request = request_from(
        "100.64.0.10",
        real_ip="203.0.113.24",
        forwarded_for="198.51.100.99",
    )

    assert client_address(request, TRUSTED_PROXIES) == "203.0.113.24"


def test_real_ip_is_ignored_for_untrusted_peer() -> None:
    request = request_from("198.51.100.10", "203.0.113.24")

    assert client_address(request, TRUSTED_PROXIES) == "198.51.100.10"


def test_invalid_real_ip_falls_back_to_trusted_peer() -> None:
    request = request_from("100.64.0.10", "not-an-ip-address")

    assert client_address(request, TRUSTED_PROXIES) == "100.64.0.10"


def test_forwarded_for_is_ignored() -> None:
    request = request_from("100.64.0.10", forwarded_for="198.51.100.99")

    assert client_address(request, TRUSTED_PROXIES) == "100.64.0.10"
