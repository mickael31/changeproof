import { validateExternalHttpUrl } from "@/lib/security/url"

export const importSourceTypes = ["TEXT", "URL", "PDF"] as const
export type ImportSourceType = (typeof importSourceTypes)[number]

const MAX_TEXT_CHARS = 400_000
const MAX_URL_BYTES = 2 * 1024 * 1024
const MAX_PDF_BYTES = 10 * 1024 * 1024
const DEFAULT_CRAWL_PAGE_LIMIT = 25
const MAX_CRAWL_PAGE_LIMIT = 100
const URL_FETCH_TIMEOUT_MS = 15_000

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>

type ResolveInput =
  | { sourceType: "TEXT"; textContent: string }
  | { sourceType: "URL"; sourceUrl: string; fetcher?: Fetcher }
  | { sourceType: "PDF"; fileName: string; pdfBuffer: ArrayBuffer }

export interface ImportedDocumentContent {
  content: string
  sourceTitle?: string
  sourceMeta: {
    sourceType: ImportSourceType
    sourceUrl?: string
    fileName?: string
    contentType?: string | null
    bytes?: number
    characters: number
  }
}

export interface CrawlImportedUrlPagesInput {
  sourceUrl: string
  fetcher?: Fetcher
  maxPages?: number
}

type ImportedUrlPage = ImportedDocumentContent & {
  discoveredLinks: string[]
}

export function normalizeImportedText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

export function extractReadableTextFromHtml(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
  const body = html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")

  return {
    text: normalizeImportedText(decodeHtmlEntities(body)),
    title: title ? normalizeImportedText(decodeHtmlEntities(title)) : undefined,
  }
}

export async function resolveImportedDocumentContent(input: ResolveInput): Promise<ImportedDocumentContent> {
  if (input.sourceType === "TEXT") {
    const content = enforceTextContent(input.textContent)
    return {
      content,
      sourceMeta: {
        sourceType: "TEXT",
        characters: content.length,
      },
    }
  }

  if (input.sourceType === "PDF") {
    if (input.pdfBuffer.byteLength > MAX_PDF_BYTES) {
      throw new Error("Le PDF dépasse la limite de 10 Mo.")
    }

    const content = enforceTextContent(await extractPdfText(input.pdfBuffer))
    return {
      content,
      sourceTitle: input.fileName.replace(/\.pdf$/i, ""),
      sourceMeta: {
        sourceType: "PDF",
        fileName: safeFileName(input.fileName),
        contentType: "application/pdf",
        bytes: input.pdfBuffer.byteLength,
        characters: content.length,
      },
    }
  }

  return stripDiscoveredLinks(await resolveImportedUrlPage(input.sourceUrl, input.fetcher ?? fetch))
}

export async function crawlImportedUrlPages(input: CrawlImportedUrlPagesInput): Promise<ImportedDocumentContent[]> {
  const validated = validateExternalHttpUrl(input.sourceUrl)
  if (!validated.ok) {
    throw new Error(validated.error)
  }

  const maxPages = normalizeCrawlLimit(input.maxPages)
  const fetcher = input.fetcher ?? fetch
  const queue = [validated.url]
  const seen = new Set(queue)
  const imported: ImportedDocumentContent[] = []

  while (queue.length > 0 && imported.length < maxPages) {
    const url = queue.shift()
    if (!url) continue

    try {
      const page = await resolveImportedUrlPage(url, fetcher)
      imported.push(stripDiscoveredLinks(page))

      for (const link of page.discoveredLinks) {
        if (seen.has(link) || queue.length + imported.length >= maxPages) continue
        seen.add(link)
        queue.push(link)
      }
    } catch (error) {
      if (imported.length === 0) throw error
    }
  }

  if (imported.length === 0) {
    throw new Error("Aucune page exploitable n'a été trouvée.")
  }

  return imported
}

async function resolveImportedUrlPage(sourceUrl: string, fetcher: Fetcher): Promise<ImportedUrlPage> {
  const validated = validateExternalHttpUrl(sourceUrl)
  if (!validated.ok) {
    throw new Error(validated.error)
  }

  const { bytes, contentType } = await fetchUrlBytes(validated.url, fetcher)
  const isPdf = contentType?.includes("application/pdf") || validated.url.toLowerCase().endsWith(".pdf")
  if (isPdf) {
    const content = enforceTextContent(await extractPdfText(bytes))
    return {
      content,
      sourceTitle: titleFromUrl(validated.url),
      sourceMeta: {
        sourceType: "URL",
        sourceUrl: validated.url,
        contentType,
        bytes: bytes.byteLength,
        characters: content.length,
      },
      discoveredLinks: [],
    }
  }

  assertSupportedTextContentType(contentType)

  const rawText = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
  const isHtml = contentType?.includes("html") ?? looksLikeHtml(rawText)
  const extracted = isHtml
    ? extractReadableTextFromHtml(rawText)
    : { text: normalizeImportedText(rawText), title: undefined }
  const content = enforceTextContent(extracted.text)

  return {
    content,
    sourceTitle: extracted.title ?? titleFromUrl(validated.url),
    sourceMeta: {
      sourceType: "URL",
      sourceUrl: validated.url,
      contentType,
      bytes: bytes.byteLength,
      characters: content.length,
    },
    discoveredLinks: isHtml ? extractSameOriginPageLinks(rawText, validated.url) : [],
  }
}

async function fetchUrlBytes(url: string, fetcher: Fetcher) {
  const response = await fetcher(url, {
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(URL_FETCH_TIMEOUT_MS),
  })

  if (!response.ok) {
    throw new Error(`Impossible de charger l'URL (${response.status}).`)
  }

  const contentType = response.headers.get("content-type")
  const contentLength = response.headers.get("content-length")
  if (contentLength && Number(contentLength) > MAX_URL_BYTES) {
    throw new Error("La page distante dépasse la limite de 2 Mo.")
  }

  const bytes = await response.arrayBuffer()
  if (bytes.byteLength > MAX_URL_BYTES) {
    throw new Error("La page distante dépasse la limite de 2 Mo.")
  }

  return { bytes, contentType }
}

function enforceTextContent(value: string) {
  const content = normalizeImportedText(value)

  if (content.length < 20) {
    throw new Error("Le contenu extrait est trop court pour être vectorisé.")
  }

  if (content.length > MAX_TEXT_CHARS) {
    throw new Error("Le contenu dépasse la limite de 400 000 caractères.")
  }

  return content
}

function assertSupportedTextContentType(contentType: string | null) {
  if (!contentType) return

  const normalized = contentType.toLowerCase()
  const supported =
    normalized.startsWith("text/") ||
    normalized.includes("application/json") ||
    normalized.includes("application/xml") ||
    normalized.includes("application/xhtml+xml")

  if (!supported) {
    throw new Error("Ce type de contenu distant n'est pas pris en charge.")
  }
}

async function extractPdfText(pdfBuffer: ArrayBuffer) {
  await import("pdf-parse/worker")
  const { PDFParse } = await import("pdf-parse")
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) })

  try {
    const result = await parser.getText()
    return result.text
  } finally {
    await parser.destroy()
  }
}

function safeFileName(value: string) {
  return value.split(/[\\/]/).pop()?.slice(0, 200) || "document.pdf"
}

function titleFromUrl(value: string) {
  const parsed = new URL(value)
  const segment = parsed.pathname.split("/").filter(Boolean).pop()
  return decodeURIComponent(segment || parsed.hostname).replace(/\.[a-z0-9]+$/i, "")
}

function extractSameOriginPageLinks(html: string, currentUrl: string) {
  const current = new URL(currentUrl)
  const links = new Set<string>()
  const matches = html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)

  for (const match of matches) {
    const href = decodeHtmlEntities(match[2]).trim()
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) {
      continue
    }

    try {
      const next = new URL(href, current)
      next.hash = ""

      if (next.origin !== current.origin) continue
      if (!["http:", "https:"].includes(next.protocol)) continue
      if (isLikelyAssetPath(next.pathname)) continue

      links.add(next.toString().replace(/\/$/, ""))
    } catch {
      continue
    }
  }

  return Array.from(links)
}

function isLikelyAssetPath(pathname: string) {
  return /\.(avif|bmp|css|csv|doc|docx|gif|ico|jpeg|jpg|js|json|mp3|mp4|ogg|png|ppt|pptx|svg|webm|webp|xls|xlsx|zip)$/i.test(pathname)
}

function looksLikeHtml(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function normalizeCrawlLimit(value: number | undefined) {
  if (!value || !Number.isFinite(value)) return DEFAULT_CRAWL_PAGE_LIMIT
  return Math.max(1, Math.min(Math.floor(value), MAX_CRAWL_PAGE_LIMIT))
}

function stripDiscoveredLinks(page: ImportedUrlPage): ImportedDocumentContent {
  const { discoveredLinks: _, ...document } = page
  return document
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;|&apos;/gi, "'")
}
