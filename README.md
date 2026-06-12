
# AuditAccess - Inclusive AI Audit Pipeline

AuditAccess is a professional platform for auditing AI systems for accessibility and fairness using the **DISA (Disability-Inclusive System Assessment)** framework.

## 🚀 Deployment Guide

### 1. Push to GitHub
Run these commands in your project root to upload the source code to your repository:

```bash
# Initialize git
git init

# Add all files
git add .

# Create your first commit
git commit -m "Production Launch: DISA Pipeline Ready"

# Link to your GitHub repository
git remote add origin https://github.com/kcmycah/disa-app.git

# Set the main branch
git branch -M main

# Push your code
git push -u origin main
```

### 2. Configure Firebase
1. Go to the [Firebase Console](https://console.firebase.com/).
2. Select your project: **disa-ec810**.
3. Enable **Authentication** with the Email/Password provider.
4. Create a **Cloud Firestore** database in production mode.

### 3. Deploy to Vercel
1. Install the Vercel CLI: `npm install -g vercel`.
2. Run `vercel` to link your project and deploy a preview.
3. Add your environment variables in the Vercel Project Settings (copy them from your `.env`).
4. Run `vercel --prod` for the final production deployment.

---
Built for the inclusive future of AI.
