// ============================================================================
// ValidationError class with path tracking
// ============================================================================

export class ValidationError extends Error {
  constructor(message, path) {
    super(message);
    this.name = 'ValidationError';
    this.path = path;
  }
}

// ============================================================================
// Helper functions
// ============================================================================

/**
 * Validates that a value matches the expected type
 * @param {*} value - The value to validate
 * @param {string} expectedType - Expected JavaScript type ('string', 'number', 'boolean')
 * @param {string} path - Current validation path for error reporting
 */
function validateType(value, expectedType, path = 'root') {
  if (typeof value !== expectedType) {
    throw new ValidationError(
      `Expected ${expectedType}, got ${typeof value}`,
      path
    );
  }
}

/**
 * Validates an array with a nested validator for items
 * @param {*} value - The value to validate
 * @param {Function} validator - Validator function for each item
 * @param {string} path - Current validation path
 */
function validateArray(value, validator, path = 'root') {
  if (!Array.isArray(value)) {
    throw new ValidationError(
      `Expected array, got ${typeof value}`,
      path
    );
  }

  value.forEach((item, index) => {
    validator(item, `${path}[${index}]`);
  });
}

/**
 * Validates an object against a schema
 * @param {*} value - The value to validate
 * @param {Object} schema - Schema object with field validators
 * @param {string} path - Current validation path
 */
function validateObject(value, schema, path = 'root') {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError(
      `Expected object, got ${Array.isArray(value) ? 'array' : typeof value}`,
      path
    );
  }

  for (const [key, validator] of Object.entries(schema)) {
    const fieldPath = `${path}.${key}`;
    const fieldValue = value[key];

    // Check if field is optional and undefined
    if (fieldValue === undefined && validator.isOptional) {
      continue;
    }

    // Validate the field
    validator(fieldValue, fieldPath);
  }
}

// ============================================================================
// Schema builders
// ============================================================================

/**
 * Creates a string schema validator
 * @param {Object} options - Validation options
 * @param {number} [options.min] - Minimum length
 * @param {number} [options.max] - Maximum length
 * @param {boolean} [options.optional] - Whether the field is optional
 */
export function string(options = {}) {
  const { min, max, optional } = options;

  const validator = (value, path = 'root') => {
    // Handle optional fields
    if (value === undefined && optional) {
      return;
    }

    validateType(value, 'string', path);

    if (min !== undefined && value.length < min) {
      throw new ValidationError(
        `String length must be at least ${min} characters`,
        path
      );
    }

    if (max !== undefined && value.length > max) {
      throw new ValidationError(
        `String length must be at most ${max} characters`,
        path
      );
    }
  };

  validator.isOptional = optional;
  return validator;
}

/**
 * Creates a number schema validator
 * @param {Object} options - Validation options
 * @param {number} [options.min] - Minimum value (inclusive)
 * @param {number} [options.max] - Maximum value (inclusive)
 * @param {boolean} [options.optional] - Whether the field is optional
 */
export function number(options = {}) {
  const { min, max, optional } = options;

  const validator = (value, path = 'root') => {
    // Handle optional fields
    if (value === undefined && optional) {
      return;
    }

    validateType(value, 'number', path);

    if (!Number.isFinite(value)) {
      throw new ValidationError(
        `Expected a finite number`,
        path
      );
    }

    if (min !== undefined && value < min) {
      throw new ValidationError(
        `Value must be at least ${min}`,
        path
      );
    }

    if (max !== undefined && value > max) {
      throw new ValidationError(
        `Value must be at most ${max}`,
        path
      );
    }
  };

  validator.isOptional = optional;
  return validator;
}

/**
 * Creates a boolean schema validator
 * @param {Object} options - Validation options
 * @param {boolean} [options.optional] - Whether the field is optional
 */
export function boolean(options = {}) {
  const { optional } = options;

  const validator = (value, path = 'root') => {
    // Handle optional fields
    if (value === undefined && optional) {
      return;
    }

    validateType(value, 'boolean', path);
  };

  validator.isOptional = optional;
  return validator;
}

/**
 * Creates an enum schema validator
 * @param {Array} values - Array of allowed values
 * @param {Object} options - Validation options
 * @param {boolean} [options.optional] - Whether the field is optional
 */
export function createEnum(values, options = {}) {
  const { optional } = options;

  const validator = (value, path = 'root') => {
    // Handle optional fields
    if (value === undefined && optional) {
      return;
    }

    if (!values.includes(value)) {
      throw new ValidationError(
        `Value must be one of: ${values.join(', ')}`,
        path
      );
    }
  };

  validator.isOptional = optional;
  return validator;
}

/**
 * Creates an array schema validator
 * @param {Function} itemValidator - Validator function for each item
 */
export function array(itemValidator) {
  const validator = (value, path = 'root') => {
    validateArray(value, itemValidator, path);
  };

  return validator;
}

/**
 * Creates an object schema validator
 * @param {Object} schema - Schema object with field validators
 */
export function object(schema) {
  const validator = (value, path = 'root') => {
    validateObject(value, schema, path);
  };

  return validator;
}

// ============================================================================
// Game-specific schemas
// ============================================================================

/**
 * Player schema - validates player data
 */
export const playerSchema = object({
  name: string({ min: 1, max: 50 }),
  characterName: string({ min: 1, max: 100 }),
  class: string({ optional: true }),
  level: number({ min: 1, max: 20, optional: true }),
});

/**
 * Create game schema - validates new game creation data
 */
export const createGameSchema = object({
  gameName: string({ min: 1, max: 100 }),
  maxPlayers: number({ min: 2, max: 8 }),
});

/**
 * Chat message schema - validates chat messages
 */
export const chatMessageSchema = object({
  content: string({ min: 1, max: 2000 }),
  type: createEnum(['text', 'roll', 'npc', 'event']),
});

/**
 * Dice roll schema - validates dice roll requests
 */
export const diceRollSchema = object({
  diceType: createEnum([4, 6, 8, 10, 12, 20]),
  count: number({ min: 1, max: 10 }),
  modifier: number({ optional: true }),
});

/**
 * NPC schema - validates non-player character data
 */
export const npcSchema = object({
  name: string({ min: 1, max: 100 }),
  description: string({ optional: true }),
  role: createEnum(['friendly', 'neutral', 'hostile']),
});

// ============================================================================
// Validate wrapper function
// ============================================================================

/**
 * Validates data against a schema
 * @param {Function} schema - Schema validator function
 * @param {*} data - Data to validate
 * @returns {{ success: boolean, data?: *, error?: string }}
 */
export function validate(schema, data) {
  try {
    schema(data);
    return { success: true, data };
  } catch (error) {
    if (error instanceof ValidationError) {
      return { success: false, error: error.message };
    }
    throw error;
  }
}

// ============================================================================
// Default export
// ============================================================================

export default {
  string,
  number,
  boolean,
  enum: createEnum,
  createEnum,
  array,
  object,
  validate,
  ValidationError,
  playerSchema,
  createGameSchema,
  chatMessageSchema,
  diceRollSchema,
  npcSchema,
};
