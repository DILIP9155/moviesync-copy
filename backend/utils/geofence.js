/**
 * Haversine distance in meters between two lat/lng points
 */
function haversineDistanceMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

/**
 * Check if point is inside circular geofence
 */
function isInsideCircle(pointLat, pointLng, centerLat, centerLng, radiusMeters) {
  return haversineDistanceMeters(pointLat, pointLng, centerLat, centerLng) <= radiusMeters;
}

/**
 * Ray-casting algorithm for point-in-polygon
 */
function isInsidePolygon(lat, lng, polygon) {
  if (!polygon || polygon.length < 3) return false;
  let inside = false;
  const n = polygon.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < (xj - xi) * (lat - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Check if point is inside office geofence (circle or polygon)
 */
function isInsideOfficeGeofence(lat, lng, office) {
  if (office.geofenceType === 'polygon' && office.polygonCoordinates?.length >= 3) {
    return isInsidePolygon(lat, lng, office.polygonCoordinates);
  }
  return isInsideCircle(lat, lng, office.latitude, office.longitude, office.geofenceRadiusMeters);
}

/**
 * Check if point is inside pickup geofence (circle)
 */
function isInsidePickupGeofence(lat, lng, pickupLat, pickupLng, radiusMeters = 70) {
  return isInsideCircle(lat, lng, pickupLat, pickupLng, radiusMeters);
}

module.exports = {
  haversineDistanceMeters,
  isInsideCircle,
  isInsidePolygon,
  isInsideOfficeGeofence,
  isInsidePickupGeofence
};
