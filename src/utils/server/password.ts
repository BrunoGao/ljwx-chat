import bcrypt from 'bcryptjs';

/**
 * Hash a plain text password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
};

/**
 * Verify a plain text password against a hashed password
 * @param password - Plain text password to verify
 * @param hashedPassword - Hashed password to compare against
 * @returns True if password matches, false otherwise
 */
export const verifyPassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hashedPassword);
};

/**
 * Validate password strength
 * @param password - Password to validate
 * @returns Object with validation result and message
 */
export const validatePasswordStrength = (
  password: string,
): { message?: string, valid: boolean; } => {
  if (password.length < 8) {
    return { message: 'Password must be at least 8 characters long', valid: false };
  }

  if (password.length > 128) {
    return { message: 'Password must not exceed 128 characters', valid: false };
  }

  // At least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return { message: 'Password must contain at least one lowercase letter', valid: false };
  }

  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return { message: 'Password must contain at least one uppercase letter', valid: false };
  }

  // At least one number
  if (!/\d/.test(password)) {
    return { message: 'Password must contain at least one number', valid: false };
  }

  // At least one special character
  if (!/[!"#$%&()*,.:<>?@^{|}]/.test(password)) {
    return {
      message: 'Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)',
      valid: false,
    };
  }

  return { valid: true };
};
