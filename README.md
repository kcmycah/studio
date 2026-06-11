
# AuditAccess - Inclusive AI Audit Pipeline

This application audits AI systems for accessibility and fairness using automated scans and AI-powered insights.

## Troubleshooting Connection Issues

### 1. Authentication Errors (Network Request Failed)
If you encounter a **"Network Request Failed"** error when signing in:
- **Disable Ad-blockers**: Extensions like **uBlock Origin** or **AdGuard** often block Firebase Auth. Turn them off for this site.
- **Authorized Domains**: Ensure your workstation URL is added in **Firebase Console > Authentication > Settings > Authorized Domains**.

### 2. AI Access Forbidden (403 Error)
If "Generate AI Insights" says access is forbidden:
1. **Enable the API**: Go to the [Google Cloud API Library](https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com) and ensure **Generative Language API** is "Enabled".
2. **Check Key Restrictions**:
   - Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials).
   - Click on your API Key.
   - Look at **API restrictions**.
   - If "Restrict key" is on, ensure **Generative Language API** is checked.
   - If you just enabled the API, wait 5 minutes for Google's servers to sync.

## Features
- **Inclusive Audits**: Run scans across multiple disability personas.
- **DISA Scoring**: Automatically calculate compliance scores.
- **AI Insights**: Generate executive summaries using Genkit and Gemini 1.5 Flash.
