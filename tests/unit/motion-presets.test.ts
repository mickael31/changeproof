import { describe, expect, it } from "vitest"
import { buildMotionPreset, prefersReducedMotionQuery } from "@/components/motion/motion-presets"

describe("motion presets", () => {
  it("keeps professional animation defaults for standard motion", () => {
    expect(buildMotionPreset(false)).toEqual({
      distance: 18,
      duration: 0.62,
      ease: "power3.out",
      stagger: 0.045,
    })
  })

  it("removes movement and timing for reduced motion users", () => {
    expect(buildMotionPreset(true)).toEqual({
      distance: 0,
      duration: 0,
      ease: "none",
      stagger: 0,
    })
  })

  it("exports the canonical reduced motion media query", () => {
    expect(prefersReducedMotionQuery).toBe("(prefers-reduced-motion: reduce)")
  })
})
