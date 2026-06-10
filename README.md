
# AuditAccess - Inclusive AI Audit Pipeline

This is a Next.js application built to audit AI systems for accessibility and fairness.

## Getting Started

1. **Firebase Setup**: 
   - Create a project in the [Firebase Console](https://console.firebase.google.com/).
   - Enable **Authentication** (Email/Password and Google).
   - Create a **Firestore** database.
   - Go to **Project Settings**, add a Web App, and copy the `firebaseConfig` values.

2. **Environment Variables**:
   - Open the `.env` file in this project.
   - Replace the `YOUR_...` placeholders with the values you copied from the Firebase Console.

3. **Run the App**:
   - The app will automatically reload once you save the `.env` file.
   - Navigate to `/login` to create your first account.

## Features

- **Inclusive Audits**: Run scans across multiple disability personas.
- **DISA Scoring**: Automatically calculate compliance scores.
- **AI Insights**: Generate executive summaries and impact explanations using Genkit.
