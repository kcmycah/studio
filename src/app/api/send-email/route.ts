
import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { generateExecutiveSummary } from '@/lib/executiveSummary';
import { generatePersonaConclusion } from '@/lib/personaConclusion';

export const maxDuration = 60;

const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Sends a professional executive audit briefing via email.
 */
export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Resend API key missing. Please add RESEND_API_KEY to your environment.' }, { status: 500 });
    }

    const { assessmentId, recipientEmail } = await req.json();
    if (!assessmentId || !recipientEmail) {
      return NextResponse.json({ error: 'Missing assessment ID or recipient' }, { status: 400 });
    }

    const { firestore } = initializeFirebase();

    // Fetch Assessment, System, and Test Runs
    const assessmentDoc = await getDoc(doc(firestore, 'assessments', assessmentId));
    if (!assessmentDoc.exists()) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    const assessment = assessmentDoc.data();

    const systemDoc = await getDoc(doc(firestore, 'ai_systems', assessment.systemId));
    const system = systemDoc.exists() ? systemDoc.data() : { name: 'Unknown System', url: '' };
    
    const testRunsQuery = query(collection(firestore, 'testRuns'), where('assessmentId', '==', assessmentId));
    const testRunsSnap = await getDocs(testRunsQuery);
    const testRuns = testRunsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const passedCount = testRuns.filter(run => run.success).length;
    
    const issuesMap = new Map<string, { id: string; impact: string; count: number }>();
    testRuns.forEach(run => {
      (run.accessibilityIssues || []).forEach((issue: any) => {
        if (issuesMap.has(issue.id)) {
          issuesMap.get(issue.id)!.count++;
        } else {
          issuesMap.set(issue.id, { id: issue.id, impact: issue.impact, count: 1 });
        }
      });
    });
    const topIssues = Array.from(issuesMap.values()).sort((a, b) => b.count - a.count).slice(0, 5);

    const summary = generateExecutiveSummary(assessment.overallScore, passedCount, testRuns.length, topIssues);

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #111; border: 1px solid #eee; border-radius: 8px; overflow: hidden; background-color: #fff;">
        <div style="background-color: #000; color: #fff; padding: 40px;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 900;">Executive Briefing: ${system.name}</h1>
          <p style="margin: 5px 0 0; opacity: 0.7; font-size: 14px;">Version ${assessment.version} • DISA Framework v2.4</p>
        </div>
        
        <div style="padding: 40px;">
          <div style="text-align: center; margin-bottom: 40px;">
            <p style="text-transform: uppercase; font-size: 10px; font-weight: 800; color: #666; letter-spacing: 2px;">Inclusive Performance Score</p>
            <h2 style="font-size: 64px; margin: 0; color: ${assessment.overallScore >= 80 ? '#10b981' : assessment.overallScore >= 60 ? '#f59e0b' : '#ef4444'};">${assessment.overallScore}/100</h2>
            <p style="font-weight: 700; color: #666;">Status: ${summary.performanceLevel}</p>
          </div>

          <h3 style="font-size: 12px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">Executive Summary</h3>
          <p style="line-height: 1.6; margin-bottom: 30px;">${summary.summaryText}</p>

          <div style="background-color: #f9fafb; border-left: 4px solid #5e6ad2; padding: 20px; border-radius: 0 4px 4px 0; margin-bottom: 30px;">
            <p style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #5e6ad2; margin: 0 0 5px 0;">Strategic Recommendation</p>
            <p style="font-style: italic; font-weight: 700; margin: 0;">${summary.recommendation}</p>
          </div>

          <h3 style="font-size: 12px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #eee; padding-bottom: 5px; margin-bottom: 15px;">Persona Success Mapping</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f9fafb; text-align: left;">
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase;">Persona</th>
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase;">Status</th>
                <th style="padding: 10px; font-size: 11px; text-transform: uppercase;">Conclusion</th>
              </tr>
            </thead>
            <tbody>
              ${testRuns.map(run => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 10px; font-size: 14px; font-weight: 600;">${run.persona}</td>
                  <td style="padding: 10px; font-size: 14px;">${run.success ? '✅ Pass' : '❌ FAIL'}</td>
                  <td style="padding: 10px; font-size: 12px; color: #666;">${generatePersonaConclusion(run as any)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee;">
             <p style="font-size: 11px; color: #999; margin-bottom: 20px;">
               * Automated testing captures only 30‑40% of accessibility issues. Manual testing with real users is mandatory for full functional equity.
             </p>
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/assessments/${assessmentId}/results" style="background-color: #5e6ad2; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-weight: 700; font-size: 14px; display: inline-block;">View Full Interactive Report</a>
          </div>
        </div>
      </div>
    `;

    await resend.emails.send({
      from: 'DISA Briefings <onboarding@resend.dev>',
      to: [recipientEmail],
      subject: `Briefing: ${system.name} (${assessment.overallScore}/100)`,
      html: htmlContent
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Email Dispatch Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
