
import { Timestamp } from "firebase/firestore";

export type AISystemType = "Chatbot" | "Voice Assistant";
export type SubscriptionStatus = "free" | "pro" | "enterprise";
export type WCAGLevel = "A" | "AA" | "AAA";
export type ImpactLevel = "critical" | "serious" | "moderate" | "minor";

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
  impact: ImpactLevel;
  description: string;
  wcagLevel: WCAGLevel;
  nodes?: string[];
}

export interface TestRunResult {
  persona: string;
  success: boolean;
  accessibilityIssues: AccessibilityIssue[];
}

export interface TestRun extends TestRunResult {
  id: string;
  assessmentId: string;
  createdAt: Timestamp;
}

export interface Assessment {
  id: string;
  systemId: string;
  userId: string;
  version: string;
  overallScore: number;
  domainScores?: {
    accessibility: number;
    biasRisk: number;
    transparency: number;
    equityData: number;
  };
  details?: {
    biasExplanation?: string;
    totalViolations?: number;
    crawledAt?: Timestamp;
    executiveSummary?: string;
  };
  createdAt: Timestamp;
}

export interface UserProfile {
  id: string;
  email: string;
  subscriptionStatus: SubscriptionStatus;
  lemonSqueezyCustomerId?: string;
  settings: {
    emailResults: boolean;
    scheduledMonitor?: {
      enabled: boolean;
      frequency: "daily" | "weekly" | "monthly";
    };
  };
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
