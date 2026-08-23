from ipaddress import IPv4Address, IPv6Address, ip_address, ip_network

from fastapi import Request


def client_address(request: Request, trusted_proxy_ips: str) -> str:
    """Return a normalized address without trusting headers from direct clients."""
    peer = _parse_address(request.client.host if request.client is not None else None)
    if peer is None:
        return "unknown"

    if not _is_trusted_proxy(peer, trusted_proxy_ips):
        return str(peer)

    forwarded = _parse_address(request.headers.get("x-real-ip"))
    return str(forwarded) if forwarded is not None else str(peer)


def _parse_address(value: str | None) -> IPv4Address | IPv6Address | None:
    if value is None:
        return None
    try:
        return ip_address(value.strip())
    except ValueError:
        return None


def _is_trusted_proxy(
    address: IPv4Address | IPv6Address,
    trusted_proxy_ips: str,
) -> bool:
    return any(
        address in ip_network(value.strip(), strict=False)
        for value in trusted_proxy_ips.split(",")
        if value.strip()
    )
