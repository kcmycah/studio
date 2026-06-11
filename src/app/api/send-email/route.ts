
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

/**
 * Sends a professional executive audit briefing via email.
 * Accepts pre-computed data from the client to bypass server-side Firestore permission issues
 * when using the Client SDK in a server environment.
 */
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Email service configuration missing. Please add RESEND_API_KEY to your environment variables.' 
      }, { status: 500 });
    }

    const resend = new Resend(apiKey);
    const { 
      recipientEmail, 
      systemName, 
      overallScore, 
      version, 
      summaryText, 
      recommendation,
      performanceLevel,
      testRuns 
    } = await req.json();

    if (!recipientEmail || !systemName) {
      return NextResponse.json({ error: 'Missing required report data (recipient or system name).' }, { status: 400 });
    }

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #111; border: 1px solid #eee; border-radius: 8px; overflow: hidden; background-color: #fff;">
        <div style="background-color: #000; color: #fff; padding: 40px;">
          <p style="text-transform: uppercase; font-size: 10px; font-weight: 800; margin: 0 0 10px 0; letter-spacing: 2px; opacity: 0.6;">Executive Briefing</p>
          <h1 style="margin: 0; font-size: 24px; font-weight: 900;">${systemName} v${version || '1.0'}</h1>
        </div>
        
        <div style="padding: 40px;">
          <div style="text-align: center; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 30px;">
            <p style="text-transform: uppercase; font-size: 10px; font-weight: 800; color: #666; letter-spacing: 2px;">Inclusive Performance Score</p>
            <h2 style="font-size: 64px; margin: 0; color: #5e6ad2;">${overallScore}/100</h2>
            <p style="font-weight: 700; color: #666;">Status: ${performanceLevel || 'Assessment Complete'}</p>
          </div>

          <h3 style="font-size: 12px; font-weight: 900; text-transform: uppercase; color: #999; margin-bottom: 10px;">Strategic Summary</h3>
          <p style="line-height: 1.6; margin-bottom: 30px; font-size: 16px;">${summaryText}</p>

          <div style="background-color: #f5f3ff; border-left: 4px solid #5e6ad2; padding: 20px; border-radius: 0 4px 4px 0; margin-bottom: 30px;">
            <p style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #5e6ad2; margin: 0 0 5px 0;">Recommendation</p>
            <p style="font-style: italic; font-weight: 700; margin: 0; color: #4338ca;">${recommendation}</p>
          </div>

          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f9fafb; text-align: left;">
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #999;">Persona</th>
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase; color: #999;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${(testRuns || []).map((run: any) => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px; font-size: 14px; font-weight: 600;">${run.persona}</td>
                  <td style="padding: 10px; font-size: 14px;">${run.success ? '✅ Pass' : '❌ FAIL'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
            <p style="font-size: 10px; color: #999; text-transform: uppercase; font-weight: 700;">
              DISA Framework • Automated Pipeline v2.4
            </p>
          </div>
        </div>
      </div>
    `;

    const { data, error } = await resend.emails.send({
      from: 'DISA Briefings <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `Briefing: ${systemName} (${overallScore}/100)`,
      html: htmlContent
    });

    if (error) {
      console.error('Resend Delivery Error:', error);
      return NextResponse.json({ 
        error: error.message || 'Resend failed to deliver the email. Ensure the recipient is verified if using a trial account.' 
      }, { status: 400 });
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (err: any) {
    console.error('Email Dispatch Fatal Error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error during email dispatch.' }, { status: 500 });
  }
}
