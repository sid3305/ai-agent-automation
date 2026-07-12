const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes.js');
const taskRoutes = require('./routes/task.routes.js');
const workflowRoutes = require('./routes/workflow.routes');
const agentRoutes = require('./routes/agent.routes');
const logRoutes = require('./routes/log.routes');
const scheduleRoutes = require('./routes/schedule.routes');
const webhookRoutes = require('./routes/webhook.routes'); // admin
const webhookPublicRoutes = require('./routes/webhook.public.routes'); // public
const a2aPublicRoutes = require('./routes/a2a.public.routes');
const agentTeamRoutes = require('./routes/agentTeam.routes');
const documentRoutes = require('./routes/document.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const settingsRoutes = require('./routes/settings.routes');
const systemRoutes = require('./routes/system.routes');
const templateRoutes = require('./routes/template.routes');
const memoryRoutes = require('./routes/memory.routes');
const assistantRoutes = require('./routes/assistant.routes');
const telemetryRoutes = require('./routes/telemetry.routes');
const insightsRoutes = require('./routes/insights.routes');
const mcpRoutes = require('./routes/mcp.routes');
const apiKeyRoutes = require('./routes/apiKey.routes');
const workflowPublicRoutes = require('./routes/workflow.public.routes');
const { globalLimiter, webhookLimiter } = require('./middleware/rateLimit.middleware');
const helmetMiddleware = require('./middleware/helmet.middleware.js');
require('dotenv').config();

const app = express();

app.set('trust proxy', 1);

app.use(cors());
app.use(helmetMiddleware);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// <---------------------Temporary--------------------------->
const mongoose = require('mongoose');

app.post('/api/agent-teams/:id/run', async (req, res) => {
  try {
    const { input } = req.body;
    const db = mongoose.connection.db;
    const workflow = await db.collection('workflows').findOne({ name: 'A2A testing' });

    if (!workflow) {
      return res.status(404).json({ error: "Workflow 'A2A testing' not found in database." });
    }
    const execUrl = `http://localhost:${process.env.PORT || 5001}/api/workflows/${workflow._id}/run`;
    const execRes = await fetch(execUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': req.headers.authorization || ''
      },
      body: JSON.stringify({ triggerSource: 'war_room', input })
    });

    if (!execRes.ok) {
      const errorBody = await execRes.text();
      throw new Error(`Runner failed with Status ${execRes.status}: ${errorBody}`);
    }
    res.json({
      ok: true,
      messages: [
        {
          id: Date.now().toString(),
          role: 'agent',
          agentName: 'Support Bot',
          content: `Received your prompt: "${input}". Coordinating with Tech Bot now.`
        },
        {
          id: (Date.now() + 1).toString(),
          role: 'agent',
          agentName: 'Tech Bot',
          content: 'System failure confirmed. Workflow triggered successfully.',
          workflowExecution: {
            workflowId: workflow._id.toString(),
            workflowName: 'A2A testing',
            status: 'success'
          }
        }
      ]
    });
  } catch (error) {
    console.error("❌ SWARM EXECUTION ERROR:", error.message);
    res.status(500).json({ error: error.message });
  }
});
// <---------------------Temporary--------------------------->

// apply rate limiting middleware to routes
app.use('/api', globalLimiter);
app.use('/webhook', webhookLimiter);

// health
app.get('/health', (req, res) => res.json({ ok: true, ts: Date.now() }));

// routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/agent-teams', agentTeamRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/webhook/a2a', a2aPublicRoutes);
app.use('/webhook', webhookPublicRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/assistant', assistantRoutes);
app.use('/api/telemetry', telemetryRoutes);
app.use('/api/insights', insightsRoutes);
app.use('/api/mcp', mcpRoutes);
app.use('/api/keys', apiKeyRoutes);
app.use('/api/workflows/public', workflowPublicRoutes);

// generic 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

module.exports = app;
