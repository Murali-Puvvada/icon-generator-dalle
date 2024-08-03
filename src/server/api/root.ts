import { createTRPCRouter } from "~/server/api/trpc";
import { userRouter } from "~/server/api/routers/user";
import { generateRouter } from "./routers/generate";
import { checkoutRouter } from "./routers/checkout";
import { iconRouter } from "./routers/icons";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  user: userRouter,
  generate: generateRouter,
  checkout: checkoutRouter,
  icons: iconRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;
