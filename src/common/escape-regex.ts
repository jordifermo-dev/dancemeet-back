/** Escapes regex metacharacters so user-supplied search text is matched
 * literally in a MongoDB $regex filter, instead of being interpreted as a
 * pattern - untrusted input like "a.*b" or "(a+)+" could otherwise match
 * unintended documents or trigger catastrophic backtracking (ReDoS). */
export function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
