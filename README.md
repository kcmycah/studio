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
git commit -m "Initialize DISA Audit Pipeline with subcollection architecture"

# Link to your GitHub repository
git remote add origin https://github.com/kcmycah/disa-app.git

# Set the main branch
git branch -M main

# Push your code
git push -u origin main
```

### 2. Configure Firebase
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: **disa-ec810**.
3. Enable **Authentication** with the Email/Password provider.
4. Create a **Cloud Firestore** database in production mode.
5. Deploy Security Rules: The rules in `firestore.rules` are optimized for the subcollection model.

### 3. Deploy to Vercel
1. Install the Vercel CLI: `npm install -g vercel`.
2. Run `vercel` to link your project and deploy a preview.
3. Add your environment variables in the Vercel Project Settings (copy them from your `.env`).
4. Run `vercel --prod` for the final production deployment.

## Architecture Notes
- **Subcollection Model**: High-performance nested path structure: `ai_systems/{id}/assessments`.
- **Path-Scoped Security**: Firestore rules verify ownership at the parent system level for nested audit reports.
- **Genkit Integration**: Specialized GenAI flows for executive summaries and persona impact analysis.

---
Built for the inclusive future of AI.
