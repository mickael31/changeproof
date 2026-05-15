import { describe, it, expect } from "vitest"
import { computeDiff } from "@/lib/documents/diff-engine"

describe("Diff Engine", () => {
  it("should detect unchanged lines", () => {
    const diff = computeDiff("hello\nworld", "hello\nworld")
    expect(diff.every((d) => d.type === "unchanged")).toBe(true)
    expect(diff).toHaveLength(2)
  })

  it("should detect added lines", () => {
    const diff = computeDiff("hello", "hello\nworld")
    const added = diff.filter((d) => d.type === "added")
    expect(added).toHaveLength(1)
    expect(added[0].content).toBe("world")
  })

  it("should detect removed lines", () => {
    const diff = computeDiff("hello\nworld", "hello")
    const removed = diff.filter((d) => d.type === "removed")
    expect(removed).toHaveLength(1)
    expect(removed[0].content).toBe("world")
  })

  it("should handle empty diff", () => {
    const diff = computeDiff("", "")
    expect(diff.length).toBeLessThanOrEqual(1) // split("") gives [""]
  })
})
