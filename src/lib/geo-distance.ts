export type GeoPoint = {
  latitude?: string | number | null;
  longitude?: string | number | null;
};

export function hasGeoPoint(point: GeoPoint | null | undefined) {
  return (
    parseCoordinate(point?.latitude) !== undefined &&
    parseCoordinate(point?.longitude) !== undefined
  );
}

export function calculateDistanceMeters(
  from: GeoPoint | null | undefined,
  to: GeoPoint | null | undefined,
) {
  const fromLatitude = parseCoordinate(from?.latitude);
  const fromLongitude = parseCoordinate(from?.longitude);
  const toLatitude = parseCoordinate(to?.latitude);
  const toLongitude = parseCoordinate(to?.longitude);

  if (
    fromLatitude === undefined ||
    fromLongitude === undefined ||
    toLatitude === undefined ||
    toLongitude === undefined
  ) {
    return undefined;
  }

  const earthRadiusMeters = 6_371_000;
  const latitudeDelta = toRadians(toLatitude - fromLatitude);
  const longitudeDelta = toRadians(toLongitude - fromLongitude);
  const fromLatitudeRadians = toRadians(fromLatitude);
  const toLatitudeRadians = toRadians(toLatitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitudeRadians) *
      Math.cos(toLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;

  return Math.round(
    2 *
      earthRadiusMeters *
      Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)),
  );
}

export function formatDistanceShort(distanceMeters: number | null | undefined) {
  if (distanceMeters === null || distanceMeters === undefined) return null;
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  return `${(distanceMeters / 1000).toFixed(1).replace(".", ",")} km`;
}

function parseCoordinate(value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}
