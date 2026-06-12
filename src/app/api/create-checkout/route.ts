
import { NextRequest, NextResponse } from "next/server";
import { lemonSqueezySetup, createCheckout } from "@lemonsqueezy/lemonsqueezy.js";

/**
 * @fileOverview Initiates a Lemon Squeezy checkout session for Pro/Enterprise plans.
 */

export async function POST(req: NextRequest) {
  try {
    const { userId, userEmail, variantId } = await req.json();

    const apiKey = process.env.LEMON_SQUEEZY_API_KEY;
    const storeIdStr = process.env.LEMON_SQUEEZY_STORE_ID;

    if (!apiKey || !storeIdStr) {
      console.error("Lemon Squeezy Configuration Missing:", { apiKey: !!apiKey, storeId: !!storeIdStr });
      return NextResponse.json({ 
        error: "Payments are not configured on the server. Missing LEMON_SQUEEZY_STORE_ID or API KEY." 
      }, { status: 500 });
    }

    if (!userId || !variantId) {
      return NextResponse.json({ error: "Missing user details or plan variant" }, { status: 400 });
    }

    const storeId = parseInt(storeIdStr, 10);
    if (isNaN(storeId)) {
      return NextResponse.json({ error: "Invalid LEMON_SQUEEZY_STORE_ID. Must be a numeric value." }, { status: 500 });
    }

    // Initialize Lemon Squeezy client
    lemonSqueezySetup({
      apiKey: apiKey,
      onError: (error) => console.error("Lemon Squeezy Initialization Error:", error),
    });

    // Create the checkout session
    const checkout = await createCheckout(
      storeId.toString(),
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

    if (!checkout.data) {
      throw new Error("Lemon Squeezy API did not return a checkout object. Verify your Store ID and Variant ID.");
    }

    return NextResponse.json({ url: checkout.data.data.attributes.url });
  } catch (error: any) {
    console.error("Checkout System Error:", error);
    return NextResponse.json({ 
      error: error.message || "Failed to initiate billing session. Please try again later." 
    }, { status: 500 });
  }
}
