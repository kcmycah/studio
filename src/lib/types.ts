import { Timestamp } from "firebase/firestore";

export type AISystemType = "Chatbot" | "Voice Assistant";

export interface AISystem {
  id: string;
  userId: string;
  name: string;
  url: string;
  type: AISystemType;
  createdAt: Timestamp;
}

export interface AccessibilityIssue {
  id: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  description: string;
  nodes?: string[];
}

/**
 * The raw result returned from the simulation API.
 */
export interface TestRunResult {
  persona: string;
  success: boolean;
  accessibilityIssues: AccessibilityIssue[];
}

/**
 * The full record of a test run stored in Firestore.
 */
export interface TestRun extends TestRunResult {
  id: string;
  assessmentId: string;
  createdAt: Timestamp;
}

export interface Assessment {
  id: string;
  systemId: string;
  userId: string;
  overallScore: number;
  createdAt: Timestamp;
}

export const PERSONAS = [
  "Blind",
  "Low vision",
  "Deaf",
  "Dyslexic",
  "Cognitive disability",
  "Motor impaired",
  "Speech impaired"
] as const;

export type PersonaType = (typeof PERSONAS)[number];
