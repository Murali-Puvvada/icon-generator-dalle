import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";
import { env } from "~/env.mjs";
import { buffer } from "micro";
import { prisma } from "~/server/db";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

//Tells Next to disable body parsing
//To consume raw content from stripe webhook
export const config = {
  api: {
    bodyParser: false,
  },
};

//Listens to reqs from Stripe and When successful update the credits using Prisma.
const webhook = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === "POST") {
    const buf = await buffer(req);
    const sig = req.headers["stripe-signature"] as string;

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        buf,
        sig,
        env.STRIPE_WEBHOOK_ENDPOINT_SECRET
      );
    } catch (err) {
      let message = "Unknown Error";
      if (err instanceof Error) message = err.message;
      res.status(400).send(`Webhook Error: ${message}`);
      return;
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const completedEvent = event.data.object as unknown as {
          id: string;
          metadata: {
            userId: string;
          };
        };

        await prisma.user.update({
          where: {
            id: completedEvent.metadata.userId,
          },
          data: {
            credits: {
              increment: 100,
            },
          },
        });
        // Then define and call a function to handle the event checkout.session.completed
        break;
      // ... handle other event types
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    // Return a 200 response to acknowledge receipt of the event
    res.send({ received: true });
  } else {
    res.setHeader("Allow", "POST");
    res.status(405).end("Method Not Allowed");
  }
};

export default webhook;
