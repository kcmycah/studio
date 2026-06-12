
# AuditAccess - Inclusive AI Audit Pipeline

AuditAccess is a professional platform for auditing AI systems for accessibility and fairness using the **DISA (Disability-Inclusive System Assessment)** framework.

## 🚀 Deployment & Export Guide

### 1. Initialize and Push to GitHub
If you are setting up this repository for the first time, run these commands in your **local terminal**:

```bash
# Initialize and commit
git init
git add .
git commit -m "Fix: Resolve build dependencies for production"

# Link and push to your repository
git remote add origin https://github.com/kcmycah/disa-app.git
git branch -M main
git push -u origin main
```

### 2. Create a Project Archive (Zip)
To create a clean archive of your project (excluding heavy dependencies and git history), run:

```bash
zip -r disa-app.zip . -x "*.git*" "node_modules/*" ".next/*" "disa-app.zip"
```

### 3. Deploy to Vercel or Firebase App Hosting
1. Install the CLI for your target platform.
2. Link your project.
3. Ensure all environment variables (Firebase, Gemini, Resend, Lemon Squeezy) are added to your dashboard.

---
Built for the inclusive future of AI.
