-- BusNear Seed Data
-- Run after schema.sql to populate demo data

-- School
insert into public.schools (id, name, address)
values ('11111111-1111-1111-1111-111111111111', 'Oakwood Elementary', '100 School Rd, Sunnyvale, CA')
on conflict (id) do nothing;

-- Route (matches DEFAULT_ROUTE in constants/route.ts)
insert into public.routes (id, name, description)
values ('route-7', 'Route 7 — Oakwood Elementary', 'Morning and afternoon route through Sunnyvale')
on conflict (id) do nothing;

-- Bus
insert into public.buses (id, route_id, license_plate, capacity)
values ('Bus #12', 'route-7', 'CA-BUS-12', 40)
on conflict (id) do nothing;

-- Initial bus location (start of route)
insert into public.bus_locations (bus_id, latitude, longitude, heading, speed, status, is_active)
values ('Bus #12', 37.3935, -122.0812, 0, 0, 'not_started', false)
on conflict (bus_id) do nothing;

-- Children (IDs must match VALID_CHILD_IDS in mocks/children.ts)
insert into public.children (id, first_name, last_name, grade, school_id, assigned_bus_id, assigned_route_id, avatar_color)
values
  ('CH-9F3K-2Q7M-8D1P', 'Emma',  'Johnson', '3rd Grade', '11111111-1111-1111-1111-111111111111', 'Bus #12', 'route-7', '#FF6B6B'),
  ('CH-4H7L-9R2N-5K3M', 'Liam',  'Johnson', '5th Grade', '11111111-1111-1111-1111-111111111111', 'Bus #12', 'route-7', '#4ECDC4')
on conflict (id) do nothing;

-- Demo service alert
insert into public.service_alerts (bus_id, type, severity, title, message)
values ('Bus #12', 'delay', 'medium', '5 min delay — Bus #12', 'Bus #12 is running approximately 5 minutes behind schedule due to traffic on Elm St.')
on conflict do nothing;
