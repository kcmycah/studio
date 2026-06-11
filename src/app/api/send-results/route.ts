import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/**
 * Sends a deterministic executive audit report via email using Resend.
 * Optimized for unverified testing domains via onboarding@resend.dev.
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      console.error("Missing RESEND_API_KEY");
      return NextResponse.json(
        { error: "Email service configuration missing. Please add RESEND_API_KEY." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const { email, systemName, score, summary, recommendation, version } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
    }

    // High-contrast, executive styled HTML template
    const { data, error } = await resend.emails.send({
      from: "DISA Executive Reports <onboarding@resend.dev>",
      to: [email],
      subject: `Executive Briefing: ${systemName} v${version}`,
      html: `
        <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #000; padding: 0; border-radius: 4px; background-color: #ffffff; color: #000000;">
          <div style="background-color: #000; color: #fff; padding: 40px; text-align: left;">
            <p style="text-transform: uppercase; font-size: 10px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: 2px; opacity: 0.6;">Confidential Briefing</p>
            <h1 style="font-size: 32px; margin: 0; font-weight: 900; letter-spacing: -1px;">${systemName} v${version}</h1>
          </div>
          
          <div style="padding: 40px;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px;">
              <div style="text-align: center; width: 100%;">
                <p style="text-transform: uppercase; font-size: 10px; font-weight: 800; color: #666; margin-bottom: 5px; letter-spacing: 1px;">Inclusive Performance Score</p>
                <h2 style="font-size: 64px; margin: 0; color: ${score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#5e6ad2'}; font-weight: 900;">${score}/100</h2>
              </div>
            </div>

            <h3 style="font-size: 12px; font-weight: 900; text-transform: uppercase; margin-bottom: 10px; letter-spacing: 1px; color: #999;">Executive Summary</h3>
            <p style="line-height: 1.6; color: #000; margin-bottom: 30px; font-size: 16px; font-weight: 500;">${summary}</p>

            <div style="border-left: 4px solid #5e6ad2; padding: 20px; background-color: #f5f3ff; margin: 20px 0;">
              <p style="font-weight: 900; text-transform: uppercase; font-size: 10px; color: #5e6ad2; margin: 0 0 5px 0; letter-spacing: 1px;">Strategic Recommendation</p>
              <p style="font-style: italic; color: #4338ca; margin: 0; font-size: 16px; font-weight: 700;">${recommendation}</p>
            </div>

            <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #eee; text-align: center;">
              <p style="font-size: 10px; color: #999; line-height: 1.5; text-transform: uppercase; font-weight: 700;">
                DISA Framework Assessment • Automated Pipeline • v2.4
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API Delivery Error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error("Email Route Fatal Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
