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
 * Helper to calculate local midnight of the given date in target timezone,
 * and return it as a UTC Date object.
 */
function getLocalStartOfDay(date, tz) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });

    const parts = formatter.formatToParts(date);
    const map = {};
    parts.forEach((p) => {
      map[p.type] = p.value;
    });

    const targetYear = parseInt(map.year, 10);
    const targetMonth = parseInt(map.month, 10) - 1;
    const targetDay = parseInt(map.day, 10);

    const utcMidnight = new Date(Date.UTC(targetYear, targetMonth, targetDay, 0, 0, 0, 0));

    const formattedParts = formatter.formatToParts(utcMidnight);
    const fMap = {};
    formattedParts.forEach((p) => {
      fMap[p.type] = p.value;
    });

    const formattedDateInTZ = new Date(
      Date.UTC(
        parseInt(fMap.year, 10),
        parseInt(fMap.month, 10) - 1,
        parseInt(fMap.day, 10),
        parseInt(fMap.hour, 10),
        parseInt(fMap.minute, 10),
        parseInt(fMap.second, 10)
      )
    );

    const offsetMs = formattedDateInTZ.getTime() - utcMidnight.getTime();
    return new Date(utcMidnight.getTime() - offsetMs);
  } catch (err) {
    console.warn(`Timezone formatting failed for ${tz}, falling back to UTC`, err);
    const fallback = new Date(date);
    fallback.setUTCHours(0, 0, 0, 0);
    return fallback;
  }
}

/**
 * GET /api/dashboard/execution-trend
 *
 * Returns per-day execution counts for the last 7 days plus an overall
 * summary (total runs, success rate, average duration).
 *
 * Supports timezone-aware grouping via tz query parameter.
 * Always returns exactly 7 data points — days with no executions are
 * filled with zeroes so the chart X-axis is stable.
 */
async function getExecutionTrend(req, res) {
  try {
    const userId = req.user._id;
    const tz = req.query.tz || 'UTC';

    // ── 1. Build the 7-day date window (target local midnight boundaries) ──
    const now = new Date();
    const localStartToday = getLocalStartOfDay(now, tz);
    const sevenDaysAgo = new Date(localStartToday);
    sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);

    // ── 2. Aggregate: group tasks by calendar date in local timezone ──────
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
            $dateToString: { format: '%Y-%m-%d', date: '$startedAt', timezone: tz },
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
    const trend = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setUTCDate(d.getUTCDate() + i);

      // Add a safe 2-hour offset to avoid boundary float/rounding anomalies during formatting
      const formatTime = new Date(d.getTime() + 1000 * 60 * 60 * 2);

      // Format as "YYYY-MM-DD" and get the weekday name in the target timezone
      const options = { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' };
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(formatTime);
      const map = {};
      parts.forEach((p) => {
        map[p.type] = p.value;
      });

      const dateKey = `${map.year}-${map.month}-${map.day}`;
      const label = formatTime.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short' });

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
