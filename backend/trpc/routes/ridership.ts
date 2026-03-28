import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

const ridershipEventSchema = z.object({
  childId: z.string(),
  busId: z.string(),
  eventType: z.enum(["boarded", "exited"]),
  stopName: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  recordedBy: z.string().optional(),
});

export const ridershipRouter = createTRPCRouter({
  recordEvent: publicProcedure
    .input(ridershipEventSchema)
    .mutation(async ({ input, ctx }) => {
      const { data, error } = await ctx.supabase
        .from("ridership_events")
        .insert({
          child_id: input.childId,
          bus_id: input.busId,
          event_type: input.eventType,
          stop_name: input.stopName,
          latitude: input.latitude,
          longitude: input.longitude,
          recorded_by: input.recordedBy ?? null,
        })
        .select("id, created_at")
        .single();

      if (error) {
        console.error("[API] Failed to record ridership event:", error.message);
        return { success: false, event: null };
      }

      // Fire-and-forget: trigger push notifications via Edge Function
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseAnonKey) {
        fetch(`${supabaseUrl}/functions/v1/push-notify`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            childId: input.childId,
            childName: input.childId,
            busId: input.busId,
            eventType: input.eventType,
            stopName: input.stopName,
          }),
        }).catch(console.error);
      }

      return {
        success: true,
        event: {
          id: data.id,
          childId: input.childId,
          busId: input.busId,
          eventType: input.eventType,
          stopName: input.stopName,
          coordinate: { latitude: input.latitude, longitude: input.longitude },
          occurredAt: new Date(data.created_at).getTime(),
        },
      };
    }),

  getEvents: publicProcedure
    .input(
      z.object({
        childId: z.string(),
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      const { data } = await ctx.supabase
        .from("ridership_events")
        .select(
          "id, child_id, bus_id, event_type, stop_name, latitude, longitude, created_at, children(first_name, last_name)"
        )
        .eq("child_id", input.childId)
        .order("created_at", { ascending: false })
        .limit(input.limit);

      if (!data) return { events: [], total: 0 };

      const events = data.map((e: any) => ({
        id: e.id,
        childId: e.child_id,
        childName: `${e.children?.first_name ?? ""}${e.children?.last_name ? " " + e.children.last_name : ""}`,
        busId: e.bus_id,
        eventType: e.event_type as "boarded" | "exited",
        stopName: e.stop_name ?? "",
        coordinate: {
          latitude: e.latitude ?? 0,
          longitude: e.longitude ?? 0,
        },
        occurredAt: new Date(e.created_at).getTime(),
      }));

      return { events, total: events.length };
    }),

  getServiceAlerts: publicProcedure
    .input(z.object({ busId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { data } = await ctx.supabase
        .from("service_alerts")
        .select("*")
        .eq("bus_id", input.busId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!data) return { alerts: [] };

      const alerts = data.map((a) => ({
        id: a.id,
        type: a.type as "delay" | "route_change" | "stop_change" | "cancellation",
        severity: a.severity as "low" | "medium" | "high",
        title: a.title,
        message: a.message,
        busId: a.bus_id ?? input.busId,
        createdAt: new Date(a.created_at).getTime(),
        read: false,
      }));

      return { alerts };
    }),
});
