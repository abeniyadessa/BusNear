import { Child, RidershipEvent, ServiceAlert, ArrivalEvent } from '@/types';

export const VALID_CHILD_IDS: Record<string, string> = {
  'CH-9F3K-2Q7M-8D1P': 'child-1',
  'CH-4H7L-9R2N-5K3M': 'child-2',
};

export const MOCK_CHILDREN: Child[] = [
  {
    id: 'child-1',
    name: 'Emma',
    grade: '3rd Grade',
    school: 'Oakwood Elementary',
    assignedBusId: 'Bus #12',
    assignedRouteId: 'route-7',
    avatarColor: '#FF6B6B',
  },
  {
    id: 'child-2',
    name: 'Liam',
    grade: '5th Grade',
    school: 'Oakwood Elementary',
    assignedBusId: 'Bus #12',
    assignedRouteId: 'route-7',
    avatarColor: '#4ECDC4',
  },
];

export const MOCK_RIDERSHIP_EVENTS: RidershipEvent[] = [
  {
    id: 'rev-1',
    childId: 'child-1',
    childName: 'Emma',
    busId: 'Bus #12',
    eventType: 'boarded',
    stopName: 'Maple & 3rd St',
    coordinate: { latitude: 37.3935, longitude: -122.0812 },
    occurredAt: Date.now() - 3600000,
  },
  {
    id: 'rev-2',
    childId: 'child-1',
    childName: 'Emma',
    busId: 'Bus #12',
    eventType: 'exited',
    stopName: 'Oakwood Elementary',
    coordinate: { latitude: 37.3862, longitude: -122.0708 },
    occurredAt: Date.now() - 1800000,
  },
  {
    id: 'rev-3',
    childId: 'child-2',
    childName: 'Liam',
    busId: 'Bus #12',
    eventType: 'boarded',
    stopName: 'Cedar Avenue',
    coordinate: { latitude: 37.3908, longitude: -122.0795 },
    occurredAt: Date.now() - 3500000,
  },
];

export const MOCK_SERVICE_ALERTS: ServiceAlert[] = [
  {
    id: 'sa-1',
    type: 'delay',
    severity: 'medium',
    title: '5 min delay — Bus #12',
    message: 'Bus #12 is running approximately 5 minutes behind schedule due to traffic on Elm St.',
    busId: 'Bus #12',
    createdAt: Date.now() - 600000,
    read: false,
  },
];

export const MOCK_ARRIVAL_EVENTS: ArrivalEvent[] = [
  {
    id: 'ae-1',
    busId: 'Bus #12',
    stopName: 'Maple & 3rd St',
    type: 'arrived_stop',
    occurredAt: Date.now() - 3700000,
    coordinate: { latitude: 37.3935, longitude: -122.0812 },
  },
  {
    id: 'ae-2',
    busId: 'Bus #12',
    schoolName: 'Oakwood Elementary',
    type: 'arrived_school',
    occurredAt: Date.now() - 1800000,
    coordinate: { latitude: 37.3862, longitude: -122.0708 },
  },
];
