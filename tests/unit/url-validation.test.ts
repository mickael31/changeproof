import { afterEach, describe, expect, it } from "vitest"
import { validateExternalHttpUrl } from "@/lib/security/url"

const originalAllowPrivate = process.env.ALLOW_PRIVATE_CALLBACK_URLS

afterEach(() => {
  if (originalAllowPrivate === undefined) {
    delete process.env.ALLOW_PRIVATE_CALLBACK_URLS
  } else {
    process.env.ALLOW_PRIVATE_CALLBACK_URLS = originalAllowPrivate
  }
})

describe("validateExternalHttpUrl", () => {
  it("accepts public HTTP(S) URLs and normalizes trailing slash", () => {
    expect(validateExternalHttpUrl("https://api.example.com/")).toEqual({
      ok: true,
      url: "https://api.example.com",
    })
  })

  it("rejects local and private network targets by default", () => {
    expect(validateExternalHttpUrl("http://localhost:3000").ok).toBe(false)
    expect(validateExternalHttpUrl("http://127.0.0.1:3000").ok).toBe(false)
    expect(validateExternalHttpUrl("http://10.0.0.5").ok).toBe(false)
    expect(validateExternalHttpUrl("http://192.168.1.10").ok).toBe(false)
    expect(validateExternalHttpUrl("http://[::1]").ok).toBe(false)
  })

  it("rejects non-HTTP protocols and embedded credentials", () => {
    expect(validateExternalHttpUrl("file:///etc/passwd").ok).toBe(false)
    expect(validateExternalHttpUrl("https://user:pass@example.com").ok).toBe(false)
  })

  it("can explicitly allow private callback URLs for controlled deployments", () => {
    process.env.ALLOW_PRIVATE_CALLBACK_URLS = "true"

    expect(validateExternalHttpUrl("http://127.0.0.1:11434")).toEqual({
      ok: true,
      url: "http://127.0.0.1:11434",
    })
  })
})
