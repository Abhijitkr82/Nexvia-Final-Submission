export const COMMENT_MAX_LENGTH = 2000;

// Control characters except tab (\u0009), line feed (\u000A), carriage return (\u000D).
// eslint-disable-next-line no-control-regex
const DISALLOWED_CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;

/**
 * Validates comment text.
 * Returns { value } (trimmed, line endings normalized to \n) or { error }.
 */
export function validateCommentContent(content) {
  if (typeof content !== "string") {
    return { error: "Comment content must be a string" };
  }

  const value = content.replace(/\r\n?/g, "\n").trim();

  if (!value) {
    return { error: "Comment content cannot be empty" };
  }

  if (value.length > COMMENT_MAX_LENGTH) {
    return {
      error: `Comment must be at most ${COMMENT_MAX_LENGTH} characters`,
    };
  }

  if (DISALLOWED_CONTROL_CHARACTERS.test(value)) {
    return { error: "Comment contains invalid characters" };
  }

  return { value };
}

/**
 * Validates the `resolved` flag. Must be a real boolean (not "true" or 1).
 * Returns { value } or { error }.
 */
export function validateResolved(resolved) {
  if (typeof resolved !== "boolean") {
    return { error: "resolved must be true or false" };
  }

  return { value: resolved };
}