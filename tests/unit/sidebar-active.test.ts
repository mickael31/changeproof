import { describe, expect, it } from "vitest"
import { getActiveNavHref } from "@/components/layout/sidebar-active"

const items = [
  { href: "/audit" },
  { href: "/audit/logs" },
  { href: "/settings/integrations" },
]

describe("getActiveNavHref", () => {
  it("prefere la route active la plus specifique", () => {
    expect(getActiveNavHref("/audit/logs", items)).toBe("/audit/logs")
  })

  it("garde le parent actif pour une page detail", () => {
    expect(getActiveNavHref("/audit/evidence-123", items)).toBe("/audit")
  })

  it("ne matche pas les routes voisines par simple prefixe", () => {
    expect(getActiveNavHref("/audit-log", items)).toBeUndefined()
  })
})
