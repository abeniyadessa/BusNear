export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface BusStop {
  id: string;
  name: string;
  coordinate: LatLng;
  scheduledTime: string;
  waypointIndex: number;
}

export type BusStatus = 'not_started' | 'on_time' | 'delayed' | 'arriving' | 'arrived' | 'offline';

export interface BusState {
  position: LatLng;
  heading: number;
  speed: number;
  status: BusStatus;
  currentStopIndex: number;
  nextStopIndex: number;
  eta: number;
  lastUpdated: number;
  busId: string;
  routeName: string;
  isSimulating: boolean;
}

export interface SavedAddress {
  id: string;
  label: string;
  address: string;
  coordinate: LatLng;
  alertsEnabled: boolean;
}

export interface AlertSettings {
  zoneRadius: number;
  etaThresholds: number[];
  zoneAlertEnabled: boolean;
  etaAlertEnabled: boolean;
  twoMileAlertEnabled: boolean;
  homeLocation: LatLng;
  boardExitAlertEnabled: boolean;
  scheduleChangeAlertEnabled: boolean;
}

export interface RouteData {
  id: string;
  name: string;
  busId: string;
  waypoints: LatLng[];
  stops: BusStop[];
}

export interface Child {
  id: string;
  name: string;
  grade: string;
  school: string;
  assignedBusId: string;
  assignedRouteId: string;
  avatarColor: string;
}

export type RidershipEventType = 'boarded' | 'exited';

export interface RidershipEvent {
  id: string;
  childId: string;
  childName: string;
  busId: string;
  eventType: RidershipEventType;
  stopName: string;
  coordinate: LatLng;
  occurredAt: number;
}

export type ServiceAlertSeverity = 'low' | 'medium' | 'high';
export type ServiceAlertType = 'delay' | 'route_change' | 'stop_change' | 'cancellation';

export interface ServiceAlert {
  id: string;
  type: ServiceAlertType;
  severity: ServiceAlertSeverity;
  title: string;
  message: string;
  busId: string;
  createdAt: number;
  read: boolean;
}

export type ArrivalEventType = 'arrived_stop' | 'departed_stop' | 'arrived_school' | 'departed_school';

export interface ArrivalEvent {
  id: string;
  busId: string;
  stopName?: string;
  schoolName?: string;
  type: ArrivalEventType;
  occurredAt: number;
  coordinate: LatLng;
}

export type PresenceState = 'live' | 'recent' | 'stale';

export interface MapSettings {
  showRouteLine: boolean;
  showStopMarkers: boolean;
  showAlertZone: boolean;
  follow3D: boolean;
}

export type NotificationType =
  | 'bus_nearby'
  | 'bus_arriving'
  | 'bus_2mile'
  | 'eta_alert'
  | 'schedule_change'
  | 'boarded'
  | 'exited'
  | 'arrived_stop'
  | 'arrived_school';

export interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
}

export type AuthStep =
  | 'welcome'
  | 'privacy'
  | 'enter_id'
  | 'enter_otp'
  | 'home_address'
  | 'success'
  | 'authenticated';

export interface AuthState {
  step: AuthStep;
  isAuthenticated: boolean;
  parentId: string | null;
  linkedChildren: Child[];
  activeChildId: string | null;
  savedAddresses: SavedAddress[];
}

export type BoardingState = 'none' | 'boarded' | 'exited' | 'at_school';
