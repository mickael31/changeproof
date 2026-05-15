export interface DiffLine {
  type: "added" | "removed" | "unchanged"
  content: string
  lineNumber: { left?: number; right?: number }
}

function lcs(a: string[], b: string[]): number[][] {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
  return dp
}

function backtrack(dp: number[][], a: string[], b: string[], i: number, j: number): DiffLine[] {
  if (i === 0 && j === 0) return []
  if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
    const prev = backtrack(dp, a, b, i - 1, j - 1)
    return [...prev, { type: "unchanged" as const, content: a[i - 1], lineNumber: { left: i, right: j } }]
  }
  if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
    const prev = backtrack(dp, a, b, i, j - 1)
    return [...prev, { type: "added" as const, content: b[j - 1], lineNumber: { right: j } }]
  }
  const prev = backtrack(dp, a, b, i - 1, j)
  return [...prev, { type: "removed" as const, content: a[i - 1], lineNumber: { left: i } }]
}

export function computeDiff(oldContent: string, newContent: string): DiffLine[] {
  const oldLines = oldContent.split("\n")
  const newLines = newContent.split("\n")
  const dp = lcs(oldLines, newLines)
  return backtrack(dp, oldLines, newLines, oldLines.length, newLines.length)
}
