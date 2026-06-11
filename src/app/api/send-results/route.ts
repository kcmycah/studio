
import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a deterministic audit report via email using Resend.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, systemName, score, summary, recommendation, version } = await req.json();

    const { data, error } = await resend.emails.send({
      from: "DISA Audit <reports@yourdomain.com>",
      to: [email],
      subject: `Inclusive Audit Report: ${systemName} v${version}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
          <h2 style="color: #6366f1;">DISA Framework Audit</h2>
          <p>Results for <strong>${systemName} v${version}</strong></p>
          
          <div style="background: #f8fafc; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="text-transform: uppercase; font-size: 12px; font-weight: bold; color: #64748b; margin-bottom: 5px;">Overall DISA Score</p>
            <h1 style="font-size: 48px; margin: 0; color: ${score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444'};">${score}/100</h1>
          </div>

          <h3>Executive Summary</h3>
          <p style="line-height: 1.6; color: #334155;">${summary}</p>

          <div style="border-left: 4px solid #6366f1; padding-left: 15px; margin: 20px 0;">
            <p style="font-weight: bold; text-transform: uppercase; font-size: 11px; color: #6366f1;">Recommendation</p>
            <p style="font-style: italic; color: #475569;">${recommendation}</p>
          </div>

          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
          
          <p style="font-size: 12px; color: #94a3b8;">
            <strong>Disclaimer:</strong> Automated testing catches only 30-40% of accessibility issues. 
            Manual testing with real users is also required for full DISA framework compliance.
          </p>
        </div>
      `,
    });

    if (error) return NextResponse.json({ error }, { status: 400 });

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
