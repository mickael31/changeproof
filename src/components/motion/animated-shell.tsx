"use client"

import { type ReactNode, useRef } from "react"
import { usePathname } from "next/navigation"
import gsap from "gsap"
import { useGSAP } from "@gsap/react"
import { cn } from "@/lib/utils"
import { buildMotionPreset, prefersReducedMotionQuery } from "@/components/motion/motion-presets"

if (typeof window !== "undefined") {
  gsap.registerPlugin(useGSAP)
}

interface AnimatedShellProps {
  children: ReactNode
  className?: string
}

type MotionConditions = {
  isDesktop?: boolean
  reducedMotion?: boolean
}

export function AnimatedShell({ children, className }: AnimatedShellProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const pathname = usePathname()

  useGSAP(
    () => {
      const root = containerRef.current
      if (!root) return

      const mm = gsap.matchMedia()

      mm.add(
        {
          isDesktop: "(min-width: 1024px)",
          reducedMotion: prefersReducedMotionQuery,
        },
        (context) => {
          const conditions = (context.conditions ?? {}) as MotionConditions
          const preset = buildMotionPreset(Boolean(conditions.reducedMotion))
          const cards = gsap.utils.toArray<HTMLElement>(".motion-card", root)
          const rows = gsap.utils.toArray<HTMLElement>("tbody tr, [data-motion='row']", root)
          const sections = gsap.utils
            .toArray<HTMLElement>(
              "[data-motion='page-intro'], [data-motion='hero'], [data-motion='section']",
              root,
            )
            .filter((element) => !element.classList.contains("motion-card"))

          const targets = Array.from(new Set([...sections, ...cards, ...rows]))
          if (targets.length === 0) return

          if (conditions.reducedMotion) {
            gsap.set(targets, {
              autoAlpha: 1,
              clearProps: "transform,opacity,visibility",
            })
            return
          }

          const distance = conditions.isDesktop
            ? preset.distance
            : Math.round(preset.distance * 0.66)

          const timeline = gsap.timeline({
            defaults: {
              duration: preset.duration,
              ease: preset.ease,
              overwrite: "auto",
            },
          })

          if (sections.length > 0) {
            timeline.from(sections, {
              autoAlpha: 0,
              y: distance,
              stagger: preset.stagger,
            })
          }

          if (cards.length > 0) {
            timeline.from(
              cards,
              {
                autoAlpha: 0,
                immediateRender: false,
                scale: 0.985,
                y: distance,
                stagger: preset.stagger,
              },
              sections.length > 0 ? "-=0.38" : 0,
            )
          }

          if (rows.length > 0) {
            timeline.from(
              rows,
              {
                autoAlpha: 0,
                immediateRender: false,
                x: conditions.isDesktop ? 10 : 0,
                y: conditions.isDesktop ? 0 : 8,
                stagger: Math.min(preset.stagger, 0.025),
              },
              cards.length > 0 ? "-=0.44" : 0,
            )
          }
        },
      )

      return () => mm.revert()
    },
    {
      dependencies: [pathname],
      revertOnUpdate: true,
      scope: containerRef,
    },
  )

  return (
    <div ref={containerRef} className={cn("motion-scope", className)}>
      {children}
    </div>
  )
}
