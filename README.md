# AuditAccess - Inclusive AI Audit Pipeline

AuditAccess is a professional platform for auditing AI systems for accessibility and fairness using the **DISA (Disability-Inclusive System Assessment)** framework.

## 🚀 Deployment Commands

### Deploy to Vercel
If you prefer to deploy to Vercel, use the following command in your terminal:
```bash
npx vercel --prod
```

### Deploy to Firebase App Hosting
Firebase App Hosting automatically triggers builds on push. To manually trigger a rollout:
```bash
# Replace BACKEND_ID with your actual backend ID from the Firebase console
firebase apphosting:rollouts:create BACKEND_ID
```

### Fix Build Errors (Module Resolution)
If you see `@lemonsqueezy/lemonsqueezy.js` not found errors, ensure you run:
```bash
npm install
git add .
git commit -m "Fix: Resolve Lemon Squeezy dependency"
git push origin main
```

## 🛠 Project Management

### Stage and Commit Changes
```bash
git add .
git commit -m "Update configuration and deployment settings"
git push origin main
```

### Create a Project Archive (Zip)
```bash
zip -r disa-app.zip . -x "*.git*" "node_modules/*" ".next/*" "disa-app.zip"
```

---
Built for the inclusive future of AI.