# Agent System

## Agent Configuration

Agents act as autonomous execution units within workflows. Each agent requires a specific configuration defining its behavior, available tools, and access permissions. Configuration includes setting the system prompt, selecting the foundation model, and defining the bounds of its operational context.

## Provider Selection

The system supports multi-provider execution, allowing agents to be backed by different LLM providers based on task requirements. Supported providers include:
* OpenAI
* Gemini
* Groq
* Local models

## Model Routing

Model routing enables dynamic selection of the specific model version based on the complexity of the workflow step. Simple deterministic tasks can be routed to faster, smaller models, while complex reasoning tasks are routed to high-parameter models. 

## Memory-Enabled Workflows

Agents can be equipped with persistent semantic memory. When a memory-enabled agent executes a workflow step, it automatically retrieves relevant past interactions and context, appending this data to its internal prompt before execution. This ensures continuity across disjointed workflow runs.