import { ObjectId } from 'mongodb';
import { MongoServerError } from 'mongodb';
import {
  InvalidIdException,
  DuplicateKeyException,
  DatabaseException,
} from './exceptions';

/**
 * Returns true when the string is a valid Mongo ObjectId.
 */
export function isValidObjectId(id: string): boolean {
  return typeof id === 'string' && /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Validates an id and throws InvalidIdException when malformed.
 * Returns a proper ObjectId otherwise.
 */
export function toObjectId(id: string, resource: string): ObjectId {
  if (!isValidObjectId(id)) {
    throw new InvalidIdException(resource, id);
  }
  return new ObjectId(id);
}

/**
 * Detects a MongoDB duplicate-key error (code 11000).
 */
export function isDuplicateKeyError(err: unknown): boolean {
  return (
    err instanceof MongoServerError ||
    (typeof err === 'object' &&
      err !== null &&
      (err as { code?: number }).code === 11000)
  );
}

/**
 * Wraps a database operation, translating known driver errors into
 * domain exceptions so the rest of the stack never sees raw driver
 * details. Unknown errors are rethrown as DatabaseException.
 */
export async function handleDbOperation<T>(
  resource: string,
  operation: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof InvalidIdException) {
      throw err;
    }
    if (isDuplicateKeyError(err)) {
      throw new DuplicateKeyException(resource);
    }
    throw new DatabaseException(operation, err);
  }
}
