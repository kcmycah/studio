
# AuditAccess - Inclusive AI Audit Pipeline

This is a Next.js application built to audit AI systems for accessibility and fairness.

## Getting Started

1. **Firebase Setup**: 
   - Create a project in the [Firebase Console](https://console.firebase.google.com/).
   - Enable **Authentication** (Email/Password).
   - Create a **Firestore** database.
   - Go to **Project Settings**, add a Web App, and copy the `firebaseConfig` values.

2. **Environment Variables**:
   - Open the `.env` file in this project.
   - Replace the placeholders with the values you copied from the Firebase Console.

3. **Troubleshooting "Network Request Failed"**:
   - If you encounter a network error during sign-in or password reset:
     1. **Disable Ad-blockers**: Some ad-blockers block Firebase Auth requests.
     2. **Authorized Domains**: Go to Firebase Console > Authentication > Settings > Authorized Domains. Ensure your current domain (e.g., `*.cloudworkstations.dev`) is added to the list.

4. **Run the App**:
   - The app will automatically reload once you save the `.env` file.
   - Navigate to `/login` to create your first account.

## Features

- **Inclusive Audits**: Run scans across multiple disability personas.
- **DISA Scoring**: Automatically calculate compliance scores.
- **AI Insights**: Generate executive summaries and impact explanations using Genkit.
