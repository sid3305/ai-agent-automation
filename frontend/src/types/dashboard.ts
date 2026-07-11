/**
 * Types for GET /api/dashboard/execution-trend
 *
 * One entry per day in the 7-day window.
 */
export type ExecutionTrendPoint = {
  /** Short day label, e.g. "Mon", "Tue" — used as the chart X-axis tick */
  date: string;
  /** ISO date string "YYYY-MM-DD" — used in tooltip for the full date */
  dateKey: string;
  /** Total number of workflow runs that started on this day */
  executions: number;
  /** Number of runs that completed successfully */
  success: number;
  /** Number of runs that failed */
  failed: number;
  /** Average wall-clock execution time in milliseconds (0 if no data) */
  avgDurationMs: number;
};

/**
 * Aggregated summary across the full 7-day window.
 */
export type ExecutionTrendSummary = {
  /** Total execution count across all 7 days */
  total: number;
  /** Overall success rate as a percentage, e.g. 87.5 */
  successRate: number;
  /** Average execution duration in milliseconds across all 7 days */
  avgDurationMs: number;
};

/**
 * Full response shape from GET /api/dashboard/execution-trend.
 * Always contains exactly 7 trend points (zero-filled if no data).
 */
export type ExecutionTrendResponse = {
  ok: boolean;
  /** Exactly 7 data points, one per day (oldest → today) */
  trend: ExecutionTrendPoint[];
  summary: ExecutionTrendSummary;
};
