
import { NextRequest, NextResponse } from "next/server";
import { lemonSqueezySetup, createCheckout } from "@lemonsqueezy/lemonsqueezy.js";

/**
 * Initiates a Lemon Squeezy checkout for Pro/Enterprise plans.
 * Since Stripe isn't available in Jamaica, Lemon Squeezy acts as the MoR.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, variantId } = await req.json();

    if (!userId || !variantId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    lemonSqueezySetup({
      apiKey: process.env.LEMON_SQUEEZY_API_KEY!,
      onError: (error) => console.error("Lemon Squeezy Setup Error:", error),
    });

    const checkout = await createCheckout(
      process.env.LEMON_SQUEEZY_STORE_ID!,
      variantId,
      {
        checkoutData: {
          email: userEmail,
          custom: {
            user_id: userId,
          },
        },
        productOptions: {
          redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
        },
      }
    );

    return NextResponse.json({ url: checkout.data?.data.attributes.url });
  } catch (error: any) {
    console.error("Checkout Creation Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
