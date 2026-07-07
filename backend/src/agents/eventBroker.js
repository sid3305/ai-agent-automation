const EventEmitter = require('events');
const MessageLog = require('../models/messageLog.model');
const AgentTeam = require('../models/agentTeam.model');
const AgentSession = require('../models/agentSession.model');
const Agent = require('../models/agent.model');
const { runLLM } = require('./llmAdapter');
const { retrieveMemory, storeMemory } = require('../services/memoryService');

class EventBroker extends EventEmitter {
  constructor() {
    super();
    this.MAX_HOPS = 20;
    this.on('NEW_SWARM_MESSAGE', this.handleNewMessage.bind(this));
    this.on('INTERNAL_AGENT_MESSAGE', this.handleInternalMessage.bind(this));
  }

  async handleNewMessage(messageId) {
    try {
      const msg = await MessageLog.findById(messageId);
      if (!msg) return;

      const session = await AgentSession.findById(msg.sessionId);
      const team = await AgentTeam.findById(msg.teamId);

      if (!session || session.status !== 'active' || !team) return;

      const lastExternalMsg = await MessageLog.findOne({
        sessionId: session._id,
        'from.type': 'external',
      }).sort({ createdAt: -1 });

      const deadlockQuery = {
        sessionId: session._id,
        'from.type': 'internal',
      };

      if (lastExternalMsg) {
        deadlockQuery.createdAt = { $gt: lastExternalMsg.createdAt };
      }

      const msgCount = await MessageLog.countDocuments(deadlockQuery);

      if (msgCount > this.MAX_HOPS) {
        session.status = 'failed';
        session.errorLog = session.errorLog || [];
        session.errorLog.push({
          message: 'Max consecutive internal hops exceeded (Deadlock shield activated)',
        });
        await session.save();
        return;
      }

      if (msg.to.type === 'internal' || msg.to.id === 'broadcast') {
        const agents = await Agent.find({ _id: { $in: team.agents } });

        let targetAgents = agents;
        if (msg.to.id !== 'broadcast') {
          targetAgents = agents.filter((a) => a.name === msg.to.id || String(a._id) === msg.to.id);
        }
        targetAgents = targetAgents.filter(
          (a) => a.name !== msg.from.id && String(a._id) !== msg.from.id
        );

        const executionPromises = targetAgents.map((agent) =>
          this.executeAgent(agent, session, team, msg.content)
        );
        await Promise.allSettled(executionPromises);
      } else if (msg.to.type === 'external') {
        const extAgent = team.externalAgents.find((a) => a.name === msg.to.id);
        if (extAgent && extAgent.webhookUrl) {
          const response = await fetch(extAgent.webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-a2a-secret': team.metadata.a2aSecret,
            },
            body: JSON.stringify(msg),
          });

          if (!response.ok) {
            throw new Error(`Webhook delivery failed. Status: ${response.status}`);
          }
        }
      }
    } catch (err) {
      console.error(err);
    }
  }

  async executeAgent(agent, session, team, inputPayload) {
    try {
      let finalPrompt = `You are ${agent.name}.`;
      if (agent.role) finalPrompt += ` Your role is ${agent.role}.`;
      if (session.objective) finalPrompt += `\nTeam Objective: ${session.objective}`;
      if (agent.systemInstructions)
        finalPrompt += `\nStrict Instructions:\n${agent.systemInstructions}`;

      try {
        const memories = await retrieveMemory(agent, JSON.stringify(inputPayload), 5);
        if (memories && memories.length > 0) {
          const memoryText = memories
            .map((m) => m.content)
            .join('\n\n')
            .slice(0, 4000);
          finalPrompt += `\n\nMEMORY:\n${memoryText}`;
        }
      } catch (memErr) {
        console.warn(
          `[Swarm] Memory retrieval skipped for ${agent.name}: Invalid Embedding URL or Service Down`
        );
      }

      finalPrompt += `\n\nINCOMING MESSAGE:\n${JSON.stringify(inputPayload)}`;

      finalPrompt += `\n\nCRITICAL OUTPUT FORMAT:
You must respond ONLY with a raw JSON object. Do not include markdown fences. Use this exact schema:
{
  "to": {"id": "broadcast", "type": "internal"},
  "type": "agent_result",
  "content": {
    "result": "your calculated answer"
  }
}
CRITICAL RULE: You are ${agent.name}. NEVER set "to.id" to your own name. If you are answering a general question, always set "to.id" to "broadcast".`;

      const llmRes = await runLLM(finalPrompt, {
        provider: agent.config?.provider,
        model: agent.config?.model,
        temperature: agent.config?.temperature,
      });

      if (llmRes.error) throw new Error(llmRes.error);

      const rawText = llmRes.text
        .trim()
        .replace(/^```json\n?/, '')
        .replace(/^```\n?/, '')
        .replace(/\n?```$/, '');
      const parsedOutput = JSON.parse(rawText.trim());

      if (
        !parsedOutput ||
        typeof parsedOutput !== 'object' ||
        !parsedOutput.to ||
        !parsedOutput.content
      ) {
        throw new Error('Invalid LLM output: Missing "to" or "content" fields.');
      }

      try {
        await storeMemory(
          agent,
          JSON.stringify({
            input: inputPayload,
            output: parsedOutput,
          }),
          { sessionId: session._id, type: 'conversation' }
        );
      } catch (memErr) {
        console.warn(
          `[Swarm] Memory storage skipped for ${agent.name}: Invalid Embedding URL or Service Down`
        );
      }

      this.emit('INTERNAL_AGENT_MESSAGE', {
        sessionId: session._id,
        teamId: team._id,
        from: { id: agent.name, type: 'internal' },
        to: parsedOutput.to,
        type: parsedOutput.type || 'agent_result',
        content: parsedOutput.content,
      });
    } catch (err) {
      console.error(err);
    }
  }

  async handleInternalMessage(data) {
    try {
      const msg = await MessageLog.create({
        sessionId: data.sessionId,
        teamId: data.teamId,
        from: data.from,
        to: data.to,
        type: data.type,
        content: data.content,
        status: 'delivered',
      });
      this.emit('NEW_SWARM_MESSAGE', msg._id);
    } catch (err) {
      console.error(err);
    }
  }
}

const broker = new EventBroker();
module.exports = broker;
