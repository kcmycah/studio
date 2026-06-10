
# AuditAccess - Inclusive AI Audit Pipeline

This application audits AI systems for accessibility and fairness using automated scans and AI-powered insights.

## Troubleshooting Connection Issues

If you encounter a **"Network Request Failed"** error when signing in or resetting your password:

1.  **Disable Ad-blockers**: Extensions like **uBlock Origin**, **AdBlock**, or **AdGuard** can block Firebase's authentication requests. 
    - Click the extension icon in your browser toolbar.
    - Click the "Power" icon or toggle switch to disable it for this site.
    - Refresh the page and try again.
2.  **Authorized Domains**: Ensure your current URL (e.g., `*.cloudworkstations.dev`) is added to the "Authorized Domains" list in the Firebase Console:
    - Go to **Authentication** > **Settings** > **Authorized Domains**.
    - Click **Add Domain** and enter your current site's root domain.

## Setup

1.  **Firebase Project**: Ensure you have a project at [Firebase Console](https://console.firebase.google.com/).
2.  **Environment Variables**: Fill out the `.env` file with your configuration from **Project Settings**.
3.  **Enable Auth**: Go to **Authentication** > **Sign-in method** and enable **Email/Password**.

## Features

- **Inclusive Audits**: Run scans across multiple disability personas.
- **DISA Scoring**: Automatically calculate compliance scores.
- **AI Insights**: Generate executive summaries and impact explanations using Genkit.
