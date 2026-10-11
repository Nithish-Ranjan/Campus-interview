import crypto from 'crypto';

/**
 * Hash a password using scrypt with a cryptographically secure random salt.
 * Returns format: "scrypt$<salt_hex>$<key_hex>"
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString('hex');
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) return reject(err);
      resolve(`scrypt$${salt}$${derivedKey.toString('hex')}`);
    });
  });
}

/**
 * Verify a candidate password against a stored scrypt hash.
 * Timing-safe comparison prevents timing attacks.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const parts = storedHash.split('$');
      if (parts.length !== 3 || parts[0] !== 'scrypt') {
        return resolve(false);
      }
      const salt = parts[1];
      const originalKey = Buffer.from(parts[2], 'hex');

      crypto.scrypt(password, salt, originalKey.length, (err, derivedKey) => {
        if (err) return resolve(false);
        try {
          const match = crypto.timingSafeEqual(originalKey, derivedKey);
          resolve(match);
        } catch {
          resolve(false);
        }
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Generates a secure, unguessable random session ID.
 */
export function generateSessionToken(): string {
  return crypto.randomBytes(32).toString('hex');
}
