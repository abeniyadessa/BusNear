-- BusNear Database Schema
-- Run this in the Supabase SQL editor to set up your database

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  phone text,
  display_name text,
  role text not null default 'parent' check (role in ('parent', 'driver', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  created_at timestamptz not null default now()
);

create table if not exists public.routes (
  id text primary key,
  name text not null,
  description text,
  waypoints jsonb not null default '[]',
  stops jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create table if not exists public.buses (
  id text primary key,
  route_id text references public.routes(id),
  driver_id uuid references public.profiles(id),
  license_plate text,
  capacity int not null default 40,
  created_at timestamptz not null default now()
);

create table if not exists public.children (
  id text primary key,
  first_name text not null,
  last_name text,
  grade text,
  school_id uuid references public.schools(id),
  assigned_bus_id text references public.buses(id),
  assigned_route_id text references public.routes(id),
  avatar_color text not null default '#FF6B6B',
  created_at timestamptz not null default now()
);

create table if not exists public.parent_children (
  parent_id uuid references public.profiles(id) on delete cascade,
  child_id text references public.children(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (parent_id, child_id)
);

create table if not exists public.bus_locations (
  bus_id text references public.buses(id) on delete cascade primary key,
  latitude double precision not null default 0,
  longitude double precision not null default 0,
  heading double precision not null default 0,
  speed double precision not null default 0,
  status text not null default 'not_started',
  waypoint_index int not null default 0,
  eta_minutes double precision not null default 0,
  is_active boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.ridership_events (
  id uuid primary key default gen_random_uuid(),
  child_id text references public.children(id),
  bus_id text references public.buses(id),
  event_type text not null check (event_type in ('boarded', 'exited')),
  stop_name text,
  latitude double precision,
  longitude double precision,
  recorded_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.service_alerts (
  id uuid primary key default gen_random_uuid(),
  bus_id text references public.buses(id),
  type text not null check (type in ('delay', 'route_change', 'stop_change', 'cancellation')),
  severity text not null default 'low' check (severity in ('low', 'medium', 'high')),
  title text not null,
  message text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.push_tokens (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.profiles(id) on delete cascade,
  token text not null,
  platform text check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now(),
  unique(parent_id, token)
);

create table if not exists public.saved_addresses (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references public.profiles(id) on delete cascade,
  label text not null,
  address text not null,
  latitude double precision not null,
  longitude double precision not null,
  alerts_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- REALTIME
-- ============================================================

alter publication supabase_realtime add table public.bus_locations;
alter publication supabase_realtime add table public.ridership_events;
alter publication supabase_realtime add table public.service_alerts;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.schools enable row level security;
alter table public.routes enable row level security;
alter table public.buses enable row level security;
alter table public.children enable row level security;
alter table public.parent_children enable row level security;
alter table public.bus_locations enable row level security;
alter table public.ridership_events enable row level security;
alter table public.service_alerts enable row level security;
alter table public.push_tokens enable row level security;
alter table public.saved_addresses enable row level security;

-- Profiles
create policy "Users can view own profile"
  on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update using (auth.uid() = id);
create policy "Users can insert own profile"
  on public.profiles for insert with check (auth.uid() = id);

-- Public read tables
create policy "Public can read schools"  on public.schools  for select using (true);
create policy "Public can read routes"   on public.routes   for select using (true);
create policy "Public can read buses"    on public.buses    for select using (true);
create policy "Public can read children" on public.children for select using (true);

-- Parent-child links
create policy "Parents can view their links"
  on public.parent_children for select using (auth.uid() = parent_id);
create policy "Parents can create links"
  on public.parent_children for insert with check (auth.uid() = parent_id);

-- Bus locations: anyone reads, drivers/admin write
create policy "Public can read bus locations"
  on public.bus_locations for select using (true);
create policy "Drivers can write bus locations"
  on public.bus_locations for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role in ('driver', 'admin')
    )
  );

-- Ridership events: parents see their children's events, drivers insert
create policy "Parents can read their children events"
  on public.ridership_events for select using (
    exists (
      select 1 from public.parent_children pc
      where pc.parent_id = auth.uid() and pc.child_id = ridership_events.child_id
    )
  );
create policy "Authenticated can insert ridership events"
  on public.ridership_events for insert with check (auth.uid() = recorded_by);

-- Service alerts: public read, admin insert
create policy "Public can read service alerts"
  on public.service_alerts for select using (true);
create policy "Admin can manage service alerts"
  on public.service_alerts for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Push tokens
create policy "Users manage own push tokens"
  on public.push_tokens for all using (auth.uid() = parent_id);

-- Saved addresses
create policy "Users manage own addresses"
  on public.saved_addresses for all using (auth.uid() = parent_id);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-create profile on first sign-in
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, display_name, role)
  values (new.id, new.raw_user_meta_data->>'display_name', 'parent')
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
