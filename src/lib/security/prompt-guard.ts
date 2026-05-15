const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|above|prior)\s+(instructions?|prompts?|messages?)/i,
  /disregard\s+(all\s+)?(previous|above)\s+(instructions?|prompts?)/i,
  /forget\s+(all\s+)?(previous|earlier)\s+(instructions?|context)/i,
  /you\s+are\s+now\s+(a\s+|an\s+)?(different|new)\s+(ai|assistant|model|system)/i,
  /system\s*(:|：)\s*you\s+are/i,
  /<\|im_start\|>/i,
  /<\|im_end\|>/i,
  /\[system\].*\[\/system\]/i,
  /\[INST\].*\[\/INST\]/i,
  /DAN\s+(mode|prompt|jailbreak)/i,
  /pretend\s+(you\s+are|to\s+be)/i,
]

const SENSITIVE_PATTERNS = [
  /(?:api[_-]?key|apikey|secret|token|password|credential)[\s:=]+['"]?[a-zA-Z0-9_\-.]{20,}['"]?/gi,
  /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----/,
  /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/,
]

export interface SanitizeResult {
  sanitized: string
  warnings: string[]
  blocked: boolean
}

export function sanitizeAIInput(text: string): SanitizeResult {
  const warnings: string[] = []
  let sanitized = text
  let blocked = false

  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) {
      warnings.push("Tentative d'injection de prompt detectee (pattern: " + pattern.source.slice(0, 40) + "...)")
      blocked = true
      sanitized = sanitized.replace(pattern, "[CONTENU BLOQUE - injection detectee]")
    }
  }

  for (const pattern of SENSITIVE_PATTERNS) {
    if (pattern.test(text)) {
      warnings.push("Donnees potentiellement sensibles detectees dans l'entree")
      sanitized = sanitized.replace(pattern, "[DONNEE SENSIBLE MASQUEE]")
    }
  }

  if (sanitized.length > 50_000) {
    warnings.push("Entree tronquee a 50 000 caracteres")
    sanitized = sanitized.slice(0, 50_000) + "\n[TRONQUE]"
  }

  return { sanitized, warnings, blocked }
}

export function logSuspiciousActivity(userId: string, warnings: string[]): void {
  if (warnings.length > 0) {
    console.warn("[SECURITY] Suspicious activity from user " + userId + ":", warnings)
  }
}
