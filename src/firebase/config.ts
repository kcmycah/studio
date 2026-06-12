/**
 * Firebase configuration object.
 * Values are pulled from environment variables.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Validates the Firebase configuration.
 * Returns true if all required keys are present and don't look like placeholders.
 */
export function isFirebaseConfigValid(): boolean {
  const { apiKey, projectId, appId } = firebaseConfig;
  
  if (!apiKey || !projectId || !appId) return false;
  
  // Basic check for common placeholder strings
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

// Diagnostics for development
if (typeof window !== 'undefined') {
  const missingKeys = Object.entries(firebaseConfig)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingKeys.length > 0 && process.env.NODE_ENV === 'development') {
    console.warn(
      `Firebase configuration is missing keys: ${missingKeys.join(', ')}. ` +
      `Ensure these are added to your .env file.`
    );
  }
}
