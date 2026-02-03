
import React from 'react';
import { Interface, InputType, Option, Phase } from '../types';

interface InterfaceDisplayProps {
  data: Interface;
  onOptionSelect: (optionId: number, optionLabel: string) => void;
  onContinue: () => void;
  isLoading: boolean;
  error: string | null;
  commandText: string;
  onCommandTextChange: (text: string) => void;
  onCommandSubmit: () => void;
  currentPhase: Phase;
  onExit: () => void; // New prop for the exit button
}

export const InterfaceDisplay: React.FC<InterfaceDisplayProps> = ({
  data,
  onOptionSelect,
  onContinue,
  isLoading,
  error,
  commandText,
  onCommandTextChange,
  onCommandSubmit,
  currentPhase,
  onExit,
}) => {
  if (error) {
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg" role="alert" aria-live="assertive">
        <h3 className="font-bold text-lg">Error</h3>
        <p>{error}</p>
        <button
          onClick={onContinue}
          className="mt-4 px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200"
          aria-label="Try Again"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8" aria-live="polite" aria-label="Loading content">
        <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500" role="status"></div>
        <p className="ml-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  const { title, content, instructions, input_type, options, progress } = data;

  const getProgressColor = (p: number) => {
    if (p < 30) return 'bg-red-500';
    if (p < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const showCommandInput = currentPhase !== 'completed';
  const showExitButton = currentPhase !== 'completed';

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && commandText.trim() !== '') {
      onCommandSubmit();
    }
  };

  return (
    <div className="flex flex-col space-y-4" aria-live="polite">
      <h2 className="text-3xl font-extrabold text-blue-800 mb-2">{title}</h2>
      <div className="w-full bg-gray-200 rounded-full h-3" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`h-3 rounded-full transition-all duration-500 ${getProgressColor(progress)}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <p className="text-sm text-gray-500 text-right" aria-label={`Progress: ${progress}% Complete`}>{progress}% Complete</p>

      <p className="text-gray-700 leading-relaxed text-base">{content}</p>

      {instructions && (
        <p className="text-indigo-600 font-semibold italic border-t pt-4 border-indigo-200">
          {instructions}
        </p>
      )}

      {input_type === 'multiple_choice' && options && (
        <div className="flex flex-col space-y-3 mt-4" role="group" aria-label="Multiple choice options">
          {options.map((option: Option) => (
            <button
              key={option.id}
              onClick={() => onOptionSelect(option.id, option.label)}
              className="w-full px-5 py-3 text-left bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
              aria-label={`Select option: ${option.label}`}
              disabled={isLoading}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {input_type === 'none' && (currentPhase !== 'completed') && (
        <div className="mt-6 text-center">
          <button
            onClick={onContinue}
            className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-md hover:bg-indigo-700 transition-colors duration-200 shadow-md"
            aria-label="Continue lesson"
            disabled={isLoading}
          >
            Continue
          </button>
        </div>
      )}

      {showCommandInput && (
        <div className="mt-8 pt-4 border-t border-gray-200 flex flex-col sm:flex-row gap-3 items-center" role="form" aria-label="Command input">
          <input
            type="text"
            className="flex-grow p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Type a command (e.g., review, clarify, pause, exit)"
            value={commandText}
            onChange={(e) => onCommandTextChange(e.target.value)}
            onKeyPress={handleKeyPress}
            aria-label="Enter command"
            disabled={isLoading}
          />
          <button
            onClick={onCommandSubmit}
            className="w-full sm:w-auto px-6 py-3 bg-gray-700 text-white font-bold rounded-md hover:bg-gray-800 transition-colors duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || commandText.trim() === ''}
            aria-label="Send command"
          >
            Send Command
          </button>
        </div>
      )}

      {showExitButton && (
        <div className="mt-4 text-center">
          <button
            onClick={onExit}
            className="px-6 py-2 bg-red-500 text-white font-bold rounded-md hover:bg-red-600 transition-colors duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Exit lesson"
            disabled={isLoading}
          >
            Exit Lesson
          </button>
        </div>
      )}
    </div>
  );
};
