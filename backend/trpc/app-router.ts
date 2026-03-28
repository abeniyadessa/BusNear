import { createTRPCRouter } from "./create-context";
import { busRouter } from "./routes/bus";
import { ridershipRouter } from "./routes/ridership";

export const appRouter = createTRPCRouter({
  bus: busRouter,
  ridership: ridershipRouter,
});

export type AppRouter = typeof appRouter;
