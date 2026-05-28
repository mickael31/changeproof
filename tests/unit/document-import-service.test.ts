import { describe, expect, it, vi } from "vitest"
import {
  crawlImportedUrlPages,
  extractReadableTextFromHtml,
  normalizeImportedText,
  resolveImportedDocumentContent,
} from "@/lib/documents/import-service"

describe("document import service", () => {
  it("normalizes pasted text without changing the meaning", async () => {
    const result = await resolveImportedDocumentContent({
      sourceType: "TEXT",
      textContent: "  Titre\n\n\nContenu de documentation assez long pour etre indexe.  ",
    })

    expect(result.content).toBe("Titre\n\nContenu de documentation assez long pour etre indexe.")
    expect(result.sourceMeta.sourceType).toBe("TEXT")
  })

  it("extracts readable content and title from HTML", () => {
    const result = extractReadableTextFromHtml(`
      <html>
        <head><title>Guide API</title><style>.x{color:red}</style></head>
        <body><h1>Authentification</h1><script>alert(1)</script><p>Token &amp; scopes.</p></body>
      </html>
    `)

    expect(result.title).toBe("Guide API")
    expect(result.text).toContain("Authentification")
    expect(result.text).toContain("Token & scopes.")
    expect(result.text).not.toContain("alert")
  })

  it("loads public URL content through the injected fetcher", async () => {
    const fetcher = vi.fn(async () => new Response(
      "<html><head><title>Runbook</title></head><body><p>Procedure de rollback applicatif documentee.</p></body></html>",
      { headers: { "content-type": "text/html; charset=utf-8" } },
    ))

    const result = await resolveImportedDocumentContent({
      sourceType: "URL",
      sourceUrl: "https://docs.example.com/runbook",
      fetcher,
    })

    expect(fetcher).toHaveBeenCalledWith("https://docs.example.com/runbook", expect.objectContaining({
      cache: "no-store",
      redirect: "error",
    }))
    expect(result.sourceTitle).toBe("Runbook")
    expect(result.content).toContain("Procedure de rollback applicatif documentee.")
    expect(result.sourceMeta.sourceUrl).toBe("https://docs.example.com/runbook")
  })

  it("rejects private URL targets before fetching", async () => {
    const fetcher = vi.fn()

    await expect(resolveImportedDocumentContent({
      sourceType: "URL",
      sourceUrl: "http://localhost:3000/private",
      fetcher,
    })).rejects.toThrow("locales")
    expect(fetcher).not.toHaveBeenCalled()
  })

  it("rejects text that is too short to vectorize", async () => {
    await expect(resolveImportedDocumentContent({
      sourceType: "TEXT",
      textContent: "trop court",
    })).rejects.toThrow("trop court")
  })

  it("keeps paragraph spacing stable", () => {
    expect(normalizeImportedText("A\r\n\r\n\r\nB  \nC")).toBe("A\n\nB\nC")
  })

  it("crawls same-origin HTML pages and returns one imported document per page", async () => {
    const pages = new Map<string, string>([
      [
        "https://docs.example.com",
        `
          <html>
            <head><title>Accueil docs</title></head>
            <body>
              <main>Documentation racine assez longue pour creer un document.</main>
              <a href="/guide">Guide</a>
              <a href="https://docs.example.com/guide#intro">Guide duplicate</a>
              <a href="https://other.example.com/ignore">Externe</a>
              <a href="/logo.png">Asset</a>
            </body>
          </html>
        `,
      ],
      [
        "https://docs.example.com/guide",
        `
          <html>
            <head><title>Guide produit</title></head>
            <body>
              <article>Guide produit avec procedure complete par page importee.</article>
              <a href="/advanced">Avance</a>
            </body>
          </html>
        `,
      ],
      [
        "https://docs.example.com/advanced",
        `
          <html>
            <head><title>Guide avance</title></head>
            <body><p>Configuration avancee documentee avec suffisamment de contenu utile.</p></body>
          </html>
        `,
      ],
    ])

    const fetcher = vi.fn(async (url: string) => {
      const html = pages.get(url)
      if (!html) return new Response("not found", { status: 404 })
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } })
    })

    const result = await crawlImportedUrlPages({
      sourceUrl: "https://docs.example.com",
      fetcher,
      maxPages: 10,
    })

    expect(result.map((page) => page.sourceTitle)).toEqual([
      "Accueil docs",
      "Guide produit",
      "Guide avance",
    ])
    expect(fetcher).toHaveBeenCalledTimes(3)
    expect(fetcher).not.toHaveBeenCalledWith("https://other.example.com/ignore", expect.anything())
    expect(fetcher).not.toHaveBeenCalledWith("https://docs.example.com/logo.png", expect.anything())
  })

  it("respects the crawl page limit", async () => {
    const fetcher = vi.fn(async (url: string) => {
      const title = url.endsWith("/one") ? "One" : "Root"
      const href = url.endsWith("/one") ? "/two" : "/one"
      return new Response(
        `<html><head><title>${title}</title></head><body><p>Contenu long pour page ${title} importee.</p><a href="${href}">Next</a></body></html>`,
        { headers: { "content-type": "text/html" } },
      )
    })

    const result = await crawlImportedUrlPages({
      sourceUrl: "https://docs.example.com",
      fetcher,
      maxPages: 2,
    })

    expect(result).toHaveLength(2)
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
