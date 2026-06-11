
import { NextRequest, NextResponse } from 'next/server';
import { stringify } from 'csv-stringify/sync';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { generatePersonaConclusion } from '@/lib/personaConclusion';

export const maxDuration = 60;

/**
 * Generates a detailed CSV report for a DISA assessment.
 * Includes persona conclusions and detailed violation logs.
 */
export async function POST(req: NextRequest) {
  try {
    const { assessmentId } = await req.json();
    if (!assessmentId) return NextResponse.json({ error: 'Assessment ID required' }, { status: 400 });

    const { firestore } = initializeFirebase();

    // Fetch assessment, system, and test runs
    const assessmentDoc = await getDoc(doc(firestore, 'assessments', assessmentId));
    if (!assessmentDoc.exists()) {
      return NextResponse.json({ error: 'Assessment not found' }, { status: 404 });
    }
    const assessment = assessmentDoc.data();

    const systemDoc = await getDoc(doc(firestore, 'ai_systems', assessment.systemId));
    const systemName = systemDoc.exists() ? systemDoc.data().name : 'Unknown System';

    const testRunsQuery = query(collection(firestore, 'testRuns'), where('assessmentId', '==', assessmentId));
    const testRunsSnap = await getDocs(testRunsQuery);
    const testRuns = testRunsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Build CSV rows
    const rows: any[][] = [];
    
    // Header row
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
      'Description',
      'Affected Nodes'
    ]);

    const baseData = [
      assessment.createdAt?.toDate?.()?.toISOString() || 'N/A',
      systemName,
      assessment.overallScore,
      assessment.domainScores?.accessibility || 0,
      assessment.domainScores?.biasRisk || 0,
      assessment.domainScores?.transparency || 0,
      assessment.domainScores?.equityData || 0
    ];

    for (const run of testRuns) {
      const conclusion = generatePersonaConclusion(run as any);
      const personaBaseData = [...baseData, run.persona, run.success ? 'Pass' : 'FAIL', conclusion];
      
      if (run.accessibilityIssues && run.accessibilityIssues.length > 0) {
        for (const issue of run.accessibilityIssues) {
          rows.push([
            ...personaBaseData,
            issue.id || 'N/A',
            (issue.impact || 'N/A').toUpperCase(),
            issue.description || 'N/A',
            (issue.nodes || []).join('; ')
          ]);
        }
      } else {
        rows.push([
          ...personaBaseData,
          'N/A',
          'N/A',
          'No significant functional barriers detected.',
          'N/A'
        ]);
      }
    }

    const csv = stringify(rows);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=DISA-Detailed-Log-${systemName.replace(/\s+/g, '-')}.csv`
      }
    });
  } catch (error: any) {
    console.error('CSV Export Fatal Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
