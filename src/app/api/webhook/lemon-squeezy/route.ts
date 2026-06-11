
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { initializeFirebase } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";

/**
 * Webhook handler for Lemon Squeezy events.
 * Updates user subscription status in Firestore.
 */
export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-signature") || "";
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET || "";

  // Verify HMAC signature
  const hmac = crypto.createHmac("sha256", secret);
  const digest = hmac.update(body).digest("hex");

  if (signature !== digest) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(body);
  const eventName = payload.meta.event_name;
  const customData = payload.meta.custom_data;
  const userId = customData?.user_id;

  if (!userId) {
    return NextResponse.json({ error: "No user ID in metadata" }, { status: 400 });
  }

  const { firestore } = initializeFirebase();
  const userRef = doc(firestore, "users", userId);

  try {
    if (eventName === "subscription_created" || eventName === "subscription_updated") {
      const variantName = payload.data.attributes.variant_name.toLowerCase();
      const status = variantName.includes("pro") ? "pro" : variantName.includes("enterprise") ? "enterprise" : "free";
      
      await updateDoc(userRef, {
        subscriptionStatus: status,
        lemonSqueezyCustomerId: payload.data.attributes.customer_id.toString()
      });
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook Processing Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
