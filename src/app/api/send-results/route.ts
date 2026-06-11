
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

/**
 * Sends a deterministic audit report via email using Resend.
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json(
        { error: "Resend API Key is missing. Please add RESEND_API_KEY to your environment variables." },
        { status: 500 }
      );
    }

    const resend = new Resend(apiKey);
    const { email, systemName, score, summary, recommendation, version } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Recipient email is required" }, { status: 400 });
    }

    // Using onboarding@resend.dev as it works with unverified domains for testing purposes
    const { data, error } = await resend.emails.send({
      from: "DISA Audit <onboarding@resend.dev>",
      to: [email],
      subject: `Inclusive Audit Report: ${systemName} v${version}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px; background-color: #ffffff; color: #111111;">
          <h2 style="color: #6366f1; margin-top: 0;">DISA Framework Audit</h2>
          <p>Results for <strong>${systemName} v${version}</strong></p>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 12px; text-align: center; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="text-transform: uppercase; font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 5px; letter-spacing: 0.05em;">Overall DISA Score</p>
            <h1 style="font-size: 56px; margin: 0; color: ${score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'}; font-weight: 800;">${score}/100</h1>
          </div>

          <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 10px;">Executive Summary</h3>
          <p style="line-height: 1.6; color: #334155; margin-bottom: 20px;">${summary}</p>

          <div style="border-left: 4px solid #6366f1; padding: 15px; background-color: #f5f3ff; border-radius: 0 8px 8px 0; margin: 20px 0;">
            <p style="font-weight: 800; text-transform: uppercase; font-size: 11px; color: #6366f1; margin: 0 0 5px 0; letter-spacing: 0.05em;">Recommendation</p>
            <p style="font-style: italic; color: #4338ca; margin: 0; font-size: 15px;">${recommendation}</p>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          
          <p style="font-size: 12px; color: #94a3b8; line-height: 1.5;">
            <strong>Disclaimer:</strong> Automated testing catches only 30-40% of accessibility issues. 
            Full DISA framework compliance requires manual testing with real users.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("Resend API Error:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error("Email Route Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
