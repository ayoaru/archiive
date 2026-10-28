const dns = require("dns");
const net = require("net");
const https = require("https");
const axios = require("axios");

// Fetches a remote image on a user's behalf (scraped product photos) without
// letting the server be pointed at internal hosts. Locked down to:
// - https only, including every redirect hop (max 3)
// - public IP addresses only, checked at connect time so a hostname can't
//   resolve to a private address after validation (DNS rebinding)
// - image content types, 10 MB max, 10 s timeout

const MAX_BYTES = 10 * 1024 * 1024;

const ipv4ToInt = (ip) => ip.split(".").reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;

const PRIVATE_V4 = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
  ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
  ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
].map(([base, bits]) => [ipv4ToInt(base), bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0]);

const isPrivateAddress = (address) => {
  if (net.isIPv4(address)) {
    const n = ipv4ToInt(address);
    return PRIVATE_V4.some(([base, mask]) => ((n & mask) >>> 0) === base);
  }
  const ip = address.toLowerCase();
  if (ip.startsWith("::ffff:")) return isPrivateAddress(ip.slice(7)); // IPv4-mapped
  return (
    ip === "::" || ip === "::1" ||
    /^f[cd]/.test(ip) ||       // fc00::/7 unique local
    /^fe[89ab]/.test(ip) ||    // fe80::/10 link local
    /^ff/.test(ip) ||          // multicast
    ip.startsWith("64:ff9b:") ||
    ip.startsWith("2001:db8:")
  );
};

// DNS lookup that refuses to hand back any private address
const publicOnlyLookup = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err);
    if (!addresses.length || addresses.some((a) => isPrivateAddress(a.address))) {
      return callback(new Error(`Refusing to fetch from a private address (${hostname})`));
    }
    if (options.all) return callback(null, addresses);
    callback(null, addresses[0].address, addresses[0].family);
  });
};

const httpsAgent = new https.Agent({ lookup: publicOnlyLookup });

// Node skips DNS lookup for IP-literal hosts, so check those directly
const assertSafeHost = (hostname) => {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (net.isIP(host) && isPrivateAddress(host)) {
    throw new Error(`Refusing to fetch from a private address (${host})`);
  }
};

const assertHttps = (url) => {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:") throw new Error("Only https image URLs are allowed");
  assertSafeHost(parsed.hostname);
  return parsed;
};

// GET with all the restrictions above. Used for images, product pages and
// Shopify's JSON, all of which come from user-supplied URLs.
const safeGet = (url, { accept = "*/*", responseType = "text", maxBytes = MAX_BYTES } = {}) => {
  assertHttps(url);
  return axios.get(url, {
    responseType,
    httpsAgent,
    proxy: false,
    timeout: 10000,
    maxRedirects: 3,
    maxContentLength: maxBytes,
    maxBodyLength: maxBytes,
    beforeRedirect: (options) => {
      if (options.protocol !== "https:") throw new Error("Redirected to a non-https URL");
      assertSafeHost(options.hostname);
    },
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      Accept: accept,
    },
  });
};

const fetchRemoteImage = async (url) => {
  const response = await safeGet(url, { accept: "image/*", responseType: "arraybuffer" });

  const contentType = String(response.headers["content-type"] || "").split(";")[0].trim();
  if (!contentType.startsWith("image/")) throw new Error("URL did not return an image");

  return { buffer: Buffer.from(response.data), contentType };
};

module.exports = { safeGet, fetchRemoteImage, isPrivateAddress };
