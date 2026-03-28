import * as z from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";

export const busRouter = createTRPCRouter({
  getStatus: publicProcedure
    .input(z.object({ busId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { data } = await ctx.supabase
        .from("bus_locations")
        .select("*")
        .eq("bus_id", input.busId)
        .single();

      if (!data) {
        return {
          busId: input.busId,
          status: "offline" as const,
          position: { latitude: 37.391, longitude: -122.0793 },
          heading: 0,
          speed: 0,
          eta: 0,
          lastUpdated: Date.now(),
          isActive: false,
        };
      }

      return {
        busId: data.bus_id,
        status: data.status as
          | "not_started"
          | "on_time"
          | "delayed"
          | "arriving"
          | "arrived"
          | "offline",
        position: { latitude: data.latitude, longitude: data.longitude },
        heading: data.heading,
        speed: data.speed,
        eta: data.eta_minutes,
        lastUpdated: new Date(data.updated_at).getTime(),
        isActive: data.is_active,
      };
    }),

  getRoute: publicProcedure
    .input(z.object({ routeId: z.string() }))
    .query(async ({ input, ctx }) => {
      const { data } = await ctx.supabase
        .from("routes")
        .select("id, name, description, stops")
        .eq("id", input.routeId)
        .single();

      if (!data) {
        return {
          id: input.routeId,
          name: "Route 7 — Oakwood Elementary",
          busId: "Bus #12",
          stopsCount: 6,
        };
      }

      const stops = Array.isArray(data.stops) ? data.stops : [];

      return {
        id: data.id,
        name: data.name,
        busId: "Bus #12",
        stopsCount: stops.length,
      };
    }),

  registerPushToken: publicProcedure
    .input(
      z.object({
        parentId: z.string(),
        pushToken: z.string(),
        platform: z.enum(["ios", "android", "web"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { error } = await ctx.supabase.from("push_tokens").upsert({
        parent_id: input.parentId,
        token: input.pushToken,
        platform: input.platform,
      });

      if (error) {
        console.error("[API] Failed to register push token:", error.message);
        return { success: false };
      }

      return { success: true };
    }),
});
