# AuditAccess - Inclusive AI Audit Pipeline

AuditAccess is a production-grade platform for auditing AI systems for accessibility and fairness using the **DISA (Disability-Inclusive System Assessment)** framework.

## 🚀 Deployment Instructions

### 1. Environment Variables
Configure the following in your deployment environment (e.g., Vercel):
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
This application uses a high-performance **subcollection architecture**. Rules are path-scoped to `ai_systems/{id}/assessments` to ensure data privacy and listing efficiency.

### 3. Repository Initialization
```bash
git init
git add .
git commit -m "Initial commit: Production-ready DISA Pipeline"
# Using GitHub CLI (gh)
gh repo create disa-app --public --source=. --remote=origin --push
```

### 4. Build & Vercel Deploy
```bash
npm run build
vercel --prod
```

## Features
- **Deterministic Persona Scans**: Audit systems across 7 key disability personas.
- **Subcollection Architecture**: Secure, path-scoped storage for assessments.
- **AI Executive Summaries**: Genkit-powered summaries for stakeholders.
- **Accessible UI**: High-contrast, keyboard-navigable interface built with ShadCN and Tailwind.

## Technical Stack
- **Next.js 15**: App Router with async parameter handling.
- **Firebase**: Firestore (Subcollections) & Auth.
- **Genkit**: Gemini-powered fairness and impact analysis.
- **ShadCN UI**: Professional, accessible component library.

Built with ❤️ for a more inclusive AI future.
