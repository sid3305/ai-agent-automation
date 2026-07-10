const Lock = require('../models/lock.model');

/**
 * Distributed Lock Manager using MongoDB atomic findOneAndUpdate primitives.
 * Provides exclusive locking (acquireLock / releaseLock) and counting semaphores
 * (acquireSemaphore / releaseSemaphore) for coordinating multi-worker execution
 * without requiring Redis or other external dependencies.
 */
class LockManager {
  /**
   * Tries to acquire an exclusive lock. Returns false immediately if the lock
   * is already held by another worker and has not expired. If the lock is
   * expired or does not exist, it is atomically claimed.
   *
   * @param {string} lockKey - Unique identifier for the lock resource
   * @param {number} ttlMs   - Time-to-live in milliseconds before the lock auto-expires
   * @param {string} ownerId - Caller's unique identifier (e.g. `workerId:taskId`)
   * @returns {Promise<boolean>} true if the lock was acquired, false otherwise
   */
  static async acquireLock(lockKey, ttlMs, ownerId) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    try {
      // Attempt to take over an existing but expired lock document atomically.
      const lock = await Lock.findOneAndUpdate(
        {
          lockKey,
          $or: [
            { expiresAt: { $lt: now } }, // lock has expired
          ],
        },
        {
          $set: {
            ownerId,
            expiresAt,
            acquiredAt: now,
            semaphoreCount: 0,
          },
        },
        { new: true, upsert: false }
      );

      if (lock) {
        return true;
      }

      // No expired lock found — try to insert a fresh document.
      // If a concurrent worker already inserted one, the unique index on lockKey
      // will throw a duplicate-key error (code 11000), which we treat as "lock busy".
      await Lock.create({
        lockKey,
        ownerId,
        expiresAt,
        acquiredAt: now,
        semaphoreCount: 0,
      });

      return true;
    } catch (err) {
      if (err.code === 11000) {
        // Another worker holds the lock — expected, not an error.
        return false;
      }
      console.error('[LockManager] acquireLock error:', err.message);
      return false;
    }
  }

  /**
   * Releases an exclusive lock, but only if the caller is the registered owner.
   * Prevents one worker from accidentally releasing another worker's lock.
   *
   * @param {string} lockKey - Unique identifier for the lock resource
   * @param {string} ownerId - Must match the ownerId set when the lock was acquired
   * @returns {Promise<boolean>} true if the lock was deleted, false otherwise
   */
  static async releaseLock(lockKey, ownerId) {
    try {
      const result = await Lock.deleteOne({ lockKey, ownerId });
      return result.deletedCount > 0;
    } catch (err) {
      console.error('[LockManager] releaseLock error:', err.message);
      return false;
    }
  }

  /**
   * Acquires a counting semaphore slot for the given resource key.
   * A semaphore allows at most `limit` concurrent holders. When the count
   * would exceed `limit`, acquisition fails without blocking.
   *
   * Semaphore state is stored in a single Lock document per resourceKey using
   * an atomic $inc + conditional update to prevent races across workers:
   *
   *   - If no document exists, one is created with semaphoreCount = 1.
   *   - If the document exists and semaphoreCount < limit, the count is
   *     incremented atomically.
   *   - If semaphoreCount >= limit, the method returns false immediately.
   *   - expiresAt is refreshed on every successful acquisition so stale
   *     semaphore documents are also cleaned up by the MongoDB TTL index.
   *
   * @param {string} resourceKey - Unique identifier for the shared resource
   * @param {number} limit       - Maximum number of concurrent holders allowed
   * @param {number} ttlMs       - TTL in milliseconds for the semaphore document
   * @param {string} ownerId     - Caller's unique identifier (informational)
   * @returns {Promise<boolean>} true if a semaphore slot was acquired, false if at capacity
   */
  static async acquireSemaphore(resourceKey, limit, ttlMs, ownerId) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    try {
      // Atomically increment semaphoreCount only when currently below the limit.
      // Using a dedicated semaphore lockKey prefix avoids collision with exclusive locks.
      const semKey = `sem:${resourceKey}`;

      const updated = await Lock.findOneAndUpdate(
        {
          lockKey: semKey,
          semaphoreCount: { $lt: limit }, // Only acquire if under the limit
          $or: [
            { expiresAt: { $gt: now } }, // Document is still valid
            { expiresAt: { $lt: now } }, // Or expired — allow reset
          ],
        },
        {
          $inc: { semaphoreCount: 1 },
          $set: {
            ownerId,
            expiresAt,
            acquiredAt: now,
          },
        },
        { new: true, upsert: false }
      );

      if (updated) {
        return true;
      }

      // No existing document — try to create it (semaphoreCount starts at 1).
      // If the limit is 0, reject immediately before attempting insert.
      if (limit < 1) {
        return false;
      }

      await Lock.create({
        lockKey: semKey,
        ownerId,
        expiresAt,
        acquiredAt: now,
        semaphoreCount: 1,
      });

      return true;
    } catch (err) {
      if (err.code === 11000) {
        // Concurrent insert from another worker — the semaphore is now at limit.
        return false;
      }
      console.error('[LockManager] acquireSemaphore error:', err.message);
      return false;
    }
  }

  /**
   * Releases one slot of a counting semaphore. Decrements the count; once the
   * count reaches zero, the document is removed to allow a clean next cycle.
   *
   * @param {string} resourceKey - Unique identifier for the shared resource
   * @returns {Promise<boolean>} true if the semaphore was decremented/released
   */
  static async releaseSemaphore(resourceKey) {
    const semKey = `sem:${resourceKey}`;

    try {
      // Decrement count. If count would drop to zero, delete the document.
      const doc = await Lock.findOneAndUpdate(
        { lockKey: semKey, semaphoreCount: { $gt: 1 } },
        { $inc: { semaphoreCount: -1 } },
        { new: true }
      );

      if (doc) {
        return true;
      }

      // Count was 1 (or document doesn't exist) — remove entirely.
      const result = await Lock.deleteOne({ lockKey: semKey });
      return result.deletedCount > 0;
    } catch (err) {
      console.error('[LockManager] releaseSemaphore error:', err.message);
      return false;
    }
  }
}

module.exports = LockManager;
