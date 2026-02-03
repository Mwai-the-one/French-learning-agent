import { GoogleGenAI } from "@google/genai";
import { TutorResponse, QuestionData, Choice } from '../types';

// Hardcoded questions for the tutorial
const QUESTIONS: QuestionData[] = [
  {
    id: 0,
    question: "What does 'Bonjour' mean in French?",
    choices: [
      { id: 0, label: "Good afternoon" },
      { id: 1, label: "Hello / Good day" },
      { id: 2, label: "Good evening" },
      { id: 3, label: "Goodbye" },
    ],
    correctAnswerId: 1,
    correctAnswerLabel: "Hello / Good day",
  },
  {
    id: 1,
    question: "How do you say 'Thank you' in French?",
    choices: [
      { id: 0, label: "Au revoir" },
      { id: 1, label: "Oui" },
      { id: 2, label: "Merci" },
      { id: 3, label: "Non" },
    ],
    correctAnswerId: 2,
    correctAnswerLabel: "Merci",
  },
  {
    id: 2,
    question: "What is 'Au revoir' used for?",
    choices: [
      { id: 0, label: "Greeting someone" },
      { id: 1, label: "Asking for help" },
      { id: 2, label: "Saying goodbye" },
      { id: 3, label: "Expressing gratitude" },
    ],
    correctAnswerId: 2,
    correctAnswerLabel: "Saying goodbye",
  },
  {
    id: 3,
    question: "Which phrase means 'Please'?",
    choices: [
      { id: 0, label: "Excusez-moi" },
      { id: 1, label: "S'il vous plaît" },
      { id: 2, label: "De rien" },
      { id: 3, label: "Je t'aime" },
    ],
    correctAnswerId: 1,
    correctAnswerLabel: "S'il vous plaît",
  },
  {
    id: 4,
    question: "If you want to apologize or get attention, you say:",
    choices: [
      { id: 0, label: "Ça va?" },
      { id: 1, label: "Bonne nuit" },
      { id: 2, label: "Excusez-moi" },
      { id: 3, label: "Enchanté" },
    ],
    correctAnswerId: 2,
    correctAnswerLabel: "Excusez-moi",
  },
];

const getProgress = (q: number, phase: TutorResponse['phase']): number => {
  if (phase === 'intro') return 0;
  if (phase === 'teach') return 10;
  if (phase === 'report' || q >= QUESTIONS.length) return 100;
  return 10 + (q * 18);
};

export const geminiService = {
  sendMessage: async (
    currentPhase: TutorResponse['phase'],
    currentQ: number,
    currentScore: number,
    userInput?: number, // selected choice ID
  ): Promise<TutorResponse> => {
    // IMPORTANT: Create a new GoogleGenAI instance for each API call to ensure it uses the most up-to-date API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = "gemini-3-flash-preview";

    let nextPhase: TutorResponse['phase'] = currentPhase;
    let nextQ: number = currentQ;
    let nextScore: number = currentScore;
    let uiScreen: TutorResponse['ui']['screen'] = 'intro';
    let uiText: string = '';
    let uiChoices: Choice[] = [];
    let uiInput: TutorResponse['ui']['input'] = 'none';

    try {
      if (currentPhase === 'intro') {
        // Transition from intro to teach
        nextPhase = 'teach';
        uiScreen = 'lesson';
        uiInput = 'none';
        uiText = await (await ai.models.generateContent({
          model: model,
          contents: {
            parts: [{ text: "As a French tutor, briefly introduce 3-5 beginner French vocabulary words (e.g., Bonjour, Au revoir, Merci, S'il vous plaît, Excusez-moi) with short cultural context. Keep under 120 words. Focus on greetings and basic phrases. Ensure the response is a single paragraph. For example: 'Bonjour (Hello/Good day) is a fundamental greeting used all day. Au revoir (Goodbye) is the polite farewell. Merci (Thank you) shows gratitude. S'il vous plaît (Please) is for politeness, and Excusez-moi (Excuse me) is for apologies or getting attention.'" }]
          },
          config: {
            temperature: 0.7,
            maxOutputTokens: 200, // Limit to ensure conciseness
            thinkingConfig: { thinkingBudget: 0 } // Prioritize speed for short text
          }
        })).text;
      } else if (currentPhase === 'teach') {
        // Transition from teach to ask
        nextPhase = 'ask';
        nextQ = 0; // Start with the first question
        uiScreen = 'question';
        uiInput = 'multiple_choice';
        const questionData = QUESTIONS[nextQ];
        uiText = questionData.question;
        uiChoices = questionData.choices;
      } else if (currentPhase === 'ask') {
        // Evaluate the answer
        nextPhase = 'evaluate';
        uiScreen = 'feedback';
        uiInput = 'none';

        const currentQuestion = QUESTIONS[currentQ];
        const isCorrect = (userInput === currentQuestion.correctAnswerId);

        if (isCorrect) {
          nextScore += 1;
          uiText = await (await ai.models.generateContent({
            model: model,
            contents: {
              parts: [{ text: `The learner answered correctly for the question: '${currentQuestion.question}'. Explain why '${currentQuestion.choices.find(c => c.id === userInput)?.label}' is correct in 1-2 sentences, encouraging the learner. Keep it concise.` }]
            },
            config: {
              temperature: 0.7,
              maxOutputTokens: 100,
              thinkingConfig: { thinkingBudget: 0 }
            }
          })).text;
        } else {
          uiText = await (await ai.models.generateContent({
            model: model,
            contents: {
              parts: [{ text: `The learner answered incorrectly for the question: '${currentQuestion.question}'. The correct answer was '${currentQuestion.correctAnswerLabel}'. Explain why '${currentQuestion.correctAnswerLabel}' is correct in 1-2 sentences. Gently encourage the learner. Keep it concise.` }]
            },
            config: {
              temperature: 0.7,
              maxOutputTokens: 100,
              thinkingConfig: { thinkingBudget: 0 }
            }
          })).text;
        }

      } else if (currentPhase === 'evaluate') {
        // After feedback, move to next question or report
        nextQ = currentQ + 1;
        if (nextQ < QUESTIONS.length) {
          nextPhase = 'ask';
          uiScreen = 'question';
          uiInput = 'multiple_choice';
          const questionData = QUESTIONS[nextQ];
          uiText = questionData.question;
          uiChoices = questionData.choices;
        } else {
          nextPhase = 'report';
          uiScreen = 'final';
          uiInput = 'none';
          uiText = await (await ai.models.generateContent({
            model: model,
            contents: {
              parts: [{ text: `The learner completed the French tutorial with a score of ${currentScore} out of ${QUESTIONS.length} questions. Provide a short, encouraging performance summary (1-2 sentences). For example: 'Excellent effort! You demonstrated a good understanding of beginner French. Keep practicing!'` }]
            },
            config: {
              temperature: 0.7,
              maxOutputTokens: 100,
              thinkingConfig: { thinkingBudget: 0 }
            }
          })).text;
        }
      } else if (currentPhase === 'report') {
        // Tutorial completed, no further action from tutor
        nextPhase = 'completed';
        uiScreen = 'final'; // Stays on final screen
        uiInput = 'none';
        uiText = await (await ai.models.generateContent({
          model: model,
          contents: {
            parts: [{ text: `The French tutorial is now complete. You scored ${currentScore} out of ${QUESTIONS.length}. Feel free to restart anytime to review the basics or continue your learning journey! À bientôt!` }]
          },
          config: {
            temperature: 0.7,
            maxOutputTokens: 100,
            thinkingConfig: { thinkingBudget: 0 }
          }
        })).text;
      }

      const progress = getProgress(nextQ, nextPhase);

      return {
        phase: nextPhase,
        state: { q: nextQ, score: nextScore },
        data: {},
        ui: {
          screen: uiScreen,
          text: uiText,
          choices: uiChoices,
          input: uiInput,
          progress: progress,
        }
      };
    } catch (e) {
      console.error("Gemini API error:", e);
      // If API key is invalid or not set, prompt user to select API key
      if (typeof window.aistudio?.hasSelectedApiKey === 'function' && typeof window.aistudio?.openSelectKey === 'function') {
        if (e instanceof Error && e.message.includes("Requested entity was not found.")) {
          // Specific error for missing API key/invalid project
          alert("Your API key might be invalid or from a project without access. Please select a valid API key from a paid GCP project.");
          await window.aistudio.openSelectKey();
          // Assume success and retry (or allow user to click again)
        } else {
          const hasKey = await window.aistudio.hasSelectedApiKey();
          if (!hasKey) {
            alert("Please select your API key to use the French Tutor.");
            await window.aistudio.openSelectKey();
          }
        }
      } else {
        alert("There was an error communicating with the tutor. Please try again. Ensure your API_KEY is set in the environment.");
      }

      // Return a fallback error state
      return {
        phase: currentPhase,
        state: { q: currentQ, score: currentScore },
        data: {},
        ui: {
          screen: 'intro',
          text: `Error: Failed to load tutor content. Please check your network and API key.`,
          choices: [],
          input: 'none',
          progress: getProgress(currentQ, currentPhase),
        }
      };
    }
  },
};
