"""Unit tests for BreMap Python spatial processing algorithms."""

import unittest

from backend.spatial_processor import (
    bearing_deg,
    build_geojson_feature_collection,
    compute_route_geometry_metrics,
    decode_polyline,
    estimate_auto_rickshaw_fare_inr,
    haversine_km,
    point_to_polyline_distance_km,
    process_elevation_samples,
    score_and_rank_places,
)


class SpatialProcessorTests(unittest.TestCase):
    def test_decode_polyline_standard_example(self) -> None:
        # Google polyline algorithm reference string: "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
        pts = decode_polyline("_p~iF~ps|U_ulLnnqC_mqNvxq`@")
        self.assertEqual(len(pts), 3)
        self.assertAlmostEqual(pts[0]["lat"], 38.5, places=3)
        self.assertAlmostEqual(pts[0]["lng"], -120.2, places=3)
        self.assertAlmostEqual(pts[1]["lat"], 40.7, places=3)
        self.assertAlmostEqual(pts[1]["lng"], -120.95, places=3)
        self.assertAlmostEqual(pts[2]["lat"], 43.252, places=3)
        self.assertAlmostEqual(pts[2]["lng"], -126.453, places=3)

    def test_haversine_and_bearing(self) -> None:
        # San Francisco to Sausalito (~10-12 km north)
        dist = haversine_km(37.7749, -122.4194, 37.8591, -122.4853)
        self.assertTrue(9.0 < dist < 13.0)
        b = bearing_deg(37.7749, -122.4194, 37.8591, -122.4853)
        self.assertTrue(300.0 < b < 350.0)

    def test_route_geometry_metrics_sinuosity(self) -> None:
        points = [
            {"lat": 37.7700, "lng": -122.4200},
            {"lat": 37.7800, "lng": -122.4000},
            {"lat": 37.7900, "lng": -122.4200},
        ]
        metrics = compute_route_geometry_metrics(points)
        self.assertEqual(metrics["pointCount"], 3)
        self.assertGreater(metrics["pathDistanceKm"], metrics["crowFliesKm"])
        self.assertGreater(metrics["sinuosityIndex"], 1.2)

    def test_elevation_gain_loss_and_grade(self) -> None:
        samples = [
            {"elevation": 10.0, "location": {"lat": 37.770, "lng": -122.420}},
            {"elevation": 60.0, "location": {"lat": 37.779, "lng": -122.420}},  # ~1km north, +50m -> ~5%
            {"elevation": 40.0, "location": {"lat": 37.788, "lng": -122.420}},  # ~1km north, -20m -> ~-2%
        ]
        res = process_elevation_samples(samples, total_distance_km=2.0)
        self.assertAlmostEqual(res["totalGainM"], 50.0, places=1)
        self.assertAlmostEqual(res["totalLossM"], 20.0, places=1)
        self.assertAlmostEqual(res["netChangeM"], 30.0, places=1)
        self.assertEqual(len(res["profile"]), 3)
        self.assertGreater(res["maxClimbGradePct"], 4.0)
        self.assertLess(res["maxDescentGradePct"], -1.5)

    def test_bridge_bathymetry_smoothing(self) -> None:
        samples = [
            {"elevation": 60.0, "location": {"lat": 37.808, "lng": -122.475}},
            {"elevation": -99.0, "location": {"lat": 37.818, "lng": -122.478}},
            {"elevation": -85.0, "location": {"lat": 37.824, "lng": -122.479}},
            {"elevation": 64.0, "location": {"lat": 37.832, "lng": -122.481}},
        ]
        res = process_elevation_samples(samples, total_distance_km=3.0)
        self.assertGreaterEqual(res["minElevationM"], 60.0)
        self.assertLess(res["maxClimbGradePct"], 5.0)

    def test_corridor_distance_and_place_scoring(self) -> None:
        route_pts = [
            {"lat": 37.770, "lng": -122.420},
            {"lat": 37.790, "lng": -122.420},
        ]
        on_corridor = point_to_polyline_distance_km(37.780, -122.420, route_pts)
        off_corridor = point_to_polyline_distance_km(37.780, -122.380, route_pts)
        self.assertLess(on_corridor, 0.05)
        self.assertGreater(off_corridor, 3.0)

        raw_places = [
            {
                "id": "p1",
                "displayName": {"text": "Far Spot"},
                "location": {"latitude": 37.780, "longitude": -122.350},
                "rating": 4.9,
                "userRatingCount": 200,
                "currentOpeningHours": {"openNow": False},
            },
            {
                "id": "p2",
                "displayName": {"text": "Corridor Cafe"},
                "location": {"latitude": 37.780, "longitude": -122.420},
                "rating": 4.7,
                "userRatingCount": 180,
                "currentOpeningHours": {"openNow": True},
            },
        ]
        ranked = score_and_rank_places(raw_places, 37.780, -122.420, route_pts)
        self.assertEqual(ranked[0]["id"], "p2")
        self.assertGreater(ranked[0]["spatialScore"], ranked[1]["spatialScore"])

    def test_geojson_export_structure(self) -> None:
        fc = build_geojson_feature_collection(
            {
                "originLabel": "A",
                "destinationLabel": "B",
                "path": [{"lat": 37.77, "lng": -122.42}, {"lat": 37.78, "lng": -122.41}],
                "stops": [{"role": "origin", "label": "A", "location": {"lat": 37.77, "lng": -122.42}}],
            },
            [{"id": "p1", "name": "Cafe", "location": {"lat": 37.775, "lng": -122.415}}],
        )
        self.assertEqual(fc["type"], "FeatureCollection")
        self.assertEqual(len(fc["features"]), 3)

    def test_estimate_auto_rickshaw_fare_inr(self) -> None:
        self.assertEqual(estimate_auto_rickshaw_fare_inr(0.0, 0), 0)
        self.assertEqual(estimate_auto_rickshaw_fare_inr(-2.0, 300), 0)
        # Short trip under minimum flag-down (1.5 km) at normal speed
        self.assertEqual(estimate_auto_rickshaw_fare_inr(1.2, 180), 26)
        # 8.0 km in 20 mins (24 km/h, no congestion surcharge): 26 + 6.5 * 15.5 = 127
        self.assertEqual(estimate_auto_rickshaw_fare_inr(8.0, 1200), 127)
        # Heavy congestion (8.0 km in 40 mins = 12 km/h) should exceed normal fare
        congested_fare = estimate_auto_rickshaw_fare_inr(8.0, 2400)
        self.assertGreater(congested_fare, 127)


if __name__ == "__main__":
    unittest.main()
