"""
Simple haversine distance calculation for GPS-based attendance validation.

GPS from a phone browser is not perfectly accurate (can easily be off by
10-50m depending on device/environment), so this is used as a *secondary*
signal alongside the signed, time-boxed QR token — never as the sole
gatekeeper for attendance.
"""
import math


def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    R = 6371000  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lambda = math.radians(lon2 - lon1)

    a = (
        math.sin(d_phi / 2) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(d_lambda / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def is_within_radius(lat: float, lon: float, school_lat: float, school_lon: float, radius_m: float):
    distance = haversine_distance_meters(lat, lon, school_lat, school_lon)
    return distance <= radius_m, distance
