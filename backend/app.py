"""BreMap Python HTTP backend server (pure Python stdlib, zero heavy frameworks)."""

from __future__ import annotations

import json
import os
import platform
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any
from urllib.parse import parse_qs, urlparse

from backend.maps_client import (
    MapsApiError,
    SOLUTION_ID,
    compute_routes,
    geocode_address,
    get_elevation_along_points,
    get_elevation_point,
    reverse_geocode,
    search_places_nearby,
    search_places_text,
)
from backend.spatial_processor import (
    build_geojson_feature_collection,
    compute_route_geometry_metrics,
    decode_polyline,
    estimate_auto_rickshaw_fare_inr,
    process_elevation_samples,
    score_and_rank_places,
)


def _parse_duration_seconds(duration_str: str | None) -> int:
    if not duration_str:
        return 0
    cleaned = str(duration_str).strip()
    if cleaned.endswith("s"):
        cleaned = cleaned[:-1]
    try:
        return int(float(cleaned))
    except ValueError:
        return 0


def _normalize_route_response(
    raw_routes: dict[str, Any],
    origin_input: Any,
    destination_input: Any,
    intermediates_input: list[Any],
    travel_mode: str,
    optimize_order: bool,
) -> dict[str, Any]:
    routes_list = raw_routes.get("routes") or []
    if not routes_list:
        raise MapsApiError(
            "No route could be computed between these locations.",
            status_code=404,
            error_code="ROUTE_NOT_FOUND",
        )

    primary = routes_list[0]
    encoded_poly = primary.get("polyline", {}).get("encodedPolyline", "")
    decoded_path = decode_polyline(encoded_poly)
    geom_metrics = compute_route_geometry_metrics(decoded_path)

    distance_meters = int(primary.get("distanceMeters") or 0)
    duration_seconds = _parse_duration_seconds(primary.get("duration"))
    distance_km = round(distance_meters / 1000.0, 3) if distance_meters else geom_metrics["pathDistanceKm"]

    # Fetch elevation profile along the route via Python Elevation API client
    elevation_samples = []
    elevation_warning = None
    if len(decoded_path) >= 2:
        try:
            elevation_samples = get_elevation_along_points(decoded_path, samples=44)
        except MapsApiError as elev_err:
            if elev_err.is_quota_exceeded:
                raise
            elevation_warning = elev_err.message

    elevation_metrics = process_elevation_samples(elevation_samples, distance_km)

    # Extract stop coordinates & reordered waypoint indices
    optimized_indices = primary.get("optimizedIntermediateWaypointIndex")
    legs_raw = primary.get("legs") or []

    ordered_intermediate_labels: list[str] = []
    if intermediates_input:
        if (
            optimize_order
            and isinstance(optimized_indices, list)
            and len(optimized_indices) == len(intermediates_input)
        ):
            ordered_intermediate_labels = [
                str(intermediates_input[idx])
                if not isinstance(intermediates_input[idx], dict)
                else intermediates_input[idx].get("label")
                or f"{intermediates_input[idx]['lat']:.4f}, {intermediates_input[idx]['lng']:.4f}"
                for idx in optimized_indices
            ]
        else:
            ordered_intermediate_labels = [
                str(item)
                if not isinstance(item, dict)
                else item.get("label") or f"{item['lat']:.4f}, {item['lng']:.4f}"
                for item in intermediates_input
            ]

    def _fmt_label(val: Any) -> str:
        if isinstance(val, dict):
            return str(val.get("label") or f"{val['lat']:.4f}, {val['lng']:.4f}")
        return str(val)

    stop_labels = [_fmt_label(origin_input)] + ordered_intermediate_labels + [_fmt_label(destination_input)]

    stops: list[dict[str, Any]] = []
    legs: list[dict[str, Any]] = []

    for leg_idx, leg in enumerate(legs_raw):
        start_ll = leg.get("startLocation", {}).get("latLng", {})
        end_ll = leg.get("endLocation", {}).get("latLng", {})
        start_coord = {
            "lat": float(start_ll.get("latitude", decoded_path[0]["lat"] if decoded_path else 0.0)),
            "lng": float(start_ll.get("longitude", decoded_path[0]["lng"] if decoded_path else 0.0)),
        }
        end_coord = {
            "lat": float(end_ll.get("latitude", decoded_path[-1]["lat"] if decoded_path else 0.0)),
            "lng": float(end_ll.get("longitude", decoded_path[-1]["lng"] if decoded_path else 0.0)),
        }

        if leg_idx == 0:
            stops.append(
                {
                    "role": "origin",
                    "label": stop_labels[0] if stop_labels else "Origin",
                    "location": start_coord,
                }
            )
        is_last_leg = leg_idx == len(legs_raw) - 1
        stops.append(
            {
                "role": "destination" if is_last_leg else "waypoint",
                "label": stop_labels[leg_idx + 1] if leg_idx + 1 < len(stop_labels) else f"Stop {leg_idx + 1}",
                "location": end_coord,
            }
        )

        steps_normalized = []
        for step in leg.get("steps") or []:
            nav = step.get("navigationInstruction") or {}
            step_start = step.get("startLocation", {}).get("latLng", {})
            steps_normalized.append(
                {
                    "instruction": nav.get("instructions") or "Continue along route",
                    "maneuver": nav.get("maneuver") or "STRAIGHT",
                    "distanceMeters": int(step.get("distanceMeters") or 0),
                    "durationSeconds": _parse_duration_seconds(step.get("staticDuration")),
                    "location": {
                        "lat": float(step_start.get("latitude", start_coord["lat"])),
                        "lng": float(step_start.get("longitude", start_coord["lng"])),
                    },
                }
            )

        legs.append(
            {
                "legIndex": leg_idx,
                "fromLabel": stop_labels[leg_idx] if leg_idx < len(stop_labels) else f"Stop {leg_idx}",
                "toLabel": stop_labels[leg_idx + 1] if leg_idx + 1 < len(stop_labels) else f"Stop {leg_idx + 1}",
                "distanceMeters": int(leg.get("distanceMeters") or 0),
                "durationSeconds": _parse_duration_seconds(leg.get("duration")),
                "steps": steps_normalized,
            }
        )

    avg_speed_kmh = round((distance_km / (duration_seconds / 3600.0)), 1) if duration_seconds > 0 else 0.0
    estimated_auto_fare_inr = estimate_auto_rickshaw_fare_inr(distance_km, duration_seconds)

    viewport_raw = primary.get("viewport") or {}
    viewport = None
    if "low" in viewport_raw and "high" in viewport_raw:
        viewport = {
            "south": float(viewport_raw["low"]["latitude"]),
            "west": float(viewport_raw["low"]["longitude"]),
            "north": float(viewport_raw["high"]["latitude"]),
            "east": float(viewport_raw["high"]["longitude"]),
        }

    return {
        "originLabel": _fmt_label(origin_input),
        "destinationLabel": _fmt_label(destination_input),
        "travelMode": travel_mode,
        "distanceMeters": distance_meters,
        "distanceKm": distance_km,
        "durationSeconds": duration_seconds,
        "averageSpeedKmh": avg_speed_kmh,
        "estimatedAutoFareInr": estimated_auto_fare_inr,
        "encodedPolyline": encoded_poly,
        "path": decoded_path,
        "viewport": viewport or geom_metrics["bounds"],
        "geometry": geom_metrics,
        "elevation": elevation_metrics,
        "elevationWarning": elevation_warning,
        "stops": stops,
        "legs": legs,
        "optimizedIntermediateWaypointIndex": optimized_indices,
    }


class BreMapHandler(BaseHTTPRequestHandler):
    """HTTP Request handler for BreMap Python processing endpoints."""

    server_version = "BreMapPython/1.0"

    def log_message(self, format: str, *args: Any) -> None:
        # Keep stdout clean for structured process management
        pass

    def _send_json(self, status_code: int, payload: dict[str, Any]) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_json_body(self) -> dict[str, Any]:
        length_str = self.headers.get("Content-Length", "0")
        try:
            length = int(length_str)
        except ValueError:
            length = 0
        if length <= 0:
            return {}
        raw = self.rfile.read(length).decode("utf-8")
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError as err:
            raise MapsApiError("Invalid JSON request body.", status_code=400, error_code="INVALID_JSON") from err

    def do_GET(self) -> None:
        started = time.perf_counter()
        parsed = urlparse(self.path)
        path = parsed.path
        query = parse_qs(parsed.query)

        try:
            if path == "/api/health":
                has_key = bool(
                    (os.environ.get("GOOGLE_MAPS_API_KEY") or os.environ.get("VITE_GOOGLE_MAPS_API_KEY") or "").strip()
                )
                self._send_json(
                    200,
                    {
                        "status": "ok",
                        "service": "bremap-python-processor",
                        "pythonVersion": platform.python_version(),
                        "mapsKeyConfigured": has_key,
                        "attributionId": SOLUTION_ID,
                    },
                )
                return

            if path == "/api/client-config":
                client_key = (
                    os.environ.get("VITE_GOOGLE_MAPS_API_KEY")
                    or os.environ.get("GOOGLE_MAPS_API_KEY")
                    or ""
                ).strip()
                self._send_json(
                    200,
                    {
                        "mapsApiKey": client_key,
                        "attributionId": SOLUTION_ID,
                    },
                )
                return

            if path == "/api/geocode/search":
                address = (query.get("address") or [""])[0].strip()
                if not address:
                    raise MapsApiError("Please enter an address or place name.", 400, "VALIDATION_ERROR")
                result = geocode_address(address)
                elev = get_elevation_point(result["location"]["lat"], result["location"]["lng"])
                result["elevationM"] = elev
                result["processingMs"] = round((time.perf_counter() - started) * 1000, 1)
                self._send_json(200, result)
                return

            if path == "/api/geocode/reverse":
                lat_raw = (query.get("lat") or [""])[0]
                lng_raw = (query.get("lng") or [""])[0]
                try:
                    lat = float(lat_raw)
                    lng = float(lng_raw)
                except ValueError as err:
                    raise MapsApiError("Valid numeric lat and lng parameters are required.", 400, "VALIDATION_ERROR") from err
                result = reverse_geocode(lat, lng)
                elev = get_elevation_point(lat, lng)
                result["elevationM"] = elev
                result["processingMs"] = round((time.perf_counter() - started) * 1000, 1)
                self._send_json(200, result)
                return

            self._send_json(404, {"error": {"code": "NOT_FOUND", "message": f"Unknown route: {path}"}})

        except MapsApiError as err:
            self._send_json(
                err.status_code,
                {
                    "error": {
                        "code": err.error_code,
                        "message": err.message,
                        "isQuotaExceeded": err.is_quota_exceeded,
                    }
                },
            )
        except Exception as err:  # noqa: BLE001
            self._send_json(500, {"error": {"code": "INTERNAL_ERROR", "message": str(err)}})

    def do_POST(self) -> None:
        started = time.perf_counter()
        parsed = urlparse(self.path)
        path = parsed.path

        try:
            body = self._read_json_body()

            if path == "/api/routes/analyze":
                origin = body.get("origin")
                destination = body.get("destination")
                if not origin or not destination:
                    raise MapsApiError(
                        "Both origin and destination are required to analyze a route.",
                        status_code=400,
                        error_code="VALIDATION_ERROR",
                    )

                intermediates = body.get("intermediates") or []
                travel_mode = str(body.get("travelMode") or "DRIVE").upper()
                avoid_tolls = bool(body.get("avoidTolls", False))
                avoid_highways = bool(body.get("avoidHighways", False))
                optimize_order = bool(body.get("optimizeWaypointOrder", False))

                raw_routes = compute_routes(
                    origin=origin,
                    destination=destination,
                    intermediates=intermediates,
                    travel_mode=travel_mode,
                    avoid_tolls=avoid_tolls,
                    avoid_highways=avoid_highways,
                    optimize_waypoint_order=optimize_order,
                )
                normalized = _normalize_route_response(
                    raw_routes=raw_routes,
                    origin_input=origin,
                    destination_input=destination,
                    intermediates_input=intermediates,
                    travel_mode=travel_mode,
                    optimize_order=optimize_order,
                )
                normalized["processingMs"] = round((time.perf_counter() - started) * 1000, 1)
                self._send_json(200, normalized)
                return

            if path == "/api/places/discover":
                query_text = str(body.get("query") or "").strip()
                included_types = body.get("includedTypes") or []
                center = body.get("center") or {"lat": 19.0176, "lng": 72.8562}
                center_lat = float(center.get("lat", 19.0176))
                center_lng = float(center.get("lng", 72.8562))
                radius_m = float(body.get("radiusMeters") or 3500.0)
                open_now = bool(body.get("openNow", False))
                search_mode = str(body.get("searchMode") or "center")
                encoded_polyline = body.get("encodedPolyline") or None

                if not query_text and not included_types:
                    raise MapsApiError(
                        "Enter a search query or choose a place category.",
                        status_code=400,
                        error_code="VALIDATION_ERROR",
                    )

                route_points = decode_polyline(encoded_polyline) if encoded_polyline else None

                if query_text:
                    raw_places = search_places_text(
                        text_query=query_text,
                        center_lat=center_lat,
                        center_lng=center_lng,
                        radius_m=radius_m,
                        open_now=open_now,
                        encoded_polyline=encoded_polyline if search_mode == "corridor" else None,
                    )
                else:
                    raw_places = search_places_nearby(
                        center_lat=center_lat,
                        center_lng=center_lng,
                        radius_m=radius_m,
                        included_types=[str(t) for t in included_types],
                    )
                    if open_now:
                        raw_places = [
                            p
                            for p in raw_places
                            if p.get("currentOpeningHours", {}).get("openNow") is True
                        ]

                ranked = score_and_rank_places(
                    raw_places=raw_places,
                    anchor_lat=center_lat,
                    anchor_lng=center_lng,
                    route_points=route_points,
                )

                self._send_json(
                    200,
                    {
                        "count": len(ranked),
                        "searchMode": search_mode,
                        "center": {"lat": center_lat, "lng": center_lng},
                        "places": ranked,
                        "processingMs": round((time.perf_counter() - started) * 1000, 1),
                    },
                )
                return

            if path == "/api/export/geojson":
                route_data = body.get("route")
                places = body.get("places") or []
                fc = build_geojson_feature_collection(route_data, places)
                self._send_json(200, fc)
                return

            self._send_json(404, {"error": {"code": "NOT_FOUND", "message": f"Unknown route: {path}"}})

        except MapsApiError as err:
            self._send_json(
                err.status_code,
                {
                    "error": {
                        "code": err.error_code,
                        "message": err.message,
                        "isQuotaExceeded": err.is_quota_exceeded,
                    }
                },
            )
        except Exception as err:  # noqa: BLE001
            self._send_json(500, {"error": {"code": "INTERNAL_ERROR", "message": str(err)}})


def run_server() -> None:
    port = int(os.environ.get("PYTHON_BACKEND_PORT", "8001"))
    server = ThreadingHTTPServer(("127.0.0.1", port), BreMapHandler)
    print(f"BreMap Python backend listening on http://127.0.0.1:{port}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    run_server()
