import React, { useState, useEffect, useCallback, useRef } from 'react';
import { TutorResponse, Choice, TutorState } from './types';
import { geminiService } from './services/geminiService';
import Button from './components/Button';

// Initial state for the tutor
const INITIAL_TUTOR_STATE: TutorResponse = {
  phase: 'intro',
  state: { q: 0, score: 0 },
  data: {},
  ui: {
    screen: 'intro',
    text: "Welcome to Introduction to French Language and French Culture! Let's begin our journey.",
    choices: [],
    input: 'none',
    progress: 0,
  },
};

const App: React.FC = () => {
  const [tutorResponse, setTutorResponse] = useState<TutorResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedChoiceId, setSelectedChoiceId] = useState<number | null>(null);

  // Ref to hold the current phase and state to avoid stale closures in sendMessage
  const currentPhaseRef = useRef<TutorResponse['phase']>('intro');
  const currentQRef = useRef<number>(0);
  const currentScoreRef = useRef<number>(0);

  const processTutorTurn = useCallback(async (
    phase: TutorResponse['phase'],
    q: number,
    score: number,
    userInput?: number,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const response = await geminiService.sendMessage(phase, q, score, userInput);
      setTutorResponse(response);

      // Update refs with the new state from the response
      currentPhaseRef.current = response.phase;
      currentQRef.current = response.state.q;
      currentScoreRef.current = response.state.score;

      setSelectedChoiceId(null); // Reset selected choice for next question
    } catch (err) {
      console.error("Failed to fetch tutor response:", err);
      setError("Failed to load tutor content. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array means this function is created once

  useEffect(() => {
    // Initial load: start the intro phase
    if (!tutorResponse) {
      processTutorTurn(
        INITIAL_TUTOR_STATE.phase,
        INITIAL_TUTOR_STATE.state.q,
        INITIAL_TUTOR_STATE.state.score
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const handleAction = async (actionInput?: number) => {
    if (!tutorResponse) return;

    // Use refs for current state to ensure latest values are used in the callback
    const currentPhase = currentPhaseRef.current;
    const currentQ = currentQRef.current;
    const currentScore = currentScoreRef.current;

    let nextPhase: TutorResponse['phase'] = currentPhase;
    let nextQ: number = currentQ;
    let nextScore: number = currentScore;
    let userInput: number | undefined = actionInput;

    if (currentPhase === 'intro') {
      nextPhase = 'teach';
    } else if (currentPhase === 'teach') {
      nextPhase = 'ask';
      nextQ = 0; // Reset q for the first question
    } else if (currentPhase === 'ask') {
      if (userInput === undefined) {
        // This shouldn't happen if the submit button is properly guarded
        setError("Please select an answer.");
        return;
      }
      nextPhase = 'evaluate';
    } else if (currentPhase === 'evaluate') {
      nextQ = currentQ + 1; // Increment question index for the next 'ask' or 'report'
      if (nextQ < 5) { // Assuming 5 questions (0-4)
        nextPhase = 'ask';
      } else {
        nextPhase = 'report';
      }
    } else if (currentPhase === 'report') {
      nextPhase = 'completed'; // After report, the tutorial is completed
    } else if (currentPhase === 'completed') {
        // Allow restarting
        setTutorResponse(null); // Reset to re-trigger initial load
        currentPhaseRef.current = 'intro';
        currentQRef.current = 0;
        currentScoreRef.current = 0;
        processTutorTurn(
            INITIAL_TUTOR_STATE.phase,
            INITIAL_TUTOR_STATE.state.q,
            INITIAL_TUTOR_STATE.state.score
        );
        return; // Don't call processTutorTurn again after reset
    }

    await processTutorTurn(nextPhase, nextQ, nextScore, userInput);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center p-6 space-y-4 animate-pulse">
          <div className="h-4 w-3/4 bg-blue-200 rounded"></div>
          <div className="h-4 w-1/2 bg-blue-200 rounded"></div>
          <div className="h-4 w-2/3 bg-blue-200 rounded"></div>
          <p className="text-lg text-blue-600">Loading your French lesson...</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="p-6 text-red-600 text-center font-semibold">
          <p>{error}</p>
          <Button onClick={() => handleAction()} className="mt-4">Retry</Button>
        </div>
      );
    }

    if (!tutorResponse) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          Initializing tutor...
        </div>
      );
    }

    const { ui, state, phase } = tutorResponse;

    return (
      <div className="flex flex-col flex-grow p-6 sm:p-8">
        <div className="flex-grow">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4">
            {ui.screen === 'intro' && "Bienvenue !"}
            {ui.screen === 'lesson' && "Your First French Words"}
            {ui.screen === 'question' && `Question ${state.q + 1} of 5`}
            {ui.screen === 'feedback' && "Feedback"}
            {ui.screen === 'final' && "Tutorial Complete!"}
          </h2>
          <p className="text-gray-700 text-lg mb-6 leading-relaxed whitespace-pre-wrap">{ui.text}</p>

          {ui.input === 'multiple_choice' && ui.choices.length > 0 && (
            <div className="space-y-3">
              {ui.choices.map((choice) => (
                <button
                  key={choice.id}
                  className={`block w-full text-left p-4 border rounded-lg transition-all duration-200
                              ${selectedChoiceId === choice.id
                                ? 'bg-blue-100 border-blue-500 text-blue-800 shadow-md'
                                : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-gray-700'
                              }`}
                  onClick={() => setSelectedChoiceId(choice.id)}
                  disabled={loading}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Persistent CTA at the bottom */}
        <div className="sticky bottom-0 bg-white pt-6 border-t border-gray-100 -mx-6 -mb-6 sm:-mx-8 sm:-mb-8 px-6 sm:px-8 flex flex-col items-center">
          <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6">
            <div
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${ui.progress}%` }}
            ></div>
          </div>

          {/* Fix: `feedback` is a UI screen type, not a phase. The corresponding phase is `evaluate`. */}
          {(phase === 'intro' || phase === 'teach' || phase === 'evaluate') && (
            <Button
              onClick={() => handleAction()}
              fullWidth
              disabled={loading}
            >
              {phase === 'intro' ? 'Start Lesson' : phase === 'teach' ? 'Continue to Quiz' : 'Next'}
            </Button>
          )}

          {phase === 'ask' && (
            <Button
              onClick={() => handleAction(selectedChoiceId!)} // Non-null assertion as button is disabled if null
              fullWidth
              disabled={loading || selectedChoiceId === null}
            >
              Submit Answer
            </Button>
          )}

          {phase === 'report' && (
            <Button
              onClick={() => handleAction()}
              fullWidth
              disabled={loading}
            >
              Restart Tutorial
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="relative w-full max-w-2xl bg-white shadow-xl rounded-lg overflow-hidden flex flex-col h-[90vh] sm:h-[80vh]">
      {renderContent()}
    </div>
  );
};

export default App;