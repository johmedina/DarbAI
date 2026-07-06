import { apiClient } from "./apiClient"

// Mirrors services/language_detect.py — keep in sync if you add a language
// there. Detection and translation both happen on the backend, so the
// result always matches what the model actually produced.
export const LANGUAGE_NAMES: Record<string, string> = {
  en: "English", ar: "Arabic", af: "Afrikaans", bg: "Bulgarian", bn: "Bengali",
  ca: "Catalan", cs: "Czech", cy: "Welsh", da: "Danish",
  de: "German", el: "Greek", es: "Spanish",
  et: "Estonian", fa: "Persian", fi: "Finnish", fr: "French",
  gu: "Gujarati", hi: "Hindi", hr: "Croatian",
  hu: "Hungarian", id: "Indonesian", it: "Italian", ja: "Japanese",
  kn: "Kannada", ko: "Korean", lt: "Lithuanian", lv: "Latvian",
  mk: "Macedonian", ml: "Malayalam", mr: "Marathi", ne: "Nepali",
  nl: "Dutch", no: "Norwegian", pa: "Punjabi", pl: "Polish",
  pt: "Portuguese", ro: "Romanian", ru: "Russian", sk: "Slovak",
  sl: "Slovenian", so: "Somali", sq: "Albanian", sv: "Swedish",
  sw: "Swahili", ta: "Tamil", te: "Telugu", th: "Thai",
  tl: "Tagalog", tr: "Turkish", uk: "Ukrainian", ur: "Urdu",
  vi: "Vietnamese", "zh-cn": "Chinese (Simplified)", "zh-tw": "Chinese (Traditional)",
}

export function languageLabel(code: string): string {
  return LANGUAGE_NAMES[code] ?? code
}

// Every supported language except the detected source. Order follows
// LANGUAGE_NAMES' declaration order (English/Arabic pinned first there),
// not alphabetical — reorder the map above to change menu order.
export function buildTargetLanguages(sourceCode: string): string[] {
  return Object.keys(LANGUAGE_NAMES).filter((c) => c !== sourceCode)
}

export async function detectLanguage(
  text: string,
  token: string | null
): Promise<{ code: string; label: string }> {
  const res = await apiClient.post("/detect-language", { text }, token)
  return { code: res?.data?.language_code, label: res?.data?.language_label }
}

export async function translateText(
  text: string,
  targetLanguageCode: string,
  token: string | null
): Promise<string> {
  const res = await apiClient.post(
    "/translate",
    { text, target_language: targetLanguageCode },
    token
  )
  return res?.data?.translated_text
}