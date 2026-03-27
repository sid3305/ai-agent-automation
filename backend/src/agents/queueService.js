const Task = require("../models/task.model");
require("dotenv").config();
const maxAttempts = Number(process.env.WORKER_MAX_ATTEMPTS || 3);

/**
 * claimNextTask - atomically find one pending task and mark running
 * @param {Object} options { workerId, batchSize }
 * @returns Task document or null
 */
async function claimNextTask({ workerId = "worker-1" } = {}) {
  // Adjust query & sort as needed (priority, createdAt, etc.)
  const res = await Task.findOneAndUpdate(
    { status: { $in: ["pending", "retrying"] }, attempts: { $lt: maxAttempts } },
    {
      $set: { status: "running", startedAt: new Date(), "metadata.runningBy": workerId },
      $inc: { attempts: 1 }
    },
    { sort: { createdAt: 1 }, returnDocument: "after" } // oldest first
  ).lean();
  return res;
}

/**
 * completeTask - mark task completed, save results
 */
async function completeTask(taskId, { success = true, stepResult = null } = {}) {
  const update = {
    status: success ? "completed" : "failed",
  };

  if (!success) {
    const task = await Task.findById(taskId);

    if ((task.attempts || 0) < maxAttempts) {
      update.status = "retrying"; // 🔥 NEW STATE
    } else {
      update.status = "failed";   // 🔥 FINAL STATE
    }
  }
  if (success) update.completedAt = new Date();
  if (stepResult) update.$push = { stepResults: stepResult };
  return Task.findByIdAndUpdate(taskId, update, { new: true });
}

module.exports = { claimNextTask, completeTask };
