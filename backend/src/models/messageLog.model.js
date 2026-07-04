const mongoose = require('mongoose');

const MessageLogSchema = new mongoose.Schema({
  sessionId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentSession', required: true, index: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'AgentTeam', required: true, index: true },
  from: { type: String, required: true, index: true },
  to: { type: String, required: true, index: true },
  type: { 
    type: String, 
    enum: ['task_request', 'task_result', 'clarification', 'final_result', 'error'], 
    required: true 
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'processed', 'failed'],
    default: 'sent',
    index: true
  },
  content: { type: mongoose.Schema.Types.Mixed, required: true }
}, { timestamps: true, minimize: false });

module.exports = mongoose.models.MessageLog || mongoose.model('MessageLog', MessageLogSchema);