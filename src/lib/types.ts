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
  nodes?: any[];
}

export interface TestRun {
  id: string;
  assessmentId: string;
  persona: string;
  success: boolean;
  accessibilityIssues: AccessibilityIssue[];
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