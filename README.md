
# AuditAccess - Inclusive AI Audit Pipeline

AuditAccess is a professional platform for auditing AI systems for accessibility and fairness using the **DISA (Disability-Inclusive System Assessment)** framework.

## 🚀 Step-by-Step Deployment Guide

Follow these steps to deploy your application to Vercel with a secure Firebase backend.

### 1. Initialize your Repository
Run these commands in your local terminal to prepare your code for the cloud:
```bash
# Initialize git
git init

# Add all files to the staging area
git add --all

# Create your first commit
git commit -m "Add full DISA app source code with subcollection architecture"

# Create a public GitHub repository and push your code
git remote add origin https://github.com/kcmycah/disa-app.git
git branch -M main
git push -u origin main
```

### 2. Configure Firebase
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Project: **disa-ec810** (already configured in the app).
3. Enable **Authentication** (Email/Password provider).
4. Create a **Cloud Firestore** database in **Production Mode**.
5. The Security Rules are already provided in `firestore.rules`. Ensure you deploy them.

### 3. Deploy to Vercel
Install the Vercel CLI and link your project:
```bash
# Install Vercel CLI
npm install -g vercel

# Log in to your account
vercel login

# Link your local project to Vercel
vercel link --yes
```

### 4. Set Environment Variables
In your Vercel Project Settings, add the variables from your `.env` file. Critical variables:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `GEMINI_API_KEY` (Required for AI generation)
- `RESEND_API_KEY` (Required for Email briefs)

### 5. Final Production Push
Once environment variables are set, trigger the production build:
```bash
# Deploy to production
vercel --prod
```

## Architecture Notes
- **Subcollection Model**: High-performance nested path structure: `ai_systems/{id}/assessments`.
- **Path-Scoped Security**: Firestore rules verify ownership at the parent system level for nested audit reports.
- **Genkit Integration**: Specialized GenAI flows for executive summaries and persona impact analysis.
- **Deterministic Scoring**: Audit results are URL-seeded for stable benchmarking across versions.

---
Built for the inclusive future of AI.
