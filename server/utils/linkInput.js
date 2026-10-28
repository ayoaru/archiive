const net = require("net");
const { isPrivateAddress } = require("./safeFetch");

// Checks and normalizes a product link the user pasted. Returns { url } on
// success or { error } with a message that's safe to show them. The client has
// a copy of these rules (client/src/linkInput.js) for instant feedback; keep
// the two in step. Fetching itself is still locked down by safeFetch.

const MAX_URL_LENGTH = 2048;

const normalizeLink = (input) => {
  if (typeof input !== "string" || !input.trim()) {
    return { error: "Paste a link to the product page." };
  }

  let text = input.trim();
  if (text.length > MAX_URL_LENGTH) return { error: "That link is too long. Copy it again from the store's page." };

  // Shared links often arrive inside other text ("Look at this https://…")
  const embedded = text.match(/https?:\/\/[^\s<>"'`]+/i);
  if (embedded) text = embedded[0];

  // Bare addresses like "store.com/p/123" (or "host:8080/x") get a scheme;
  // "scheme://…" and non-web schemes like "javascript:" are left for the check below
  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(text) || /^(javascript|data|vbscript|mailto|file|about|blob):/i.test(text);
  if (!hasScheme) text = `https://${text}`;

  let parsed;
  try {
    parsed = new URL(text);
  } catch {
    return { error: "That doesn't look like a link. Check it and try again." };
  }

  // Stores serve https; plain http links are upgraded rather than refused
  if (parsed.protocol === "http:") parsed.protocol = "https:";
  if (parsed.protocol !== "https:") return { error: "Only web links (starting with https://) are supported." };
  if (parsed.username || parsed.password) return { error: "Links with a username or password aren't supported." };

  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host)) {
    if (isPrivateAddress(host)) return { error: "That link points to a private network address." };
  } else if (!host.includes(".") || host.endsWith(".")) {
    return { error: "That doesn't look like a store's web address." };
  }

  parsed.hash = "";
  return { url: parsed.toString() };
};

module.exports = { normalizeLink, MAX_URL_LENGTH };
