
/**
 * Firebase configuration object.
 * Values are pulled from environment variables.
 * In production, ensure these are set in your deployment environment.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Simple validation to help debug configuration issues
if (typeof window !== 'undefined' && !firebaseConfig.apiKey) {
  console.warn(
    'Firebase API Key is missing. Authentication will not work until you add your configuration to the .env file.'
  );
}
