
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
git add .

# Create your first commit
git commit -m "Initial commit: Production DISA Pipeline"

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
5. The Security Rules are already provided in `firestore.rules`.

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
In your Vercel Project Settings, add the variables from your `.env` file. Ensure `NEXT_PUBLIC_APP_URL` is set to your production domain (e.g., https://disa-app.vercel.app).

### 5. Final Production Push
Once environment variables are set, trigger the production build:
```bash
# Deploy to production
vercel --prod
```

## Architecture Notes
- **Subcollection Model**: High-performance nested path structure: `ai_systems/{id}/assessments`.
- **Path-Scoped Security**: Firestore rules verify ownership at the parent system level.
- **Deterministic Scoring**: Audit results are URL-seeded for stable benchmarking.

---
Built for the inclusive future of AI.
