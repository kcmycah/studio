
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
gh repo create disa-app --public --source=. --remote=origin --push
```

### 2. Configure Firebase
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Create a new project (or use an existing one).
3. Enable **Authentication** (Email/Password provider).
4. Create a **Cloud Firestore** database in **Production Mode**.
5. Go to Project Settings and copy your **Firebase SDK Config** object.

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
In your Vercel Project Settings, add the following variables. These are **critical** for the app to function:

| Variable Name | Description |
| :--- | :--- |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Your Firebase API Key |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Your Firebase Project ID |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Your Firebase Auth Domain |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Your Firebase App ID |
| `GEMINI_API_KEY` | Your Google AI (Gemini) API Key |
| `RESEND_API_KEY` | Your Resend API Key for email reports |
| `NEXT_PUBLIC_APP_URL` | Your production domain (e.g., https://disa-app.vercel.app) |

### 5. Final Production Push
Once environment variables are set, trigger the production build:
```bash
# Deploy to production
vercel --prod
```

## Architecture Notes
- **Subcollection Model**: This app uses a high-performance nested path structure: `ai_systems/{id}/assessments`. This ensures data is securely isolated and easy to audit.
- **Path-Scoped Security**: Firestore rules are automatically configured to verify ownership at the parent system level.
- **Deterministic Scoring**: Audit results are URL-seeded to provide a stable benchmark for engineering teams.

---
Built for the inclusive future of AI.
