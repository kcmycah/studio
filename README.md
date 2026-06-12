# AuditAccess - Inclusive AI Audit Pipeline

AuditAccess is a production-grade platform for auditing AI systems for accessibility and fairness using the **DISA (Disability-Inclusive System Assessment)** framework.

## 🚀 Deployment Instructions

### 1. Environment Variables
Configure the following in your Vercel Project Settings:
- `NEXT_PUBLIC_FIREBASE_API_KEY`: Your Firebase API Key
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Your Firebase Project ID
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Your Firebase Auth Domain
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`: Your Firebase Storage Bucket
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`: Your Firebase Messaging Sender ID
- `NEXT_PUBLIC_FIREBASE_APP_ID`: Your Firebase App ID
- `GEMINI_API_KEY`: Your Google Gemini API Key
- `LEMON_SQUEEZY_API_KEY`: Your Lemon Squeezy API Key
- `LEMON_SQUEEZY_STORE_ID`: Your Lemon Squeezy Store ID
- `LEMON_SQUEEZY_WEBHOOK_SECRET`: Your Lemon Squeezy Webhook Secret
- `RESEND_API_KEY`: Your Resend API Key
- `NEXT_PUBLIC_APP_URL`: Your production domain (e.g., https://disa-app.vercel.app)

### 2. Firestore Security Rules
This application uses a high-performance **subcollection architecture**. Rules are path-scoped to `ai_systems/{id}/assessments` to ensure data privacy and listing efficiency. These rules are automatically managed by the Firebase Studio configuration.

### 3. Repository Initialization & Push
```bash
# Initialize git
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Production-ready DISA Pipeline"

# Create and push to GitHub
gh repo create disa-app --public --source=. --remote=origin --push
```

### 4. Vercel Deployment
```bash
# Login to Vercel
vercel login

# Link your project
vercel link

# Deploy to production
vercel --prod
```

## Architecture
- **Nested Assessments**: Assessments are stored per-system (`ai_systems/{id}/assessments`) to ensure strict data isolation and efficient path-scoped queries.
- **Intelligent Scoping**: The `useCollection` hook automatically handles security filters for top-level user-owned collections.
- **GenAI Summaries**: Uses Genkit and Gemini to generate executive summaries and persona-impact explanations.
- **Billing Integration**: Full lifecycle management for Pro/Enterprise subscriptions via Lemon Squeezy.

---
Built for the inclusive future of AI.