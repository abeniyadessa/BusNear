import { RouteData, LatLng, AlertSettings, MapSettings } from '@/types';

export const DEFAULT_ROUTE: RouteData = {
  id: 'route-7',
  name: 'Route 7 — Oakwood Elementary',
  busId: 'Bus #12',
  waypoints: [
    { latitude: 37.3950, longitude: -122.0860 },
    { latitude: 37.3947, longitude: -122.0852 },
    { latitude: 37.3944, longitude: -122.0843 },
    { latitude: 37.3941, longitude: -122.0835 },
    { latitude: 37.3939, longitude: -122.0826 },
    { latitude: 37.3937, longitude: -122.0818 },
    { latitude: 37.3935, longitude: -122.0812 },
    { latitude: 37.3932, longitude: -122.0806 },
    { latitude: 37.3927, longitude: -122.0802 },
    { latitude: 37.3922, longitude: -122.0800 },
    { latitude: 37.3917, longitude: -122.0798 },
    { latitude: 37.3912, longitude: -122.0796 },
    { latitude: 37.3908, longitude: -122.0795 },
    { latitude: 37.3904, longitude: -122.0792 },
    { latitude: 37.3900, longitude: -122.0787 },
    { latitude: 37.3897, longitude: -122.0782 },
    { latitude: 37.3894, longitude: -122.0776 },
    { latitude: 37.3892, longitude: -122.0770 },
    { latitude: 37.3890, longitude: -122.0768 },
    { latitude: 37.3888, longitude: -122.0760 },
    { latitude: 37.3886, longitude: -122.0752 },
    { latitude: 37.3885, longitude: -122.0744 },
    { latitude: 37.3884, longitude: -122.0736 },
    { latitude: 37.3882, longitude: -122.0728 },
    { latitude: 37.3880, longitude: -122.0722 },
    { latitude: 37.3876, longitude: -122.0718 },
    { latitude: 37.3873, longitude: -122.0715 },
    { latitude: 37.3869, longitude: -122.0712 },
    { latitude: 37.3865, longitude: -122.0710 },
    { latitude: 37.3862, longitude: -122.0708 },
  ],
  stops: [
    {
      id: 'stop-1',
      name: 'Lincoln Park',
      coordinate: { latitude: 37.3950, longitude: -122.0860 },
      scheduledTime: '8:05 AM',
      waypointIndex: 0,
    },
    {
      id: 'stop-2',
      name: 'Maple & 3rd St',
      coordinate: { latitude: 37.3935, longitude: -122.0812 },
      scheduledTime: '8:09 AM',
      waypointIndex: 6,
    },
    {
      id: 'stop-3',
      name: 'Cedar Avenue',
      coordinate: { latitude: 37.3908, longitude: -122.0795 },
      scheduledTime: '8:13 AM',
      waypointIndex: 12,
    },
    {
      id: 'stop-4',
      name: 'Elm & Oak Dr',
      coordinate: { latitude: 37.3890, longitude: -122.0768 },
      scheduledTime: '8:17 AM',
      waypointIndex: 18,
    },
    {
      id: 'stop-5',
      name: 'Willow Creek',
      coordinate: { latitude: 37.3882, longitude: -122.0728 },
      scheduledTime: '8:21 AM',
      waypointIndex: 23,
    },
    {
      id: 'stop-6',
      name: 'Oakwood Elementary',
      coordinate: { latitude: 37.3862, longitude: -122.0708 },
      scheduledTime: '8:25 AM',
      waypointIndex: 29,
    },
  ],
};

export const DEFAULT_HOME_LOCATION: LatLng = {
  latitude: 37.3910,
  longitude: -122.0793,
};

export const DEFAULT_ALERT_SETTINGS: AlertSettings = {
  zoneRadius: 300,
  etaThresholds: [10, 5, 2],
  zoneAlertEnabled: true,
  etaAlertEnabled: true,
  twoMileAlertEnabled: true,
  homeLocation: DEFAULT_HOME_LOCATION,
  boardExitAlertEnabled: true,
  scheduleChangeAlertEnabled: true,
};

export const DEFAULT_MAP_SETTINGS: MapSettings = {
  showRouteLine: true,
  showStopMarkers: true,
  showAlertZone: true,
  follow3D: true,
};

export const TWO_MILES_METERS = 3218.69;

export const MAP_INITIAL_REGION = {
  latitude: 37.3905,
  longitude: -122.0785,
  latitudeDelta: 0.018,
  longitudeDelta: 0.018,
};

export function distanceMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLng = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x = dLng * Math.cos((lat1 + lat2) / 2);
  const y = dLat;
  return R * Math.sqrt(x * x + y * y);
}

export function calculateHeading(from: LatLng, to: LatLng): number {
  const dLng = to.longitude - from.longitude;
  const dLat = to.latitude - from.latitude;
  const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
  return (angle + 360) % 360;
}

export function lerpAngle(a: number, b: number, t: number): number {
  let diff = b - a;
  while (diff > 180) diff -= 360;
  while (diff < -180) diff += 360;
  return a + diff * t;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
