export const prefersReducedMotionQuery = "(prefers-reduced-motion: reduce)"

export interface MotionPreset {
  distance: number
  duration: number
  ease: string
  stagger: number
}

export function buildMotionPreset(reducedMotion: boolean): MotionPreset {
  if (reducedMotion) {
    return {
      distance: 0,
      duration: 0,
      ease: "none",
      stagger: 0,
    }
  }

  return {
    distance: 18,
    duration: 0.62,
    ease: "power3.out",
    stagger: 0.045,
  }
}
