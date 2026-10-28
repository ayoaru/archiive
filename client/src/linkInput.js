// Checks and normalizes a pasted product link before it's sent, for instant
// feedback. Returns { url } or { error } with a message to show. Mirrors the
// server's rules (server/utils/linkInput.js), which remain the real check.

export const MAX_URL_LENGTH = 2048;

export const normalizeLink = (input) => {
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

    // IP addresses are left to the server, which knows which ones are private
    const host = parsed.hostname.replace(/^\[|\]$/g, "");
    const isIp = /^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(":");
    if (!isIp && (!host.includes(".") || host.endsWith("."))) {
        return { error: "That doesn't look like a store's web address." };
    }

    parsed.hash = "";
    return { url: parsed.toString() };
};
