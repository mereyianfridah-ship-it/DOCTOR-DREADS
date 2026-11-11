/** Only same-site relative paths are accepted as a post-login destination (prevents open redirects). */
export function safeRedirect(from: unknown): string {
  return typeof from === "string" && from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/\\") ? from : "/account";
}
