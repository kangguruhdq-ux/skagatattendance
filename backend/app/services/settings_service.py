"""
Settings service for centralizing system configuration and school geofence.
Reads dynamically from the `system_settings` table, falling back to core config.
"""
from typing import Any, Dict, Optional
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.models.models import SystemSetting

core_settings = get_settings()


def get_setting(db: Session, key: str, default: Any = None) -> Any:
    item = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if item is not None:
        return item.value
    return default


def set_setting(
    db: Session,
    key: str,
    value: str,
    description: Optional[str] = None,
    user_id: Optional[int] = None,
) -> SystemSetting:
    item = db.query(SystemSetting).filter(SystemSetting.key == key).first()
    if item:
        item.value = value
        if description:
            item.description = description
        if user_id:
            item.updated_by = user_id
    else:
        item = SystemSetting(
            key=key,
            value=value,
            description=description,
            updated_by=user_id,
        )
        db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_school_location(db: Session) -> Dict[str, Any]:
    """
    Returns school location coordinates and geofence parameters.
    Default is SMKN 3 Yogyakarta: -7.777500, 110.365900, 150m radius.
    """
    lat_val = get_setting(db, "school_latitude", str(core_settings.SCHOOL_LATITUDE))
    lon_val = get_setting(db, "school_longitude", str(core_settings.SCHOOL_LONGITUDE))
    radius_val = get_setting(db, "geofence_radius_meters", str(core_settings.MAX_ATTENDANCE_RADIUS_METERS))
    enabled_val = get_setting(db, "geofence_enabled", "true")
    school_name = get_setting(db, "school_name", "SMK Negeri 3 Yogyakarta")
    school_address = get_setting(
        db,
        "school_address",
        "Jl. R.W. Monginsidi No.2, Cokrodiningratan, Kec. Jetis, Kota Yogyakarta, D.I. Yogyakarta 55233",
    )

    try:
        latitude = float(lat_val)
    except (TypeError, ValueError):
        latitude = core_settings.SCHOOL_LATITUDE

    try:
        longitude = float(lon_val)
    except (TypeError, ValueError):
        longitude = core_settings.SCHOOL_LONGITUDE

    try:
        radius_meters = float(radius_val)
    except (TypeError, ValueError):
        radius_meters = core_settings.MAX_ATTENDANCE_RADIUS_METERS

    enabled = str(enabled_val).lower() in ("true", "1", "yes")

    return {
        "latitude": latitude,
        "longitude": longitude,
        "radius_meters": radius_meters,
        "enabled": enabled,
        "school_name": school_name,
        "school_address": school_address,
    }


def get_all_settings(db: Session) -> Dict[str, Any]:
    settings_items = db.query(SystemSetting).all()
    out = {s.key: s.value for s in settings_items}
    # Ensure standard keys present
    loc = get_school_location(db)
    for k, v in loc.items():
        if k not in out:
            out[k] = v
    return out
