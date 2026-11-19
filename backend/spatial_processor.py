"""Pure Python geospatial math, polyline decoding, elevation analytics, and spatial scoring."""

from __future__ import annotations

import math
from typing import Any

EARTH_RADIUS_KM = 6371.0088


def estimate_auto_rickshaw_fare_inr(distance_km: float, duration_seconds: int) -> int:
    """Estimate Indian metered auto-rickshaw fare in INR based on distance and congestion."""
    if distance_km <= 0:
        return 0
    base_fare = 26.0
    extra_km = max(0.0, distance_km - 1.5)
    distance_charge = extra_km * 15.5
    duration_mins = duration_seconds / 60.0
    avg_speed_kmh = (distance_km / (duration_seconds / 3600.0)) if duration_seconds > 0 else 25.0
    congestion_surcharge = max(0.0, duration_mins - (distance_km / 22.0) * 60.0) * 1.2 if avg_speed_kmh < 22.0 else 0.0
    return int(round(base_fare + distance_charge + congestion_surcharge))


def decode_polyline(encoded: str) -> list[dict[str, float]]:
    """Decode a Google Encoded Polyline5 string into a list of {'lat', 'lng'} dicts."""
    if not encoded:
        return []

    points: list[dict[str, float]] = []
    index = 0
    lat = 0
    lng = 0
    length = len(encoded)

    while index < length:
        for is_lng in (False, True):
            shift = 0
            result = 0
            while index < length:
                byte = ord(encoded[index]) - 63
                index += 1
                result |= (byte & 0x1F) << shift
                shift += 5
                if byte < 0x20:
                    break
            delta = ~(result >> 1) if (result & 1) else (result >> 1)
            if is_lng:
                lng += delta
            else:
                lat += delta
        points.append({"lat": round(lat / 1e5, 6), "lng": round(lng / 1e5, 6)})

    return points


def downsample_points(points: list[dict[str, float]], max_points: int = 120) -> list[dict[str, float]]:
    """Uniformly downsample a coordinate list while preserving endpoints."""
    if len(points) <= max_points or max_points < 2:
        return list(points)

    step = (len(points) - 1) / (max_points - 1)
    sampled = [points[int(round(i * step))] for i in range(max_points - 1)]
    sampled.append(points[-1])
    return sampled


def haversine_km(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate great-circle distance in kilometers between two WGS84 coordinates."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lng2 - lng1)

    a = (
        math.sin(dphi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * (math.sin(dlambda / 2.0) ** 2)
    )
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1.0 - a)))
    return EARTH_RADIUS_KM * c


def bearing_deg(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Compute initial compass bearing in degrees [0, 360) from point 1 to point 2."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dlambda = math.radians(lng2 - lng1)

    y = math.sin(dlambda) * math.cos(phi2)
    x = math.cos(phi1) * math.sin(phi2) - math.sin(phi1) * math.cos(phi2) * math.cos(dlambda)
    angle = math.degrees(math.atan2(y, x))
    return round((angle + 360.0) % 360.0, 1)


def compass_cardinal(bearing: float) -> str:
    """Convert bearing degrees into an 8-point cardinal direction."""
    dirs = ("N", "NE", "E", "SE", "S", "SW", "W", "NW")
    idx = int((bearing + 22.5) // 45) % 8
    return dirs[idx]


def compute_route_geometry_metrics(points: list[dict[str, float]]) -> dict[str, Any]:
    """Derive path distance, straight-line distance, sinuosity index, bearing, and bounds."""
    if not points:
        return {
            "pointCount": 0,
            "pathDistanceKm": 0.0,
            "crowFliesKm": 0.0,
            "sinuosityIndex": 1.0,
            "initialBearingDeg": 0.0,
            "cardinalDirection": "N",
            "midpoint": None,
            "bounds": None,
        }

    if len(points) == 1:
        p = points[0]
        return {
            "pointCount": 1,
            "pathDistanceKm": 0.0,
            "crowFliesKm": 0.0,
            "sinuosityIndex": 1.0,
            "initialBearingDeg": 0.0,
            "cardinalDirection": "N",
            "midpoint": p,
            "bounds": {"south": p["lat"], "west": p["lng"], "north": p["lat"], "east": p["lng"]},
        }

    path_km = 0.0
    min_lat = max_lat = points[0]["lat"]
    min_lng = max_lng = points[0]["lng"]

    for i in range(1, len(points)):
        prev = points[i - 1]
        curr = points[i]
        path_km += haversine_km(prev["lat"], prev["lng"], curr["lat"], curr["lng"])
        min_lat = min(min_lat, curr["lat"])
        max_lat = max(max_lat, curr["lat"])
        min_lng = min(min_lng, curr["lng"])
        max_lng = max(max_lng, curr["lng"])

    start = points[0]
    end = points[-1]
    crow_km = haversine_km(start["lat"], start["lng"], end["lat"], end["lng"])
    sinuosity = round(path_km / crow_km, 2) if crow_km > 0.05 else 1.0
    bearing = bearing_deg(start["lat"], start["lng"], end["lat"], end["lng"])

    return {
        "pointCount": len(points),
        "pathDistanceKm": round(path_km, 3),
        "crowFliesKm": round(crow_km, 3),
        "sinuosityIndex": sinuosity,
        "initialBearingDeg": bearing,
        "cardinalDirection": compass_cardinal(bearing),
        "midpoint": points[len(points) // 2],
        "bounds": {
            "south": min_lat,
            "west": min_lng,
            "north": max_lat,
            "east": max_lng,
        },
    }


def process_elevation_samples(
    samples: list[dict[str, Any]],
    total_distance_km: float,
) -> dict[str, Any]:
    """Compute elevation gain/loss, grade percentages, and chart-ready profile samples."""
    if not samples:
        return {
            "sampleCount": 0,
            "minElevationM": 0.0,
            "maxElevationM": 0.0,
            "netChangeM": 0.0,
            "totalGainM": 0.0,
            "totalLossM": 0.0,
            "maxClimbGradePct": 0.0,
            "maxDescentGradePct": 0.0,
            "avgAbsGradePct": 0.0,
            "profile": [],
        }

    count = len(samples)
    raw_elevations = [float(s.get("elevation", 0.0)) for s in samples]

    # Smooth localized seabed bathymetry dips on bridges/causeways over water:
    # if a span plunges below -2m between positive land endpoints, interpolate deck height.
    elevations = list(raw_elevations)
    i = 0
    while i < count:
        if elevations[i] < -2.0:
            start_idx = i - 1
            end_idx = i + 1
            while end_idx < count and elevations[end_idx] < -2.0:
                end_idx += 1
            if start_idx >= 0 and end_idx < count and elevations[start_idx] >= 0.0 and elevations[end_idx] >= 0.0:
                span = end_idx - start_idx
                start_elev = elevations[start_idx]
                end_elev = elevations[end_idx]
                for k in range(start_idx + 1, end_idx):
                    t = (k - start_idx) / span
                    elevations[k] = start_elev + t * (end_elev - start_elev)
            i = end_idx
        else:
            i += 1

    total_gain = 0.0
    total_loss = 0.0
    max_climb_grade = 0.0
    max_descent_grade = 0.0
    abs_grades: list[float] = []

    profile: list[dict[str, Any]] = []
    cumulative_km = 0.0
    # Estimate spacing from actual sample coordinates or fallback to uniform total_distance_km
    segment_distances_m: list[float] = [0.0]
    raw_geo_total_m = 0.0
    for i in range(1, count):
        loc_prev = samples[i - 1].get("location", {})
        loc_curr = samples[i].get("location", {})
        d_m = haversine_km(
            float(loc_prev.get("lat", 0.0)),
            float(loc_prev.get("lng", 0.0)),
            float(loc_curr.get("lat", 0.0)),
            float(loc_curr.get("lng", 0.0)),
        ) * 1000.0
        segment_distances_m.append(d_m)
        raw_geo_total_m += d_m

    scale_factor = (
        (total_distance_km * 1000.0) / raw_geo_total_m
        if raw_geo_total_m > 1.0 and total_distance_km > 0.0
        else 1.0
    )

    for i, sample in enumerate(samples):
        elev = elevations[i]
        loc = sample.get("location", {})
        seg_m = segment_distances_m[i] * scale_factor
        cumulative_km += seg_m / 1000.0

        grade_pct = 0.0
        if i > 0:
            delta_elev = elev - elevations[i - 1]
            if delta_elev > 0:
                total_gain += delta_elev
            else:
                total_loss += abs(delta_elev)

            horiz_m = max(seg_m, (total_distance_km * 1000.0) / max(1, count - 1), 1.0)
            grade_pct = round((delta_elev / horiz_m) * 100.0, 2)
            # Clamp extreme GPS noise spikes when segments are tiny
            grade_pct = max(-35.0, min(35.0, grade_pct))
            if grade_pct > max_climb_grade:
                max_climb_grade = grade_pct
            if grade_pct < max_descent_grade:
                max_descent_grade = grade_pct
            abs_grades.append(abs(grade_pct))

        profile.append(
            {
                "index": i,
                "distanceKm": round(cumulative_km, 2),
                "elevationM": round(elev, 1),
                "gradePct": grade_pct,
                "lat": float(loc.get("lat", 0.0)),
                "lng": float(loc.get("lng", 0.0)),
            }
        )

    return {
        "sampleCount": count,
        "minElevationM": round(min(elevations), 1),
        "maxElevationM": round(max(elevations), 1),
        "netChangeM": round(elevations[-1] - elevations[0], 1),
        "totalGainM": round(total_gain, 1),
        "totalLossM": round(total_loss, 1),
        "maxClimbGradePct": round(max_climb_grade, 1),
        "maxDescentGradePct": round(max_descent_grade, 1),
        "avgAbsGradePct": round(sum(abs_grades) / len(abs_grades), 2) if abs_grades else 0.0,
        "profile": profile,
    }


def _point_to_segment_distance_km(
    px: float, py: float, ax: float, ay: float, bx: float, by: float
) -> float:
    """Approximate planar-projected perpendicular distance converted via haversine."""
    dx = bx - ax
    dy = by - ay
    if dx == 0.0 and dy == 0.0:
        return haversine_km(px, py, ax, ay)
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
    proj_lat = ax + t * dx
    proj_lng = ay + t * dy
    return haversine_km(px, py, proj_lat, proj_lng)


def point_to_polyline_distance_km(
    lat: float, lng: float, polyline_points: list[dict[str, float]]
) -> float:
    """Return the minimum distance in km from a point to a route polyline."""
    if not polyline_points:
        return 0.0
    if len(polyline_points) == 1:
        return haversine_km(lat, lng, polyline_points[0]["lat"], polyline_points[0]["lng"])

    sampled = downsample_points(polyline_points, max_points=160)
    min_dist = float("inf")
    for i in range(1, len(sampled)):
        d = _point_to_segment_distance_km(
            lat,
            lng,
            sampled[i - 1]["lat"],
            sampled[i - 1]["lng"],
            sampled[i]["lat"],
            sampled[i]["lng"],
        )
        if d < min_dist:
            min_dist = d
    return round(min_dist, 3)


def score_and_rank_places(
    raw_places: list[dict[str, Any]],
    anchor_lat: float,
    anchor_lng: float,
    route_points: list[dict[str, float]] | None = None,
) -> list[dict[str, Any]]:
    """Normalize Google Places API (New) items and compute spatial proximity + quality scores."""
    processed: list[dict[str, Any]] = []

    for place in raw_places:
        loc = place.get("location") or {}
        lat = loc.get("latitude")
        lng = loc.get("longitude")
        if lat is None or lng is None:
            continue

        lat_f = float(lat)
        lng_f = float(lng)
        dist_from_anchor = round(haversine_km(anchor_lat, anchor_lng, lat_f, lng_f), 3)
        corridor_dist = (
            point_to_polyline_distance_km(lat_f, lng_f, route_points)
            if route_points
            else dist_from_anchor
        )

        rating = float(place.get("rating") or 0.0)
        rating_count = int(place.get("userRatingCount") or 0)
        # Bayesian weighted quality factor in [0, 1]
        bayesian_rating = (rating * rating_count + 3.8 * 15) / (rating_count + 15) / 5.0
        # Proximity decay: closer to corridor/anchor scores higher
        ref_dist = corridor_dist if route_points else dist_from_anchor
        proximity_factor = 1.0 / (1.0 + ref_dist * 0.45)

        open_now = None
        opening_hours = place.get("currentOpeningHours")
        if isinstance(opening_hours, dict) and "openNow" in opening_hours:
            open_now = bool(opening_hours["openNow"])

        open_bonus = 0.08 if open_now is True else 0.0
        composite_score = round((bayesian_rating * 0.55 + proximity_factor * 0.45 + open_bonus) * 100, 1)
        composite_score = min(100.0, composite_score)

        display_name_obj = place.get("displayName") or {}
        name = display_name_obj.get("text") if isinstance(display_name_obj, dict) else str(display_name_obj)

        primary_type_obj = place.get("primaryTypeDisplayName") or {}
        category = (
            primary_type_obj.get("text")
            if isinstance(primary_type_obj, dict) and primary_type_obj.get("text")
            else str(place.get("primaryType") or "Point of interest").replace("_", " ").title()
        )

        processed.append(
            {
                "id": place.get("id", ""),
                "name": name or "Unnamed Place",
                "address": place.get("shortFormattedAddress") or place.get("formattedAddress") or "",
                "category": category,
                "primaryType": place.get("primaryType") or "",
                "location": {"lat": lat_f, "lng": lng_f},
                "rating": round(rating, 1) if rating else None,
                "userRatingCount": rating_count,
                "priceLevel": place.get("priceLevel"),
                "openNow": open_now,
                "googleMapsUri": place.get("googleMapsUri") or "",
                "websiteUri": place.get("websiteUri") or "",
                "distanceFromAnchorKm": dist_from_anchor,
                "corridorOffsetKm": corridor_dist,
                "spatialScore": composite_score,
            }
        )

    processed.sort(key=lambda item: (-item["spatialScore"], item["corridorOffsetKm"]))
    return processed


def build_geojson_feature_collection(
    route_data: dict[str, Any] | None,
    places: list[dict[str, Any]],
) -> dict[str, Any]:
    """Assemble an RFC 7946 GeoJSON FeatureCollection from processed route and places."""
    features: list[dict[str, Any]] = []

    if route_data and route_data.get("path"):
        coords = [[p["lng"], p["lat"]] for p in route_data["path"]]
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "kind": "route",
                    "origin": route_data.get("originLabel", ""),
                    "destination": route_data.get("destinationLabel", ""),
                    "travelMode": route_data.get("travelMode", "DRIVE"),
                    "distanceKm": route_data.get("distanceKm", 0),
                    "durationSeconds": route_data.get("durationSeconds", 0),
                    "sinuosityIndex": route_data.get("geometry", {}).get("sinuosityIndex", 1.0),
                    "elevationGainM": route_data.get("elevation", {}).get("totalGainM", 0),
                },
                "geometry": {
                    "type": "LineString",
                    "coordinates": coords,
                },
            }
        )

        for idx, stop in enumerate(route_data.get("stops", [])):
            features.append(
                {
                    "type": "Feature",
                    "properties": {
                        "kind": "waypoint",
                        "order": idx,
                        "role": stop.get("role", "waypoint"),
                        "label": stop.get("label", ""),
                    },
                    "geometry": {
                        "type": "Point",
                        "coordinates": [stop["location"]["lng"], stop["location"]["lat"]],
                    },
                }
            )

    for place in places:
        features.append(
            {
                "type": "Feature",
                "properties": {
                    "kind": "place",
                    "id": place.get("id", ""),
                    "name": place.get("name", ""),
                    "category": place.get("category", ""),
                    "rating": place.get("rating"),
                    "corridorOffsetKm": place.get("corridorOffsetKm"),
                    "spatialScore": place.get("spatialScore"),
                },
                "geometry": {
                    "type": "Point",
                    "coordinates": [place["location"]["lng"], place["location"]["lat"]],
                },
            }
        )

    return {
        "type": "FeatureCollection",
        "features": features,
    }
