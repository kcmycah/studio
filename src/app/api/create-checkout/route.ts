import { NextRequest, NextResponse } from "next/server";
import { lemonSqueezySetup, createCheckout } from "@lemonsqueezy/lemonsqueezy.js";

/**
 * Initiates a Lemon Squeezy checkout for Pro/Enterprise plans.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, variantId } = await req.json();

    const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    const storeId = process.env.LEMON_SQUEEZY_STORE_ID;

    if (!apiKey || !storeId) {
      console.error("Lemon Squeezy Configuration Missing:", { apiKey: !!apiKey, storeId: !!storeId });
      return NextResponse.json({ 
        error: "Payments are not configured. Please ensure LEMON_SQUEEZY_API_KEY and LEMON_SQUEEZY_STORE_ID are set in your environment variables." 
      }, { status: 500 });
    }

    if (!userId || !variantId) {
      return NextResponse.json({ error: "Missing required fields: userId or variantId" }, { status: 400 });
    }

    lemonSqueezySetup({
      apiKey: apiKey,
      onError: (error) => console.error("Lemon Squeezy Setup Error:", error),
    });

    const checkout = await createCheckout(
      storeId,
      variantId,
      {
        checkoutData: {
          email: userEmail,
          custom: {
            user_id: userId,
          },
        },
        productOptions: {
          redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL || ''}/dashboard?checkout=success`,
        },
      }
    );

    return NextResponse.json({ url: checkout.data?.data.attributes.url });
  } catch (error: any) {
    console.error("Checkout Creation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create checkout" }, { status: 500 });
  }
}