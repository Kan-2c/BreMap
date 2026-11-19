"""Google Maps Platform REST API client for the BreMap Python backend."""

from __future__ import annotations

import json
import os
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

SOLUTION_ID = "gmp_mcp_codeassist_v1_aistudio"


class MapsApiError(Exception):
    """Structured error raised when a Google Maps Platform API request fails."""

    def __init__(
        self,
        message: str,
        status_code: int = 500,
        error_code: str = "MAPS_API_ERROR",
        is_quota_exceeded: bool = False,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.is_quota_exceeded = is_quota_exceeded


def get_api_key() -> str:
    """Resolve the Google Maps API key from server environment variables."""
    key = (
        os.environ.get("GOOGLE_MAPS_API_KEY")
        or os.environ.get("VITE_GOOGLE_MAPS_API_KEY")
        or ""
    ).strip()
    if not key:
        raise MapsApiError(
            "Google Maps API key is not configured on the server.",
            status_code=503,
            error_code="API_KEY_MISSING",
        )
    return key


def _http_json(
    url: str,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    payload: dict[str, Any] | None = None,
    timeout: int = 15,
) -> dict[str, Any]:
    req_headers = {"Accept": "application/json", "X-Goog-Maps-Solution-ID": SOLUTION_ID}
    if headers:
        req_headers.update(headers)

    data_bytes = None
    if payload is not None:
        data_bytes = json.dumps(payload).encode("utf-8")
        req_headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data_bytes, headers=req_headers, method=method)

    try:
        with urllib.request.urlopen(request, timeout=timeout) as resp:
            raw = resp.read().decode("utf-8")
            return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as err:
        raw_err = err.read().decode("utf-8", errors="replace")
        parsed_err: dict[str, Any] = {}
        try:
            parsed_err = json.loads(raw_err)
        except json.JSONDecodeError:
            pass

        err_obj = parsed_err.get("error", {}) if isinstance(parsed_err, dict) else {}
        err_status = str(err_obj.get("status", ""))
        err_msg = str(err_obj.get("message") or raw_err or f"HTTP {err.code}")
        is_quota = err.code == 429 or err_status == "RESOURCE_EXHAUSTED"
        raise MapsApiError(
            message=err_msg,
            status_code=429 if is_quota else err.code,
            error_code=err_status or f"HTTP_{err.code}",
            is_quota_exceeded=is_quota,
        ) from err
    except urllib.error.URLError as err:
        raise MapsApiError(
            message=f"Network error contacting Google Maps Platform: {err.reason}",
            status_code=502,
            error_code="NETWORK_ERROR",
        ) from err


def geocode_address(address: str) -> dict[str, Any]:
    """Forward geocode a street address or place string via Geocoding REST API."""
    api_key = get_api_key()
    params = urllib.parse.urlencode(
        {"address": address, "region": "in", "key": api_key, "solution_id": SOLUTION_ID}
    )
    url = f"https://maps.googleapis.com/maps/api/geocode/json?{params}"
    data = _http_json(url, method="GET")
    status = data.get("status", "")
    if status == "OVER_QUERY_LIMIT" or status == "OVER_DAILY_LIMIT":
        raise MapsApiError(
            data.get("error_message") or "Geocoding quota exceeded.",
            status_code=429,
            error_code=status,
            is_quota_exceeded=True,
        )
    if status == "ZERO_RESULTS":
        raise MapsApiError(
            f"No coordinates found for '{address}'.",
            status_code=404,
            error_code="ZERO_RESULTS",
        )
    if status != "OK":
        raise MapsApiError(
            data.get("error_message") or f"Geocoding error: {status}",
            status_code=400,
            error_code=status or "GEOCODE_ERROR",
        )

    top = data["results"][0]
    loc = top["geometry"]["location"]
    return {
        "formattedAddress": top.get("formatted_address", address),
        "placeId": top.get("place_id", ""),
        "location": {"lat": float(loc["lat"]), "lng": float(loc["lng"])},
        "locationType": top.get("geometry", {}).get("location_type", ""),
    }


def reverse_geocode(lat: float, lng: float) -> dict[str, Any]:
    """Reverse geocode coordinates into a formatted street address via Geocoding REST API."""
    api_key = get_api_key()
    params = urllib.parse.urlencode(
        {"latlng": f"{lat},{lng}", "region": "in", "key": api_key, "solution_id": SOLUTION_ID}
    )
    url = f"https://maps.googleapis.com/maps/api/geocode/json?{params}"
    data = _http_json(url, method="GET")
    status = data.get("status", "")
    if status in ("OVER_QUERY_LIMIT", "OVER_DAILY_LIMIT"):
        raise MapsApiError(
            data.get("error_message") or "Reverse geocoding quota exceeded.",
            status_code=429,
            error_code=status,
            is_quota_exceeded=True,
        )
    if status == "ZERO_RESULTS":
        return {
            "formattedAddress": f"{lat:.5f}, {lng:.5f}",
            "placeId": "",
            "location": {"lat": lat, "lng": lng},
            "types": [],
        }
    if status != "OK":
        raise MapsApiError(
            data.get("error_message") or f"Reverse geocoding failed: {status}",
            status_code=400,
            error_code=status,
        )

    top = data["results"][0]
    return {
        "formattedAddress": top.get("formatted_address", f"{lat:.5f}, {lng:.5f}"),
        "placeId": top.get("place_id", ""),
        "location": {"lat": lat, "lng": lng},
        "types": top.get("types", []),
    }


def _to_routes_waypoint(wp: Any) -> dict[str, Any]:
    if isinstance(wp, dict) and "lat" in wp and "lng" in wp:
        return {
            "location": {
                "latLng": {
                    "latitude": float(wp["lat"]),
                    "longitude": float(wp["lng"]),
                }
            }
        }
    return {"address": str(wp)}


def compute_routes(
    origin: Any,
    destination: Any,
    intermediates: list[Any] | None = None,
    travel_mode: str = "DRIVE",
    avoid_tolls: bool = False,
    avoid_highways: bool = False,
    optimize_waypoint_order: bool = False,
) -> dict[str, Any]:
    """Call Google Maps Platform Routes API v2 computeRoutes endpoint."""
    api_key = get_api_key()
    mode = travel_mode.upper()
    if mode not in ("DRIVE", "BICYCLE", "WALK", "TRANSIT", "TWO_WHEELER"):
        mode = "DRIVE"

    body: dict[str, Any] = {
        "origin": _to_routes_waypoint(origin),
        "destination": _to_routes_waypoint(destination),
        "travelMode": mode,
        "languageCode": "en-US",
        "units": "METRIC",
        "polylineQuality": "HIGH_QUALITY",
    }

    if mode in ("DRIVE", "TWO_WHEELER"):
        body["routingPreference"] = "TRAFFIC_AWARE"
        if avoid_tolls or avoid_highways:
            body["routeModifiers"] = {
                "avoidTolls": bool(avoid_tolls),
                "avoidHighways": bool(avoid_highways),
            }

    field_parts = [
        "routes.duration",
        "routes.distanceMeters",
        "routes.polyline.encodedPolyline",
        "routes.viewport",
        "routes.legs.distanceMeters",
        "routes.legs.duration",
        "routes.legs.startLocation",
        "routes.legs.endLocation",
        "routes.legs.steps.distanceMeters",
        "routes.legs.steps.staticDuration",
        "routes.legs.steps.navigationInstruction",
        "routes.legs.steps.startLocation",
        "routes.legs.steps.endLocation",
    ]

    if intermediates:
        body["intermediates"] = [_to_routes_waypoint(item) for item in intermediates]
        if optimize_waypoint_order and mode != "TRANSIT" and len(intermediates) >= 2:
            body["optimizeWaypointOrder"] = True
            field_parts.append("routes.optimizedIntermediateWaypointIndex")

    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": ",".join(field_parts),
    }

    return _http_json(
        "https://routes.googleapis.com/directions/v2:computeRoutes",
        method="POST",
        headers=headers,
        payload=body,
    )


def get_elevation_along_points(
    points: list[dict[str, float]],
    samples: int = 44,
) -> list[dict[str, Any]]:
    """Query Elevation API sampled along an ordered list of coordinates."""
    if len(points) < 2:
        return []
    api_key = get_api_key()
    # Keep URL well below 16384 chars by using up to 90 vertices
    if len(points) > 90:
        step = (len(points) - 1) / 89.0
        subset = [points[int(round(i * step))] for i in range(89)] + [points[-1]]
    else:
        subset = points

    path_str = "|".join(f"{p['lat']:.5f},{p['lng']:.5f}" for p in subset)
    params = urllib.parse.urlencode(
        {
            "path": path_str,
            "samples": str(max(2, min(128, samples))),
            "key": api_key,
            "solution_id": SOLUTION_ID,
        }
    )
    url = f"https://maps.googleapis.com/maps/api/elevation/json?{params}"
    data = _http_json(url, method="GET")
    status = data.get("status", "")
    if status in ("OVER_QUERY_LIMIT", "OVER_DAILY_LIMIT"):
        raise MapsApiError(
            data.get("error_message") or "Elevation API quota exceeded.",
            status_code=429,
            error_code=status,
            is_quota_exceeded=True,
        )
    if status != "OK":
        return []
    return data.get("results", [])


def get_elevation_point(lat: float, lng: float) -> float | None:
    """Fetch point elevation in meters for a single lat/lng coordinate."""
    api_key = get_api_key()
    params = urllib.parse.urlencode(
        {"locations": f"{lat},{lng}", "key": api_key, "solution_id": SOLUTION_ID}
    )
    url = f"https://maps.googleapis.com/maps/api/elevation/json?{params}"
    data = _http_json(url, method="GET")
    if data.get("status") == "OK" and data.get("results"):
        return round(float(data["results"][0]["elevation"]), 1)
    return None


PLACES_FIELD_MASK = ",".join(
    [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.shortFormattedAddress",
        "places.location",
        "places.primaryType",
        "places.primaryTypeDisplayName",
        "places.types",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.currentOpeningHours.openNow",
        "places.googleMapsUri",
        "places.websiteUri",
    ]
)


def search_places_text(
    text_query: str,
    center_lat: float | None = None,
    center_lng: float | None = None,
    radius_m: float = 4000.0,
    open_now: bool = False,
    encoded_polyline: str | None = None,
    page_size: int = 16,
) -> list[dict[str, Any]]:
    """Query Places API (New) searchText with optional route-corridor or circular bias."""
    api_key = get_api_key()
    body: dict[str, Any] = {
        "textQuery": text_query,
        "pageSize": max(1, min(20, page_size)),
        "languageCode": "en",
        "regionCode": "in",
    }
    if open_now:
        body["openNow"] = True

    if encoded_polyline:
        body["searchAlongRouteParameters"] = {
            "polyline": {"encodedPolyline": encoded_polyline}
        }
    elif center_lat is not None and center_lng is not None:
        body["locationBias"] = {
            "circle": {
                "center": {"latitude": float(center_lat), "longitude": float(center_lng)},
                "radius": float(max(100.0, min(50000.0, radius_m))),
            }
        }

    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
    }

    try:
        data = _http_json(
            "https://places.googleapis.com/v1/places:searchText",
            method="POST",
            headers=headers,
            payload=body,
        )
        return data.get("places", [])
    except MapsApiError as err:
        # If searchAlongRouteParameters rejects a specific query, fall back cleanly to center circle bias
        if encoded_polyline and err.status_code == 400 and center_lat is not None and center_lng is not None:
            body.pop("searchAlongRouteParameters", None)
            body["locationBias"] = {
                "circle": {
                    "center": {"latitude": float(center_lat), "longitude": float(center_lng)},
                    "radius": float(max(100.0, min(50000.0, radius_m))),
                }
            }
            data = _http_json(
                "https://places.googleapis.com/v1/places:searchText",
                method="POST",
                headers=headers,
                payload=body,
            )
            return data.get("places", [])
        raise


def search_places_nearby(
    center_lat: float,
    center_lng: float,
    radius_m: float = 3000.0,
    included_types: list[str] | None = None,
    max_results: int = 16,
) -> list[dict[str, Any]]:
    """Query Places API (New) searchNearby within a circular geographic restriction."""
    api_key = get_api_key()
    body: dict[str, Any] = {
        "maxResultCount": max(1, min(20, max_results)),
        "rankPreference": "POPULARITY",
        "languageCode": "en",
        "regionCode": "in",
        "locationRestriction": {
            "circle": {
                "center": {"latitude": float(center_lat), "longitude": float(center_lng)},
                "radius": float(max(100.0, min(50000.0, radius_m))),
            }
        },
    }
    if included_types:
        body["includedTypes"] = included_types

    headers = {
        "X-Goog-Api-Key": api_key,
        "X-Goog-FieldMask": PLACES_FIELD_MASK,
    }
    data = _http_json(
        "https://places.googleapis.com/v1/places:searchNearby",
        method="POST",
        headers=headers,
        payload=body,
    )
    return data.get("places", [])
