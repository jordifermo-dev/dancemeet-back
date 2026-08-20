/** Strips diacritics (accented vowels, tildes, ...) via Unicode NFD
 * decomposition - MongoDB's $regex has no accent-insensitive mode (collation
 * only affects comparison/sort operators, not regex matching), so name
 * search normalizes both sides in application code instead. Filters out
 * codepoints 0x0300-0x036F (Unicode's "Combining Diacritical Marks" block,
 * which NFD decomposition splits accented letters into) by numeric range,
 * not a regex literal, so the source file never has to embed a raw
 * combining-mark byte itself. */
export function stripDiacritics(input: string): string {
  return Array.from(input.normalize('NFD'))
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code < 0x0300 || code > 0x036f;
    })
    .join('');
}
