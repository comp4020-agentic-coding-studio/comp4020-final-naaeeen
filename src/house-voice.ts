import { HouseError } from "./house-contract.ts";

/** A stored destination is an external link, not an authenticated voice session. */
export function parseDiscordDestination(input: unknown): string | null {
  const invalid = () => { throw new HouseError("INVALID_INPUT", "Use an HTTPS Discord invite or server channel link, or leave it empty to remove it."); };
  if (typeof input !== "string" || input.length > 512) return invalid();
  const value = input.trim();
  if (!value) return null;
  if (value.includes("%") || /[\u0000-\u0020\u007f\\]/u.test(value)) return invalid();
  let url: URL;
  try { url = new URL(value); } catch { return invalid(); }
  if (url.protocol !== "https:" || url.username || url.password || url.port || url.search || url.hash) return invalid();
  const invite = /^\/[A-Za-z0-9_-]{2,128}\/?$/;
  const serverChannel = /^\/channels\/[1-9][0-9]{0,19}\/[1-9][0-9]{0,19}\/?$/;
  const accepted = (url.hostname === "discord.gg" && invite.test(url.pathname))
    || (url.hostname === "discord.com" && (url.pathname.startsWith("/invite/") && invite.test(url.pathname.slice(7)) || serverChannel.test(url.pathname)));
  if (!accepted) return invalid();
  return url.href;
}
