
export type Phase = "intro" | "teach" | "ask" | "evaluate" | "report" | "completed" | "paused";
export type InputType = "none" | "multiple_choice";

export interface Option {
  id: number;
  label: string;
}

export interface State {
  question_index: number;
  score: number;
}

export interface Interface {
  title: string;
  content: string;
  instructions: string;
  input_type: InputType;
  options?: Option[];
  progress: number;
}

export interface PhaseResponse {
  phase: Phase;
  state: State;
  interface: Interface;
  // This field is used internally by App.tsx to evaluate the user's answer
  // when the phase is 'ask'. It is not part of the 'interface' displayed to the learner.
  correct_answer_id?: number;
}
