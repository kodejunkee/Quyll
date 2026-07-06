/**
 * UUIDv7 generation utility.
 *
 * UUIDv7 is time-ordered, which makes it ideal for primary keys in SQLite —
 * inserts are always append-only on the B-tree, and IDs sort chronologically.
 */

import { v7 as uuidv7 } from 'uuid';
import type { UUID } from '@/types/common';

/**
 * Generate a new UUIDv7 string.
 *
 * @returns A time-ordered UUID suitable for use as a database primary key.
 */
export function generateId(): UUID {
  return uuidv7() as UUID;
}

/**
 * Validate that a string is a well-formed UUID (any version).
 *
 * @param value - The string to test.
 * @returns `true` when the string matches the 8-4-4-4-12 hex format.
 */
export function isValidUUID(value: string): value is UUID {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Cast a known-valid UUID string to the branded `UUID` type.
 * Throws if the value is not a valid UUID.
 *
 * @param value - A string that should already be a UUID.
 * @returns The same string branded as `UUID`.
 */
export function toUUID(value: string): UUID {
  if (!isValidUUID(value)) {
    throw new Error(`Invalid UUID: ${value}`);
  }
  return value;
}
