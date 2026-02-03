
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Phase, PhaseResponse } from './types';
import { InterfaceDisplay } from './components/InterfaceDisplay';
import { callGemini } from './services/geminiService';
import { TOTAL_QUESTIONS } from './constants';

function App() {
  const [phaseResponse, setPhaseResponse] = useState<PhaseResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [learnerCommandInput, setLearnerCommandInput] = useState<string>('');

  // State to manage the tutor's persistent info
  const tutorStateRef = useRef({
    question_index: 0,
    score: 0,
    currentPhase: 'intro' as Phase,
    correctAnswerId: null as number | null, // Stores the correct answer ID for the current 'ask' question
    selectedOptionLabel: null as string | null, // Stores the label of the option chosen by the user for evaluation feedback
  });

  const fetchGeminiResponse = useCallback(async (
    isPreviousAnswerCorrect: boolean | null = null,
    submitLearnerInput: string | null = null, // New: Pass learner's free-form text input for commands
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const { currentPhase, question_index, score, selectedOptionLabel } = tutorStateRef.current;

      const response = await callGemini(
        currentPhase,
        { question_index, score },
        isPreviousAnswerCorrect,
        selectedOptionLabel, // Pass this for 'evaluate' context or 'review' command
        submitLearnerInput, // Pass the command/text input
      );

      // Update local tutor state based on Gemini's response for the next interaction
      tutorStateRef.current = {
        ...tutorStateRef.current,
        currentPhase: response.phase,
        question_index: response.state.question_index,
        score: response.state.score,
        correctAnswerId: response.correct_answer_id !== undefined ? response.correct_answer_id : null,
        selectedOptionLabel: null, // Reset after processing evaluation or new phase
      };

      setPhaseResponse(response);
    } catch (err) {
      console.error("Failed to fetch Gemini response:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array means this function is created once

  // Initial fetch when component mounts
  useEffect(() => {
    fetchGeminiResponse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  const handleOptionSelect = useCallback((selectedOptionId: number, selectedOptionLabel: string) => {
    if (tutorStateRef.current.currentPhase !== 'ask' || isLoading) return;

    let isCorrect = false;
    const { correctAnswerId, question_index, score } = tutorStateRef.current;

    if (correctAnswerId !== null && selectedOptionId === correctAnswerId) {
      isCorrect = true;
      tutorStateRef.current.score = score + 1; // Update score locally
    }

    // Advance question index for next 'ask' phase or 'report'
    // This value is passed to Gemini, which then updates its internal state.
    tutorStateRef.current.question_index = question_index + 1;
    tutorStateRef.current.selectedOptionLabel = selectedOptionLabel; // Store for feedback in 'evaluate'

    // Transition to evaluate phase
    tutorStateRef.current.currentPhase = 'evaluate';
    fetchGeminiResponse(isCorrect);
  }, [isLoading, fetchGeminiResponse]);

  const handleContinue = useCallback(() => {
    if (isLoading) return;

    // If currently in 'paused' phase, 'Continue' acts as a 'resume' command
    if (tutorStateRef.current.currentPhase === 'paused') {
      fetchGeminiResponse(null, "resume");
    } else {
      // Normal phase progression
      if (tutorStateRef.current.currentPhase === 'evaluate') {
        // Gemini's prompt handles whether to go to 'ask' or 'report' after 'evaluate'
        // based on question_index and TOTAL_QUESTIONS
        // We set the target phase here, and Gemini confirms/updates its state accordingly.
        if (tutorStateRef.current.question_index < TOTAL_QUESTIONS) {
          tutorStateRef.current.currentPhase = 'ask';
        } else {
          tutorStateRef.current.currentPhase = 'report';
        }
      } else if (tutorStateRef.current.currentPhase === 'intro') {
        tutorStateRef.current.currentPhase = 'teach';
      } else if (tutorStateRef.current.currentPhase === 'teach') {
        tutorStateRef.current.currentPhase = 'ask';
      } else if (tutorStateRef.current.currentPhase === 'report') {
        tutorStateRef.current.currentPhase = 'completed';
      }
      fetchGeminiResponse(); // Call without command input
    }
  }, [isLoading, fetchGeminiResponse]);

  const handleCommandSubmit = useCallback(() => {
    if (isLoading || learnerCommandInput.trim() === '') return;

    const command = learnerCommandInput.trim().toLowerCase();
    // Special handling for "continue" command when in "paused" phase, map it to "resume"
    const submitCommand = (command === "continue" && tutorStateRef.current.currentPhase === 'paused') ? "resume" : command;

    fetchGeminiResponse(null, submitCommand);
    setLearnerCommandInput(''); // Clear the input field after sending
  }, [isLoading, learnerCommandInput, fetchGeminiResponse]);

  // New: Handle Exit command
  const handleExit = useCallback(() => {
    if (isLoading) return;
    fetchGeminiResponse(null, "exit");
    setLearnerCommandInput(''); // Clear input field if user was typing
  }, [isLoading, fetchGeminiResponse]);

  // Render the InterfaceDisplay with current data
  if (!phaseResponse) {
    return (
      <InterfaceDisplay
        data={{
          title: "Loading Tutor...",
          content: "Please wait while the AI tutor prepares.",
          instructions: "",
          input_type: "none",
          progress: 0,
        }}
        onOptionSelect={() => {}}
        onContinue={() => {}}
        isLoading={isLoading}
        error={error}
        commandText={learnerCommandInput}
        onCommandTextChange={setLearnerCommandInput}
        onCommandSubmit={() => {}} // Disabled until phaseResponse is loaded
        currentPhase={'intro'} // Default phase for initial loading
        onExit={() => {}} // Disabled until phaseResponse is loaded
      />
    );
  }

  return (
    <InterfaceDisplay
      data={phaseResponse.interface}
      onOptionSelect={handleOptionSelect}
      onContinue={handleContinue}
      isLoading={isLoading}
      error={error}
      commandText={learnerCommandInput}
      onCommandTextChange={setLearnerCommandInput}
      onCommandSubmit={handleCommandSubmit}
      currentPhase={phaseResponse.phase} // Pass the actual phase
      onExit={handleExit} // Pass the new handleExit function
    />
  );
}

export default App;
