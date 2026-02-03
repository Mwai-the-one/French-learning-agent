
# Multi-Agent Beginner French Tutor Using Gemini 2.5 Flash

## Abstract
This document describes a prototype for a lightweight, stateful, multi-agent educational system designed to provide interactive micro-lessons on beginner French language and culture. The system leverages the Gemini 2.5 Flash model, emphasizing token efficiency, low latency, and a structured JSON-based interaction interface. It simulates an internal multi-agent architecture (planner, explainer, quiz, feedback, progress, motivation) to deliver a coherent and adaptive learning experience while maintaining minimal persistent state.

## Introduction
The increasing demand for personalized and accessible education has driven significant advancements in AI-based tutoring systems. Traditional AI tutors often struggle with dynamic content generation, contextual understanding, and resource efficiency. This project addresses these challenges by employing a multi-agent architectural paradigm, which allows for modularized intelligent behaviors and a flexible, phase-based interaction flow. The rationale for a multi-agent system lies in its ability to decompose complex tutoring functionalities into specialized, manageable components, enhancing adaptability and maintainability. This design also facilitates the integration of large language models (LLMs) by structuring prompts and responses for optimal performance and interpretability.

## System Architecture
The system operates on a simulated multi-agent architecture, where distinct functional roles are conceptualized to guide the learner's journey without explicitly deploying separate computational agents. These roles include:
*   **Planner:** Determines the overall lesson progression and transitions between phases.
*   **Explainer:** Generates concise teaching content and clarifications.
*   **Quiz Master:** Formulates multiple-choice questions based on taught material.
*   **Feedback Provider:** Evaluates learner responses and delivers corrective or affirming feedback.
*   **Progress Tracker:** Monitors learner advancement through the curriculum.
*   **Motivation Enhancer:** Maintains an encouraging tone throughout the interaction.

State management is maintained through a minimal persistent state, comprising only the `question_index` and `score`. This design choice minimizes the computational overhead associated with state serialization and retrieval, significantly reducing memory footprint and improving response times. The justification for this minimal-state approach is rooted in the strategy of offloading complex contextual memory and content generation to the underlying Gemini 2.5 Flash model, which is capable of synthesizing coherent responses based on a structured, history-aware prompt in each turn.

## State Machine Design
The tutoring system employs a deterministic phase-based state machine to orchestrate the learning experience. The interaction flow is strictly sequential and turn-based, ensuring a controlled and predictable pedagogical progression. The phases are defined as:

1.  **`intro`**: Initiates the lesson, welcomes the learner, and provides a brief overview.
2.  **`teach`**: Introduces new beginner French vocabulary and associated cultural context.
3.  **`ask`**: Presents a single multiple-choice question derived from the `teach` phase content.
4.  **`evaluate`**: Assesses the learner's answer to the `ask` phase question and provides feedback.
5.  **`report`**: Summarizes the learner's performance upon completion of all questions.
6.  **`completed`**: Signifies the end of the lesson.
7.  **`paused`**: A temporary state for human intervention commands or user-initiated pauses.

Transitions between phases are governed by internal logic and user input. For instance, after `evaluate`, the system transitions to `ask` if more questions remain, or to `report` if the quiz is complete. Human intervention commands (`review`, `clarify`, `report_issue`, `pause`, `resume`, `exit`) allow for dynamic redirection or suspension of the lesson, with state integrity maintained during such diversions.

## Data Structure and Interface Specification
The interaction between the learner and the system occurs via a structured JSON interface. Only the `interface` object is rendered to the learner, abstracting the internal logic.

**JSON Response Format Example:**
```json
{
  "phase": "ask",
  "state": {
    "question_index": 1,
    "score": 1
  },
  "interface": {
    "title": "Question 2: French Greetings",
    "content": "What is the appropriate response to 'Bonjour' in the morning?",
    "instructions": "Select the best option.",
    "input_type": "multiple_choice",
    "options": [
      { "id": 0, "label": "Au revoir" },
      { "id": 1, "label": "Bonjour" },
      { "id": 2, "label": "Merci" }
    ],
    "progress": 40
  },
  "correct_answer_id": 1
}
```

**Explanation of Top-Level Fields:**
*   **`phase`**: A string indicating the current stage of the lesson (`intro`, `teach`, `ask`, `evaluate`, `report`, `completed`, `paused`).
*   **`state`**: An object containing the learner's persistent progress:
    *   **`question_index`**: Integer representing the number of questions addressed so far.
    *   **`score`**: Integer representing the number of correct answers.
*   **`interface`**: An object encapsulating all learner-facing content:
    *   **`title`**: String for the current section's heading.
    *   **`content`**: String containing the main instructional text or question.
    *   **`instructions`**: String providing guidance for the learner's next action.
    *   **`input_type`**: String specifying the expected input format (`none` for continuation, `multiple_choice` for quizzes).
    *   **`options`**: (Optional) An array of objects for multiple-choice questions, each with an `id` and `label`.
    *   **`progress`**: Integer (0-100) indicating the overall lesson completion percentage.
*   **`correct_answer_id`**: (Optional) Integer, present only in the `ask` phase, indicating the `id` of the correct option for the current question. This is used internally for evaluation and is not exposed to the learner during the `ask` phase to preserve academic integrity.

## Performance Optimization Strategy
The system's performance optimization focuses on token reduction and latency mitigation, critical for efficient LLM interaction.

**Token Reduction Techniques:**
*   **Minimal State Transfer:** Only `question_index` and `score` are maintained as persistent state. Full lesson content or question banks are not stored. Instead, the LLM dynamically generates content based on the current phase and minimal state variables.
*   **Concise Prompts:** Prompts are meticulously crafted to be highly specific and instructional, eliminating verbose explanations. The prompt itself contains the state machine logic, phase rules, and constraints, guiding the LLM to generate targeted responses.
*   **Single-Turn Generation:** The LLM generates only one question or explanation per interaction, avoiding pre-generation of entire lessons.
*   **Strict Output Schema:** The system enforces a precise JSON output schema, preventing the LLM from generating extraneous text or alternative formats, thereby reducing token waste and simplifying parsing.

**Latency Considerations:**
*   The use of Gemini 2.5 Flash, a model optimized for speed, is a primary strategy for low-latency responses.
*   The minimal data transfer and concise prompts reduce the computational load on the LLM, leading to faster inference times.
*   Caching mechanisms (not explicitly implemented in the provided code but a consideration) could further reduce latency for repetitive requests.

**Design Trade-offs:**
The minimal-state and token-efficient design prioritizes speed and cost-effectiveness. The trade-off is that the LLM must regenerate some contextual information or adapt its response based on explicit instructions in each prompt, rather than relying on a continuously updated, rich conversational history managed externally. This demands a highly robust and detailed prompt engineering strategy to ensure consistency and prevent drifts in content or tone.

## Implementation Details
The core intelligence of the system is powered by Google's Gemini 2.5 Flash model. This model is selected for its balance of performance and efficiency suitable for interactive tutoring applications. The frontend is implemented in React/TypeScript, handling the UI rendering and user interactions.

**Example API Usage in Python (Conceptual):**
While the frontend is React/TypeScript, the underlying Gemini API interaction would conceptually follow this pattern (assuming `process.env.API_KEY` is accessible):

```python
import os
import google.generativeai as genai
import json

def call_gemini_tutor(current_phase, current_state, is_previous_answer_correct, selected_option_label, learner_input, total_questions):
    genai.configure(api_key=os.environ["API_KEY"])
    model = genai.GenerativeModel('gemini-3-flash-preview')

    # Construct prompt as defined in services/geminiService.ts
    prompt = f"""
    You are a stateful AI tutor for Beginner French Language and Culture. Your goal is to guide the learner through a lesson, quiz them, and provide feedback, following specific phases.

    All responses MUST be a single, valid JSON object following this exact schema. Do NOT include any other text, markdown, or explanation outside the JSON.

    ```json
    {{
      "phase": "string",
      "state": {{
        "question_index": "number",
        "score": "number"
      }},
      "interface": {{
        "title": "string",
        "content": "string",
        "instructions": "string",
        "input_type": "string",
        "options": "array",
        "progress": "number"
      }}
      ,"correct_answer_id": "number"
    }}
    ```

    Current Interaction Context:
    - Current Phase: "{current_phase}"
    - Current Question Index: {current_state['question_index']}
    - Current Score: {current_state['score']}
    - Total Questions in this session: {total_questions}
    {"The learner's answer to the previous question was " + ("correct" if is_previous_answer_correct else "incorrect") + f". The learner chose \"{selected_option_label}\"." if current_phase == 'evaluate' else ""}
    {"The learner has entered a command or text input: \"" + learner_input + "\"." if learner_input else ""}
    # ... (rest of the detailed prompt instructions as in services/geminiService.ts) ...

    Generate the response for the next step in the interaction, strictly following the JSON format and phase rules.
    """

    response = model.generate_content(
        prompt,
        generation_config=genai.types.GenerationConfig(
            response_mime_type="application/json"
        )
    )
    return json.loads(response.text)

# Example Usage
# current_state = {"question_index": 0, "score": 0}
# response = call_gemini_tutor("intro", current_state, None, None, None, 3)
# print(response)
```

## Example Interaction
Here is a simplified sequence of a learner-system interaction:

**System (Phase: `intro`)**
```json
{
  "phase": "intro",
  "state": { "question_index": 0, "score": 0 },
  "interface": {
    "title": "Bienvenue au Tutor Français!",
    "content": "Welcome to your beginner French lesson! We'll learn some basic words, cultural tips, and test your knowledge.",
    "instructions": "Click Continue to begin.",
    "input_type": "none",
    "progress": 0
  }
}
```

**Learner Action:** Clicks "Continue" (triggers `handleContinue`, next turn will be `teach`)

**System (Phase: `teach`)**
```json
{
  "phase": "teach",
  "state": { "question_index": 0, "score": 0 },
  "interface": {
    "title": "Lesson 1: Greetings",
    "content": "Bonjour means Hello/Good day. It's used formally and informally. Au revoir means Goodbye. Merci means Thank you. Using these politely is key in French culture!",
    "instructions": "Click Continue for a question.",
    "input_type": "none",
    "progress": 10
  }
}
```

**Learner Action:** Clicks "Continue" (triggers `handleContinue`, next turn will be `ask`)

**System (Phase: `ask`)**
```json
{
  "phase": "ask",
  "state": { "question_index": 0, "score": 0 },
  "interface": {
    "title": "Question 1",
    "content": "Which French word means 'Thank you'?",
    "instructions": "Select the correct answer.",
    "input_type": "multiple_choice",
    "options": [
      { "id": 0, "label": "Bonjour" },
      { "id": 1, "label": "Au revoir" },
      { "id": 2, "label": "Merci" }
    ],
    "progress": 10
  },
  "correct_answer_id": 2
}
```

**Learner Action:** Selects option with `id: 2` ("Merci") (triggers `handleOptionSelect`)

**System (Phase: `evaluate`)**
```json
{
  "phase": "evaluate",
  "state": { "question_index": 1, "score": 1 },
  "interface": {
    "title": "Feedback",
    "content": "Correct! 'Merci' means 'Thank you'. You're doing great!",
    "instructions": "Click Continue for the next question.",
    "input_type": "none",
    "progress": 10
  }
}
```

## Limitations
*   **Context Window Dependency:** The system's ability to maintain a coherent pedagogical flow is highly dependent on the LLM's context window. While prompts are optimized, extremely long or complex interactions could theoretically exceed the effective context.
*   **Static Curriculum Structure:** The current phase-based progression is linear. It lacks advanced branching logic or dynamic curriculum generation beyond the immediate micro-lesson.
*   **Limited Adaptivity:** The system does not currently adapt difficulty or content based on a comprehensive learner profile or fine-grained error analysis.
*   **No Spaced Repetition:** There is no built-in mechanism for spaced repetition or revisiting difficult concepts over time.
*   **Single Modality:** Interaction is exclusively text-based; it does not incorporate audio, visual, or other modalities.
*   **Error Handling Robustness:** While API error handling is implemented, comprehensive recovery from malformed or unparseable LLM responses still relies on re-prompting, which can occasionally lead to minor inconsistencies or repeated content.

## Future Work
Potential enhancements for this system include:
*   **Adaptive Difficulty:** Implement algorithms to dynamically adjust question difficulty and content complexity based on real-time learner performance.
*   **Learner Profiling:** Develop a mechanism to build and utilize a learner profile, tracking strengths, weaknesses, and learning styles to offer more personalized content.
*   **Expanded Curriculum:** Extend the content generation capabilities to cover a wider range of French language topics and grammatical concepts.
*   **Multimodality:** Integrate speech recognition for verbal input and text-to-speech for audio responses, creating a more immersive conversational experience.
*   **Spaced Repetition System:** Incorporate a robust spaced repetition algorithm to optimize memory retention of vocabulary and grammatical rules.
*   **Enhanced Feedback:** Provide more detailed, diagnostic feedback that explains not just *if* an answer is correct, but *why*, and suggest targeted remediation.
*   **Advanced Error Recovery:** Implement more sophisticated strategies for detecting and recovering from LLM generation errors without noticeable disruption to the learner experience.

## License
MIT License
