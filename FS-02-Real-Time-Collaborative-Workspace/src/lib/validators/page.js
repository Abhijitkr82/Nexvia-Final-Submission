export const PAGE_TITLE_MAX_LENGTH = 120;

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/;

export function isValidId(value) {
  return typeof value === "string" && ID_PATTERN.test(value);
}

export function validatePageTitle(title) {
  if (typeof title !== "string") {
    return { error: "Page title must be a string" };
  }

  const value = title.trim();

  if (!value) {
    return { error: "Page title cannot be empty" };
  }

  if (value.length > PAGE_TITLE_MAX_LENGTH) {
    return {
      error: `Page title must be at most ${PAGE_TITLE_MAX_LENGTH} characters`,
    };
  }

  if (CONTROL_CHARACTERS.test(value)) {
    return {
      error: "Page title contains invalid characters",
    };
  }

  return { value };
}