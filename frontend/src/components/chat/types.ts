export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
  isGenerating?: boolean;
  showProposal?: boolean;
  authPrompt?: boolean;
  cardContent?: string | null;
  // Internal streaming buffer to parse special markers like <card> ... </card>
  rawText?: string;
}
