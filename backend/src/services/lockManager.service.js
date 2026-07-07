const Lock = require('../models/lock.model');

/**
 * Distributed Lock Manager using MongoDB findOneAndUpdate
 */
class LockManager {
  /**
   * Tries to acquire a lock. If lock is already held and not expired, returns false.
   * If lock has expired or does not exist, updates/inserts it and returns true.
   * 
   * @param {string} lockKey Unique identifier for the lock resource
   * @param {number} ttlMs Time-to-live in milliseconds
   * @param {string} ownerId Unique owner identifier (e.g. workerId + taskId)
   * @returns {Promise<boolean>} True if lock is successfully acquired, false otherwise
   */
  static async acquireLock(lockKey, ttlMs, ownerId) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlMs);

    try {
      // 1. Try to find and update the lock if it doesn't exist OR if it is expired.
      const lock = await Lock.findOneAndUpdate(
        {
          lockKey,
          $or: [
            { expiresAt: { $lt: now } }, // Lock is expired
          ],
        },
        {
          $set: {
            ownerId,
            expiresAt,
            acquiredAt: now,
          },
        },
        {
          new: true,
          upsert: false, // Don't upsert here to avoid race conditions causing duplicates on unique indices
        }
      );

      if (lock) {
        return true;
      }

      // 2. If no existing or expired lock was found/updated, try to insert it (first time setup).
      // If another worker beats us to it, the unique index on lockKey will throw a Duplicate Key (11000) error.
      await Lock.create({
        lockKey,
        ownerId,
        expiresAt,
        acquiredAt: now,
      });

      return true;
    } catch (err) {
      if (err.code === 11000) {
        // Safe duplicate key exception: another worker got the lock first
        return false;
      }
      console.error('[LockManager] Error acquiring lock:', err.message);
      return false;
    }
  }

  /**
   * Releases a lock only if the caller matches the registered owner.
   * 
   * @param {string} lockKey Unique identifier for the lock resource
   * @param {string} ownerId Owner ID releasing the lock
   * @returns {Promise<boolean>} True if lock was released successfully, false otherwise
   */
  static async releaseLock(lockKey, ownerId) {
    try {
      const result = await Lock.deleteOne({
        lockKey,
        ownerId,
      });
      return result.deletedCount > 0;
    } catch (err) {
      console.error('[LockManager] Error releasing lock:', err.message);
      return false;
    }
  }
}

module.exports = LockManager;
