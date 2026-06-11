
import { NextRequest, NextResponse } from 'next/server';
import { stringify } from 'csv-stringify/sync';
import { initializeFirebase } from '@/firebase';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';

export const maxDuration = 60;

/**
 * Generates a detailed CSV report for a DISA assessment.
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

    // Flatten all accessibility issues for detailed row-by-row violation reporting
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
      'Violation ID', 
      'Impact', 
      'Description', 
      'HTML Snippet'
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

    let issueFound = false;
    for (const run of testRuns) {
      if (run.accessibilityIssues && run.accessibilityIssues.length > 0) {
        issueFound = true;
        for (const issue of run.accessibilityIssues) {
          rows.push([
            ...baseData,
            run.persona,
            run.success ? 'Pass' : 'FAIL',
            issue.id || 'N/A',
            (issue.impact || 'N/A').toUpperCase(),
            issue.description || 'N/A',
            (issue.nodes || []).join('; ')
          ]);
        }
      } else {
        // If persona passed with no issues, add a summary row for that persona
        rows.push([
          ...baseData,
          run.persona,
          'Pass',
          'N/A',
          'N/A',
          'No significant barriers detected.',
          ''
        ]);
      }
    }

    const csv = stringify(rows);

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=DISA-Detailed-Report-${systemName}-${assessmentId}.csv`
      }
    });
  } catch (error: any) {
    console.error('CSV Export Fatal Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
