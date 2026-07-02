# Agent-to-Agent (A2A) Communication

The AI Agent Automation platform supports deterministic Agent-to-Agent (A2A) communication. This allows workflows to delegate specific tasks to specialized agents, enabling complex multi-agent orchestration while maintaining strict execution integrity.

---

## Overview

A2A orchestration is handled through two primary mechanisms:
1.  **The `agent_call` Node:** A dedicated workflow step designed explicitly for delegating complex prompts to specialized agents and parsing their structured responses.
2.  **Step-Level Overrides:** Standard workflow nodes (e.g., HTTP, LLM, File Tool) can dynamically override the global workflow agent and execute using a specialized agent's configuration.

## Features

### Deterministic JSON Protocol
To ensure workflow stability (especially when routing downstream via `Condition` or `Switch` nodes), all A2A communication is enforced via a strict microservice protocol. Agents do not respond with conversational text; they are forced to return valid JSON.

```json
{
  "from": "Math Expert Bot",
  "to": "calling_workflow",
  "type": "agent_result",
  "content": {
    "result": "1050. Multiplication of 25 and 42 is performed by repeating the addition of 25 forty-two times..."
  }
}
```
*The execution engine automatically strips markdown fences and validates this schema before proceeding.*

### Memory Isolation
When an agent is delegated a task, its memory reads and writes are strictly sandboxed to its own ID (`agent._id`). This prevents cross-agent context bleeding (e.g., a "Code Reviewer" agent will not pollute the semantic memory of a "Creative Writer" agent).

### Fallback Protection
If an LLM hallucinates or ignores the JSON instruction, the internal `agentCall.handler.js` intercepts the raw text and automatically wraps it into the required protocol schema, preventing downstream crashes.

---

## Using A2A in the Visual Builder

### 1. The Agent Call Node
When building a workflow, you can add an **Agent Call (A2A)** node. 
* **Target Agent:** Select the specific agent from your available roster.
* **Input / Prompt:** Provide the explicit instructions for the task.
* **Wait for Response:** Check this to execute synchronously. *(Note: Asynchronous dispatch is currently safeguarded to fail-fast to protect workflow integrity).*
* **Use Target Agent's Memory:** Toggles whether the delegated agent should retrieve its past interactions for context.

### 2. Step-Level Overrides
For standard nodes, the configuration sidebar includes an optional **Step-Level Agent Override**. Selecting an agent here will swap the global agent context just for this specific step, applying the target agent's Provider and Model credentials.

### 3. Execution Timeline
The Task Timeline UI is fully integrated with A2A execution. Successful agent calls will render a custom badge displaying the Agent Name alongside its Provider and Model (e.g., `Math Expert Bot | groq/llama-3.1-8b-instant`), giving you full traceability of which agent executed which step.