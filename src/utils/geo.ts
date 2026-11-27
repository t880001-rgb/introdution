import type { LatLngPoint, TravelMode } from '../types/guide';

export const DONGSHAN_STATION_ORIGIN: LatLngPoint = {
  lat: 24.6361,
  lng: 121.7921,
};

const EARTH_RADIUS_KM = 6371;

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceKm(a: LatLngPoint, b: LatLngPoint): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRadians(a.lat)) * Math.cos(toRadians(b.lat)) * sinLng * sinLng;
  return 2 * EARTH_RADIUS_KM * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function estimateTravelMinutes(distanceKm: number, mode: TravelMode): number {
  if (!Number.isFinite(distanceKm) || distanceKm <= 0) return 0;
  // Apply realistic road winding factor (1.28x straight-line distance)
  const roadKm = distanceKm * 1.28;
  const speedKmh: Record<TravelMode, number> = {
    DRIVING: 32,
    BICYCLING: 14,
    WALKING: 4.5,
    TRANSIT: 20,
  };
  const rawMinutes = (roadKm / speedKmh[mode]) * 60;
  return Math.max(1, Math.round(rawMinutes));
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters <= 0) return '0 公尺';
  if (meters < 1000) return `${Math.round(meters)} 公尺`;
  return `${(meters / 1000).toFixed(1)} 公里`;
}

export function formatDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return '0 分鐘';
  const rounded = Math.round(minutes);
  if (rounded < 60) return `${rounded} 分鐘`;
  const hrs = Math.floor(rounded / 60);
  const mins = rounded % 60;
  return mins > 0 ? `${hrs} 小時 ${mins} 分` : `${hrs} 小時`;
}

export function isWithinYilanBounds(lat: number, lng: number): boolean {
  return lat >= 24.3 && lat <= 24.9 && lng >= 121.3 && lng <= 122.05;
}

export function isWithinTaiwanBounds(lat: number, lng: number): boolean {
  return lat >= 21.5 && lat <= 25.5 && lng >= 119.3 && lng <= 122.2;
}

export function buildGoogleMapsDirectionsUrl(
  origin: LatLngPoint | null,
  destination: LatLngPoint,
  mode: TravelMode,
  waypoints: LatLngPoint[] = []
): string {
  const modeMap: Record<TravelMode, string> = {
    DRIVING: 'driving',
    BICYCLING: 'bicycling',
    WALKING: 'walking',
    TRANSIT: 'transit',
  };
  const params = new URLSearchParams({
    api: '1',
    destination: `${destination.lat.toFixed(6)},${destination.lng.toFixed(6)}`,
    travelmode: modeMap[mode],
  });
  if (origin) {
    params.set('origin', `${origin.lat.toFixed(6)},${origin.lng.toFixed(6)}`);
  }
  if (waypoints.length > 0) {
    params.set(
      'waypoints',
      waypoints.map((pt) => `${pt.lat.toFixed(6)},${pt.lng.toFixed(6)}`).join('|')
    );
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
