import { loadStripe } from "@stripe/stripe-js";
import { env } from "~/env.mjs";
import { api } from "~/utils/api";

const stripePromise = await loadStripe(env.NEXT_PUBLIC_STRIPE_KEY);

const useBuyCredits = () => {
  const checkout = api.checkout.createCheckout.useMutation();

  return {
    buyCredits: async () => {
      //Creates a stripe checkout session by calling TRPC Checkout Router
      const response = await checkout.mutateAsync();
      const stripe = await stripePromise;
      return await stripe?.redirectToCheckout({
        sessionId: response.id,
      });
    },
  };
};

export default useBuyCredits;
