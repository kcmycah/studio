
# AuditAccess - Inclusive AI Audit Pipeline

AuditAccess is a professional platform for auditing AI systems for accessibility and fairness using the **DISA (Disability-Inclusive System Assessment)** framework.

## 🚀 Terminal Commands (Run these in your Command Prompt/Terminal)

Follow these steps exactly to push your changes and fix build errors:

### 1. Stage and Commit Changes
```bash
# Add all updated files
git add .

# Commit with a descriptive message
git commit -m "Fix: Resolve Lemon Squeezy module resolution and configuration"

# Push to your GitHub repository
git push origin main
```

### 2. Manual Firebase App Hosting Rollout
If you need to manually trigger a rollout for a specific backend:
```bash
# Replace BACKEND_ID with your actual backend ID from the Firebase console
firebase apphosting:rollouts:create BACKEND_ID
```

### 3. Create a Project Archive (Zip)
If you need to send the project as a file:
```bash
zip -r disa-app.zip . -x "*.git*" "node_modules/*" ".next/*" "disa-app.zip"
```

### 4. Deploy to Firebase App Hosting
Once you push to GitHub, Firebase App Hosting will automatically trigger a build. If it fails, check the logs in the Firebase Console.

---
Built for the inclusive future of AI.
