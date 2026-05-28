interface SidebarRoute {
  href: string
}

function matchesRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function getActiveNavHref(pathname: string, items: readonly SidebarRoute[]) {
  return items
    .filter((item) => matchesRoute(pathname, item.href))
    .sort((left, right) => right.href.length - left.href.length)[0]?.href
}
