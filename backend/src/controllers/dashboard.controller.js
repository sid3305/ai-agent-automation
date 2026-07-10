const Workflow = require('../models/workflow.model');
const Task = require('../models/task.model');
const Agent = require('../models/agent.model');
const Schedule = require('../models/schedule.model');

// -----------------------------
// GET /api/dashboard/stats
// -----------------------------
async function getDashboardStats(req, res) {
  try {
    const userId = req.user._id;

    const [workflowCount, taskCount, runningTaskCount, activeAgentCount, activeScheduleCount] =
      await Promise.all([
        Workflow.countDocuments({ userId }),
        Task.countDocuments({ userId }),
        Task.countDocuments({ userId, status: 'running' }),
        Agent.countDocuments({ userId, isActive: true }),
        Schedule.countDocuments({ userId, enabled: true }),
      ]);

    res.json({
      ok: true,
      stats: {
        workflows: workflowCount,
        tasks: taskCount,
        runningTasks: runningTaskCount,
        agents: activeAgentCount,
        schedules: activeScheduleCount,
      },
    });
  } catch (err) {
    console.error('dashboard stats error', err);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}

/**
 * GET /api/dashboard/execution-trend
 *
 * Returns per-day execution counts for the last 7 days plus an overall
 * summary (total runs, success rate, average duration).
 *
 * Always returns exactly 7 data points — days with no executions are
 * filled with zeroes so the chart X-axis is stable.
 */
async function getExecutionTrend(req, res) {
  try {
    const userId = req.user._id;

    // ── 1. Build the 7-day date window (UTC midnight boundaries) ──────────
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6); // include today → 7 days
    sevenDaysAgo.setUTCHours(0, 0, 0, 0);

    // ── 2. Aggregate: group tasks by calendar date ─────────────────────────
    const rows = await Task.aggregate([
      {
        $match: {
          userId,
          startedAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$startedAt', timezone: 'UTC' },
          },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          failed: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] },
          },
          // Sum of (completedAt - startedAt) for tasks that have both timestamps
          totalDurationMs: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$completedAt', null] }, { $gt: ['$startedAt', null] }] },
                { $subtract: ['$completedAt', '$startedAt'] },
                0,
              ],
            },
          },
          // Count tasks that contributed a duration so we can compute the average
          withDuration: {
            $sum: {
              $cond: [
                { $and: [{ $gt: ['$completedAt', null] }, { $gt: ['$startedAt', null] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ── 3. Index DB results by date string for O(1) lookup ─────────────────
    const byDate = {};
    for (const row of rows) {
      byDate[row._id] = row;
    }

    // ── 4. Build a complete 7-point array (fill missing days with zeros) ───
    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trend = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setUTCDate(d.getUTCDate() + i);

      // Format as "YYYY-MM-DD" to match the $dateToString output
      const dateKey = d.toISOString().slice(0, 10);
      const label = DAY_LABELS[d.getUTCDay()];

      const row = byDate[dateKey];
      const total = row ? row.total : 0;
      const completed = row ? row.completed : 0;
      const failed = row ? row.failed : 0;
      const totalDurationMs = row ? row.totalDurationMs : 0;
      const withDuration = row ? row.withDuration : 0;

      trend.push({
        date: label, // e.g. "Mon" — used as X-axis label
        dateKey, // "2025-07-04" — useful for tooltip display
        executions: total,
        success: completed,
        failed,
        avgDurationMs: withDuration > 0 ? Math.round(totalDurationMs / withDuration) : 0,
      });
    }

    // ── 5. Compute overall summary across all 7 days ───────────────────────
    const totalRuns = trend.reduce((s, d) => s + d.executions, 0);
    const totalCompleted = trend.reduce((s, d) => s + d.success, 0);
    const totalDuration = rows.reduce((s, r) => s + r.totalDurationMs, 0);
    const totalWithDuration = rows.reduce((s, r) => s + r.withDuration, 0);

    const summary = {
      total: totalRuns,
      successRate:
        totalRuns > 0 ? parseFloat(((totalCompleted / totalRuns) * 100).toFixed(1)) : 0,
      avgDurationMs: totalWithDuration > 0 ? Math.round(totalDuration / totalWithDuration) : 0,
    };

    res.json({ ok: true, trend, summary });
  } catch (err) {
    console.error('dashboard execution trend error', err);
    res.status(500).json({ ok: false, error: 'server_error' });
  }
}

module.exports = { getDashboardStats, getExecutionTrend };
