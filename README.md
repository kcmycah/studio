
# AuditAccess - Inclusive AI Audit Pipeline

This application audits AI systems for accessibility and fairness using automated scans and the DISA (Disability-Inclusive System Assessment) framework.

## Features
- **Inclusive Audits**: Deterministic scans across multiple disability personas (Blind, Low Vision, Deaf, Dyslexic, etc.).
- **DISA Scoring**: Multi-dimensional compliance weighting (Accessibility, Task Completion, Accommodation).
- **Version Tracking**: Monitor improvements across AI system iterations with side-by-side comparison.
- **KPI Monitoring**: Filter by WCAG level and severity to prioritize remediation.
- **Monetization (Upcoming)**: Pro features via Lemon Squeezy integration.

## Technical Stack
- **Next.js 15**: App Router architecture with Server Actions and Route Handlers.
- **Firebase**: Firestore for audit results and Auth for workspace management.
- **Genkit**: Powering deep-dive persona impact analysis.
- **ShadCN UI**: High-contrast, accessible interface components.

## Troubleshooting

### 1. Authentication Errors
- Ensure your workstation URL is in **Firebase Console > Authentication > Settings > Authorized Domains**.
- Disable ad-blockers for proper login functionality.

### 2. AI Forbidden (403)
- If AI insights fail, ensure the **Generative Language API** is enabled in your Google Cloud Project.
- Check API key restrictions at **APIs & Services > Credentials**.

### 3. DISA Scoring Consistency
Audits are seeded by the system URL to ensure consistent and deterministic results for the same link across different runs.

```
