import sanitizeHtml from "sanitize-html";

export function sanitizePlainText(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [],
    allowedAttributes: {},
  }).trim();
}
