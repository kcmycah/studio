# AuditAccess - Inclusive AI Audit Pipeline

AuditAccess is a professional platform for auditing AI systems for accessibility and fairness using the **DISA (Disability-Inclusive System Assessment)** framework.

## 🚀 Deployment Guide

Follow these steps to push your code to GitHub and deploy to production.

### 1. Initialize and Push to GitHub
Run these commands in your local project root:

```bash
# Initialize git (if not already done)
git init

# Add all project files
git add .

# Create the initial commit
git commit -m "Launch: DISA Audit Pipeline v1.0"

# Link your local repo to GitHub
git remote add origin https://github.com/kcmycah/disa-app.git

# Rename branch to main
git branch -M main

# Push the code
git push -u origin main
```

### 2. Deploy to Vercel
1. Install the Vercel CLI: `npm install -g vercel`.
2. Run `vercel` to link your project and deploy a preview.
3. Add your environment variables (Firebase Keys, Gemini Key, Resend Key) in the [Vercel Dashboard Settings](https://vercel.com/dashboard).
4. Run `vercel --prod` for the final production deployment.

### 3. Database & Security
Ensure your Firestore rules from `firestore.rules` are deployed via the Firebase Console.

---
Built for the inclusive future of AI.
