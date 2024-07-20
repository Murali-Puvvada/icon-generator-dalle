import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import Stripe from "stripe";
import { env } from "~/env.mjs";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

//Protected for LoggedIn users. Creates a stripe checkout session.
export const checkoutRouter = createTRPCRouter({
  createCheckout: protectedProcedure.mutation(async ({ ctx }) => {
    return await stripe.checkout.sessions.create({
      metadata: { userId: ctx.session.user.id },
      success_url: env.HOST_NAME,
      line_items: [
        {
          price: "price_1PdcEP2KJp5kmf4k0URpjr2j",
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_method_types: ["card"],
    });
  }),
});
