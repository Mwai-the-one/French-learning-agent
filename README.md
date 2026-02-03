# Multi-Agent Beginner French Tutor Using Gemini 2.5 Flash

## Abstract
This document details the design and implementation of a lightweight, stateful, multi-agent educational system for beginner French language and culture. Leveraging the Gemini 2.5 Flash large language model, the system provides interactive micro-lessons and quizzes, optimized for low token usage and reduced latency. Its architecture is based on a simulated multi-agent paradigm and a well-defined phase-based state machine, ensuring structured, turn-based interaction via a minimal persistent state and a JSON-formatted interface.

## Introduction
The integration of Artificial Intelligence (AI) into educational technology holds significant promise for personalized and adaptive learning experiences. Traditional static learning platforms often lack the dynamic adaptability required to cater to diverse learner needs. This project addresses this gap by developing an AI-driven tutor that not only delivers content but also simulates intelligent pedagogical agents to guide learners. The rationale for a multi-agent architecture stems from the need to modularize distinct pedagogical functions—such as content planning, explanation, assessment, feedback, and motivational support—into conceptually separate, albeit simulated, entities. This approach enhances system clarity, maintainability, and the potential for future specialized agent development.

## System Architecture
The system employs a simulated multi-agent architecture, where distinct pedagogical roles are conceptually assigned to internal agents:
*   **Planner Agent**: Determines the sequence of educational activities (e.g., transition from introduction to lesson, lesson to quiz).
*   **Explainer Agent**: Generates concise lesson content and explanations, ensuring clarity and cultural context.
*   **Quiz Agent**: Formulates multiple-choice questions based on the lesson material.
*   **Feedback Agent**: Provides evaluative feedback on learner responses, offering correct explanations and encouragement.
*   **Progress Agent**: Manages and tracks the learner's advancement through the curriculum.
*   **Motivation Agent**: Infuses encouraging tones and summaries to sustain learner engagement.

This architecture interacts with a minimal persistent state, storing only the current question index (`state.q`) and the cumulative score (`state.score`). This design choice is critical for reducing computational overhead, minimizing memory footprint, and ensuring that the large language model (LLM) is not burdened with extensive context management across turns. The system generates content dynamically for the current phase, rather than maintaining comprehensive internal representations of lessons or question banks.

## State Machine Design
The tutor's interaction flow is governed by a deterministic, phase-based state machine, orchestrating a turn-based interaction cycle:

1.  **`intro`**: Initiates the tutorial with a brief welcome.
    *   `ui.screen` = "intro"
    *   `ui.input` = "none"
    *   `ui.progress` = 0
    *   Transition: Automatically moves to `teach`.

2.  **`teach`**: Introduces 3-5 beginner vocabulary words with short cultural context, keeping the explanation under 120 words.
    *   `ui.screen` = "lesson"
    *   `ui.input` = "none"
    *   `ui.progress` = 10
    *   Transition: Automatically moves to `ask`.

3.  **`ask`**: Presents one multiple-choice question.
    *   `ui.screen` = "question"
    *   `ui.input` = "multiple_choice"
    *   `ui.progress` = 10 + (`state.q` * 18)
    *   Transition: Awaits learner input, then moves to `evaluate`.

4.  **`evaluate`**: Assesses the learner's answer. If correct, increments `state.score`. Provides a very short explanation (1-2 sentences).
    *   `ui.screen` = "feedback"
    *   `ui.input` = "none"
    *   Transition: If `state.q < 4`, increments `state.q` and returns to `ask`. Otherwise, transitions to `report`.

5.  **`report`**: Delivers a concise, encouraging summary of the learner's performance.
    *   `ui.screen` = "final"
    *   `ui.progress` = 100
    *   Transition: Automatically moves to `completed`.

6.  **`completed`**: The tutorial concludes, allowing for restart.

This turn-based interaction, coupled with minimal state transitions, ensures predictable system behavior and efficient resource utilization.

## Data Structure and Interface Specification
The system communicates with the learner through a structured JSON interface, ensuring unambiguous parsing and rendering by the client-side UI.

**JSON Response Format Example:**
```json
{
  "phase": "ask",
  "state": {
    "q": 1,
    "score": 0
  },
  "data": {},
  "ui": {
    "screen": "question",
    "text": "How do you say 'Thank you' in French?",
    "choices": [
      { "id": 0, "label": "Au revoir" },
      { "id": 1, "label": "Oui" },
      { "id": 2, "label": "Merci" },
      { "id": 3, "label": "Non" }
    ],
    "input": "multiple_choice",
    "progress": 28
  }
}
```

**Top-Level Fields Explanation:**
*   `phase` (string): Indicates the current operational stage of the tutor (e.g., "intro", "teach", "ask").
*   `state` (object): Contains minimal persistent state variables.
    *   `q` (integer): The current question index (0-indexed).
    *   `score` (integer): The cumulative count of correct answers.
*   `data` (object): Reserved for additional ephemeral data. In this implementation, it remains empty to adhere to minimal state rules.
*   `ui` (object): Dictates the client-side user interface presentation and interaction.
    *   `screen` (string): Specifies the current screen type (e.g., "intro", "lesson", "question", "feedback", "final").
    *   `text` (string): The primary textual content to be displayed to the user.
    *   `choices` (array of objects): For `multiple_choice` input, provides options for the user to select. Each object contains `id` (integer) and `label` (string).
    *   `input` (string): Defines the expected input type from the user (e.g., "none", "multiple_choice").
    *   `progress` (integer): A percentage indicating the learner's progress through the tutorial.

## Performance Optimization Strategy
Performance optimization focuses on minimizing LLM interaction latency and token consumption, critical for real-time educational applications.
*   **Token Reduction**:
    *   **Concise Prompts**: All prompts to the Gemini model are meticulously crafted to be brief and direct, requesting specific outputs (e.g., "1-2 sentences", "under 120 words").
    *   **Minimal Context Passing**: The LLM is provided only with the necessary contextual information for the current turn, avoiding the re-transmission of full lesson content or extensive conversation history.
    *   **`maxOutputTokens`**: Explicitly set to a low value (e.g., 100-200 tokens) for generated responses, preventing verbose outputs.
    *   **`thinkingConfig: { thinkingBudget: 0 }`**: Used to prioritize speed over extensive reasoning for tasks where immediate, direct responses are sufficient, suitable for a tutor delivering structured, pre-defined content.
*   **Latency Considerations**:
    *   **Single-Turn Generation**: The system requests only one piece of content (lesson segment, question, feedback) per LLM call, avoiding complex multi-part generation tasks.
    *   **Dedicated Model**: Utilizes `gemini-3-flash-preview` which is optimized for speed and efficiency in text-generation tasks.
*   **Design Trade-offs**: The minimal-state, single-turn generation approach trades off deep conversational context awareness for enhanced performance and cost-efficiency. This is deemed acceptable for a beginner-level micro-lesson with predefined content structure.

## Implementation Details
The project utilizes the **Gemini 2.5 Flash** model for all generative AI capabilities, chosen for its balance of performance and cost-effectiveness suitable for interactive applications. The frontend is built with React and TypeScript, interacting with the `geminiService` layer which orchestrates calls to the Google GenAI SDK.

**Conceptual Python API Usage Example (for interacting with the tutor's JSON API):**
```python
import requests
import json

TUTOR_API_ENDPOINT = "http://localhost:3000/api/tutor" # Example local endpoint

def send_to_tutor(current_phase: str, current_q: int, current_score: int, user_input: int = None):
    payload = {
        "currentPhase": current_phase,
        "currentQ": current_q,
        "currentScore": current_score,
        "userInput": user_input
    }
    headers = {'Content-Type': 'application/json'}
    try:
        response = requests.post(TUTOR_API_ENDPOINT, data=json.dumps(payload), headers=headers)
        response.raise_for_status() # Raise an exception for HTTP errors
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"API request failed: {e}")
        return None

# Initial interaction
initial_response = send_to_tutor("intro", 0, 0)
print(json.dumps(initial_response, indent=2))

# Example: Process 'teach' phase to get 'ask' phase
if initial_response and initial_response['phase'] == 'teach':
    next_response = send_to_tutor(initial_response['phase'], initial_response['state']['q'], initial_response['state']['score'])
    print(json.dumps(next_response, indent=2))
    # Assuming user selects answer '1' for the first question
    # next_response_after_answer = send_to_tutor(next_response['phase'], next_response['state']['q'], next_response['state']['score'], 1)
    # print(json.dumps(next_response_after_answer, indent=2))
```
*Note: The actual implementation uses client-side JavaScript (`@google/genai` SDK) directly; the Python snippet above illustrates how an external system might interact with the defined JSON interface.*

## Example Interaction

**Turn 1: Initial `intro` phase (System provides initial welcome)**
```json
{
  "phase": "intro",
  "state": { "q": 0, "score": 0 },
  "data": {},
  "ui": {
    "screen": "intro",
    "text": "Welcome to Introduction to French Language and French Culture! Let's begin our journey.",
    "choices": [],
    "input": "none",
    "progress": 0
  }
}
```

**Turn 2: After user clicks "Start Lesson" (System transitions to `teach` phase)**
```json
{
  "phase": "teach",
  "state": { "q": 0, "score": 0 },
  "data": {},
  "ui": {
    "screen": "lesson",
    "text": "Bonjour (Hello/Good day) is a fundamental greeting used all day. Au revoir (Goodbye) is the polite farewell. Merci (Thank you) shows gratitude. S'il vous plaît (Please) is for politeness, and Excusez-moi (Excuse me) is for apologies or getting attention.",
    "choices": [],
    "input": "none",
    "progress": 10
  }
}
```

**Turn 3: After user clicks "Continue to Quiz" (System transitions to `ask` phase, Q0)**
```json
{
  "phase": "ask",
  "state": { "q": 0, "score": 0 },
  "data": {},
  "ui": {
    "screen": "question",
    "text": "What does 'Bonjour' mean in French?",
    "choices": [
      { "id": 0, "label": "Good afternoon" },
      { "id": 1, "label": "Hello / Good day" },
      { "id": 2, "label": "Good evening" },
      { "id": 3, "label": "Goodbye" }
    ],
    "input": "multiple_choice",
    "progress": 10
  }
}
```

**Turn 4: User selects choice ID 1 (System transitions to `evaluate` phase for Q0, assuming correct)**
```json
{
  "phase": "evaluate",
  "state": { "q": 0, "score": 1 },
  "data": {},
  "ui": {
    "screen": "feedback",
    "text": "That's correct! 'Bonjour' is a versatile greeting used throughout the day to say 'Hello' or 'Good day' in French. Excellent start!",
    "choices": [],
    "input": "none",
    "progress": 10
  }
}
```

## Limitations
*   **Fixed Curriculum**: The current question bank is hardcoded, limiting flexibility.
*   **Limited Adaptivity**: The system does not adapt difficulty or content based on individual learner performance beyond basic scoring.
*   **No Free-form Input**: Interaction is restricted to multiple-choice selections; there is no support for open-ended text input or conversational dialogue beyond the predefined phases.
*   **Simulated Agents**: Agents are conceptual roles; there is no autonomous reasoning or inter-agent communication within the LLM.
*   **Minimal State**: While an optimization, it prevents deeper conversational context or personalized learning paths that require more extensive memory.
*   **Singular Focus**: The tutor is designed for a very narrow scope (beginner French greetings and basic phrases).

## Future Work
Potential enhancements include:
*   **Adaptive Difficulty**: Implement algorithms to adjust question difficulty based on learner performance, potentially leveraging a larger, tagged question bank.
*   **User Profiling**: Store and utilize more extensive user data (e.g., learning style, common mistakes) to further personalize content and feedback.
*   **Expanded Curriculum**: Integrate more advanced topics, grammar, and vocabulary, perhaps with dynamically generated content from the LLM.
*   **Multimodal Interaction**: Incorporate speech input/output for a more immersive experience, leveraging Gemini's audio capabilities.
*   **Advanced Feedback**: Provide more granular feedback, including common error analysis and tailored remedial exercises.
*   **Agent Specialization**: Explore more sophisticated agentic behavior, potentially by integrating dedicated models or prompts for specific agent roles, allowing for more complex pedagogical strategies.
*   **Gamification**: Introduce elements such as points, badges, or leaderboards to enhance motivation and engagement.

## License
This project is licensed under the Apache License 2.0. See the [LICENSE](LICENSE) file for details.
