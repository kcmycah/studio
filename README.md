
# AuditAccess - Inclusive AI Audit Pipeline

This application audits AI systems for accessibility and fairness using automated scans and the DISA (Disability-Inclusive System Assessment) framework.

## 🚀 Deployment Instructions

### 1. Environment Variables
Ensure the following variables are set in your Vercel project settings:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `GEMINI_API_KEY`
- `LEMON_SQUEEZY_API_KEY`
- `LEMON_SQUEEZY_STORE_ID`
- `LEMON_SQUEEZY_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- `NEXT_PUBLIC_APP_URL` (Your production domain)

### 2. Firestore Security Rules
The rules have been migrated to a high-performance subcollection model (`ai_systems/{id}/assessments`). Ensure the latest `firestore.rules` from this repo are deployed to your Firebase console.

### 3. Push to GitHub
```bash
git add .
git commit -m "Production ready: Nested subcollection architecture"
git push origin main
```

## Features
- **Inclusive Audits**: Deterministic scans across 7 disability personas.
- **Subcollection Architecture**: High-performance, path-scoped data security.
- **AI Executive Summaries**: Genkit-powered briefs for stakeholders.
- **Monetization**: Lemon Squeezy integration for Pro/Enterprise tiers.

## Technical Stack
- **Next.js 15**: App Router with Server Actions.
- **Firebase**: Firestore (Subcollections) & Auth.
- **Genkit**: Gemini-powered accessibility analysis.
- **ShadCN UI**: Accessible, high-contrast interface.

Built with ❤️ for a more inclusive AI future.
