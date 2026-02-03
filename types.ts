export interface Choice {
  id: number;
  label: string;
}

export interface TutorState {
  q: number;
  score: number;
}

export interface TutorUI {
  screen: 'intro' | 'lesson' | 'question' | 'feedback' | 'final';
  text: string;
  choices: Choice[];
  input: 'none' | 'multiple_choice';
  progress: number;
}

export interface TutorResponse {
  phase: 'intro' | 'teach' | 'ask' | 'evaluate' | 'report' | 'completed';
  state: TutorState;
  data: Record<string, unknown>; // Keeping flexible but expecting empty based on prompt rules
  ui: TutorUI;
}

export interface QuestionData {
  id: number;
  question: string;
  choices: Choice[];
  correctAnswerId: number;
  correctAnswerLabel: string;
}
