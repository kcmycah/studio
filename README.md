# AuditAccess - Inclusive AI Audit Pipeline

AuditAccess is a production-grade platform for auditing AI systems for accessibility and fairness using the **DISA (Disability-Inclusive System Assessment)** framework.

## 🚀 Deployment Instructions

### 1. Environment Variables
Configure the following in your Vercel Project Settings:
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
- `CRON_SECRET` (For scheduled monitoring)

### 2. Firestore Security Rules
This application uses a high-performance **subcollection architecture**. Rules are path-scoped to `ai_systems/{id}/assessments` to ensure data privacy and listing efficiency. These rules are automatically managed by the Firebase Studio configuration.

### 3. Repository Initialization
```bash
git init
git add .
git commit -m "Initial commit: Production-ready DISA Pipeline"
gh repo create disa-app --public --source=. --remote=origin --push
```

### 4. Vercel Deployment
```bash
vercel login
vercel link
vercel --prod
```

## Architecture
- **Nested Assessments**: Assessments are stored per-system (`ai_systems/{id}/assessments`) to ensure strict data isolation and efficient path-scoped queries.
- **Intelligent Scoping**: The `useCollection` hook automatically injects security filters for top-level user-owned collections while respecting path-scoped subcollections.
- **GenAI Summaries**: Uses Genkit and Gemini to generate executive summaries and persona-impact explanations.
- **Billing Integration**: Full lifecycle management for Pro/Enterprise subscriptions via Lemon Squeezy.

---
Built for the inclusive future of AI.
