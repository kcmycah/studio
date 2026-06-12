
/**
 * Firebase configuration object.
 * Values are pulled from environment variables for production readiness.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/**
 * Validates the Firebase configuration.
 * Returns true if all required keys are present and don't look like placeholders.
 */
export function isFirebaseConfigValid(): boolean {
  const { apiKey, projectId, appId } = firebaseConfig;
  
  if (!apiKey || !projectId || !appId) return false;
  
  const isPlaceholder = (val: string | undefined) => 
    !val || 
    val.includes('YOUR_') || 
    val.includes('REPLACE_') || 
    val.length < 5;

  if (isPlaceholder(apiKey) || isPlaceholder(projectId) || isPlaceholder(appId)) {
    return false;
  }

  return true;
}
