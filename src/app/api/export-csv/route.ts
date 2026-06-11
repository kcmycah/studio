
import { NextRequest, NextResponse } from 'next/server';
import { stringify } from 'csv-stringify/sync';
import { generatePersonaConclusion } from '@/lib/personaConclusion';

/**
 * Generates a detailed CSV report for a DISA assessment.
 * Now accepts data directly from the client to bypass server-side Firestore auth barriers.
 */
export async function POST(req: NextRequest) {
  try {
    const { systemName, assessment, testRuns } = await req.json();

    if (!assessment || !testRuns) {
      return NextResponse.json({ error: 'Missing assessment or test run data.' }, { status: 400 });
    }

    const rows: any[][] = [];
    
    // Header Row
    rows.push([
      'Assessment Date', 
      'System Name', 
      'Overall DISA Score', 
      'Accessibility Score',
      'Bias Risk Score', 
      'Transparency Score', 
      'Equity Data Score',
      'Persona', 
      'Test Success', 
      'Persona Conclusion',
      'Violation ID', 
      'Impact', 
      'Description'
    ]);

    // Format Date safely (handling JSON serialized timestamps)
    let assessmentDate = 'N/A';
    if (assessment.createdAt) {
      if (assessment.createdAt.seconds) {
        assessmentDate = new Date(assessment.createdAt.seconds * 1000).toISOString();
      } else if (typeof assessment.createdAt === 'string') {
        assessmentDate = assessment.createdAt;
      }
    }

    const baseData = [
      assessmentDate,
      systemName || 'Unknown System',
      assessment.overallScore,
      assessment.domainScores?.accessibility || 0,
      assessment.domainScores?.biasRisk || 0,
      assessment.domainScores?.transparency || 0,
      assessment.domainScores?.equityData || 0
    ];

    for (const run of testRuns) {
      const conclusion = generatePersonaConclusion(run);
      const personaBaseData = [...baseData, run.persona, run.success ? 'Pass' : 'FAIL', conclusion];
      
      if (run.accessibilityIssues && run.accessibilityIssues.length > 0) {
        for (const issue of run.accessibilityIssues) {
          rows.push([
            ...personaBaseData,
            issue.id || 'N/A',
            (issue.impact || 'N/A').toUpperCase(),
            issue.description || 'N/A'
          ]);
        }
      } else {
        rows.push([
          ...personaBaseData,
          'N/A',
          'N/A',
          'No significant functional barriers detected.'
        ]);
      }
    }

    const csv = stringify(rows);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=DISA-Audit-Log-${(systemName || 'Report').replace(/\s+/g, '-')}.csv`
      }
    });
  } catch (error: any) {
    console.error('CSV Export Error:', error);
    return NextResponse.json({ error: error.message || 'Failed to generate CSV export.' }, { status: 500 });
  }
}
