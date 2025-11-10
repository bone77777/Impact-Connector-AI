export enum AppState {
  INITIAL,
  CHATTING,
  PROCESSING,
  RESULTS,
  ERROR,
}

export enum MessageAuthor {
  USER = 'user',
  AURA = 'aura',
}

export interface ChatMessage {
  author: MessageAuthor;
  text: string;
}

export interface ChatStep {
  question: string;
  options: string[];
  isFinal: boolean;
}

export interface Opportunity {
  title: string;
  description: string;
  requiredSkills: string[];
  impactStatement: string;
  actionType?: ActionType;
  actionParams?: {
    query: string;
  };
}

export type ActionType = 
  | 'find_organizations' 
  | 'draft_email'
  | 'learn_more'
  | 'find_events'
  | 'draft_plan';

export interface ActionStep {
  title: string;
  description: string;
  actionType?: ActionType;
  actionParams?: {
    query: string;
  };
}

export interface ContributionPlan {
  planTitle: string;
  summary: string;
  suggestedOpportunities: Opportunity[];
  firstSteps: ActionStep[];
  moodboardPrompt: string;
  images: string[];
}