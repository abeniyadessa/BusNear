import { initTRPC } from "@trpc/server";
import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { createClient } from "@supabase/supabase-js";
import { Database } from "@/types/database";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const createContext = async (opts: FetchCreateContextFnOptions) => {
  // Forward the user's auth token so RLS policies apply
  const authHeader = opts.req.headers.get("Authorization") ?? "";
  const token = authHeader.replace("Bearer ", "");

  const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: token
      ? { headers: { Authorization: `Bearer ${token}` } }
      : undefined,
    auth: { persistSession: false },
  });

  return { req: opts.req, supabase };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
