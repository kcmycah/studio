# AuditAccess - Inclusive AI Audit Pipeline

This application audits AI systems for accessibility and fairness using automated scans and DISA framework insights.

## Features
- **Inclusive Audits**: Run deterministic scans across multiple disability personas.
- **DISA Scoring**: Automatically calculate weighted compliance scores.
- **Deterministic Summaries**: Instant, template-based executive reports for stakeholders.

## Technical Stack
- **Next.js 15**: App Router architecture.
- **Firebase**: Firestore for audit history and Auth for secure workspace management.
- **ShadCN UI**: High-contrast, accessible interface components.
- **Genkit**: Powering deep-dive persona impact analysis (optional).

## Troubleshooting

### 1. Authentication Errors
- Ensure your workstation URL is in **Firebase Console > Authentication > Settings > Authorized Domains**.
- Disable ad-blockers for proper login functionality.

### 2. DISA Scoring Consistency
Audits are seeded by the system URL to ensure consistent results across multiple runs of the same AI endpoint.
