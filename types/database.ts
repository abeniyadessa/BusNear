export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          phone: string | null;
          display_name: string | null;
          role: 'parent' | 'driver' | 'admin';
          created_at: string;
        };
        Insert: {
          id: string;
          phone?: string | null;
          display_name?: string | null;
          role?: 'parent' | 'driver' | 'admin';
          created_at?: string;
        };
        Update: {
          phone?: string | null;
          display_name?: string | null;
          role?: 'parent' | 'driver' | 'admin';
        };
        Relationships: [];
      };
      schools: {
        Row: { id: string; name: string; address: string | null; created_at: string };
        Insert: { id?: string; name: string; address?: string | null };
        Update: { name?: string; address?: string | null };
        Relationships: [];
      };
      routes: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          waypoints: Json;
          stops: Json;
          created_at: string;
        };
        Insert: {
          id: string;
          name: string;
          description?: string | null;
          waypoints?: Json;
          stops?: Json;
        };
        Update: {
          name?: string;
          description?: string | null;
          waypoints?: Json;
          stops?: Json;
        };
        Relationships: [];
      };
      buses: {
        Row: {
          id: string;
          route_id: string | null;
          driver_id: string | null;
          license_plate: string | null;
          capacity: number;
          created_at: string;
        };
        Insert: {
          id: string;
          route_id?: string | null;
          driver_id?: string | null;
          license_plate?: string | null;
          capacity?: number;
        };
        Update: {
          route_id?: string | null;
          driver_id?: string | null;
          license_plate?: string | null;
          capacity?: number;
        };
        Relationships: [];
      };
      children: {
        Row: {
          id: string;
          first_name: string;
          last_name: string | null;
          grade: string | null;
          school_id: string | null;
          assigned_bus_id: string | null;
          assigned_route_id: string | null;
          avatar_color: string;
          created_at: string;
        };
        Insert: {
          id: string;
          first_name: string;
          last_name?: string | null;
          grade?: string | null;
          school_id?: string | null;
          assigned_bus_id?: string | null;
          assigned_route_id?: string | null;
          avatar_color?: string;
        };
        Update: {
          first_name?: string;
          last_name?: string | null;
          grade?: string | null;
          assigned_bus_id?: string | null;
          assigned_route_id?: string | null;
          avatar_color?: string;
        };
        Relationships: [];
      };
      parent_children: {
        Row: { parent_id: string; child_id: string; created_at: string };
        Insert: { parent_id: string; child_id: string };
        Update: { parent_id?: string; child_id?: string };
        Relationships: [];
      };
      bus_locations: {
        Row: {
          bus_id: string;
          latitude: number;
          longitude: number;
          heading: number;
          speed: number;
          status: string;
          waypoint_index: number;
          eta_minutes: number;
          is_active: boolean;
          updated_at: string;
        };
        Insert: {
          bus_id: string;
          latitude: number;
          longitude: number;
          heading?: number;
          speed?: number;
          status?: string;
          waypoint_index?: number;
          eta_minutes?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Update: {
          latitude?: number;
          longitude?: number;
          heading?: number;
          speed?: number;
          status?: string;
          waypoint_index?: number;
          eta_minutes?: number;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      ridership_events: {
        Row: {
          id: string;
          child_id: string | null;
          bus_id: string | null;
          event_type: 'boarded' | 'exited';
          stop_name: string | null;
          latitude: number | null;
          longitude: number | null;
          recorded_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          child_id?: string | null;
          bus_id?: string | null;
          event_type: 'boarded' | 'exited';
          stop_name?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          recorded_by?: string | null;
        };
        Update: {
          stop_name?: string | null;
        };
        Relationships: [];
      };
      service_alerts: {
        Row: {
          id: string;
          bus_id: string | null;
          type: 'delay' | 'route_change' | 'stop_change' | 'cancellation';
          severity: 'low' | 'medium' | 'high';
          title: string;
          message: string;
          expires_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          bus_id?: string | null;
          type: 'delay' | 'route_change' | 'stop_change' | 'cancellation';
          severity?: 'low' | 'medium' | 'high';
          title: string;
          message: string;
          expires_at?: string | null;
        };
        Update: {
          type?: string;
          severity?: string;
          title?: string;
          message?: string;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      push_tokens: {
        Row: {
          id: string;
          parent_id: string;
          token: string;
          platform: 'ios' | 'android' | 'web' | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          token: string;
          platform?: 'ios' | 'android' | 'web' | null;
        };
        Update: { token?: string; platform?: string | null };
        Relationships: [];
      };
      saved_addresses: {
        Row: {
          id: string;
          parent_id: string;
          label: string;
          address: string;
          latitude: number;
          longitude: number;
          alerts_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          parent_id: string;
          label: string;
          address: string;
          latitude: number;
          longitude: number;
          alerts_enabled?: boolean;
        };
        Update: {
          label?: string;
          address?: string;
          latitude?: number;
          longitude?: number;
          alerts_enabled?: boolean;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
