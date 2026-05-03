/** Normalize user-entered social values to a safe https URL for href. */
export function socialHref(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  let s = raw.trim()
  if (s.startsWith("http://") || s.startsWith("https://")) return s
  if (s.startsWith("//")) return `https:${s}`
  return `https://${s.replace(/^\/+/, "")}`
}
