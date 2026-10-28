/**
 * Page count from a GitHub `Link` header. Lists with page numbers give a
 * `rel="last"`; cursor-paged lists (e.g. a repo's issues) only say whether a
 * `rel="next"` page exists, so then this is "at least one more page".
 */
export const totalPagesFromLink = (linkHeader: string | null, page: number): number => {
  if (!linkHeader) return page
  const last = linkHeader.match(/<[^>]+[?&]page=(\d+)[^>]*>;\s*rel="last"/)
  if (last) return parseInt(last[1], 10)
  return linkHeader.includes('rel="next"') ? page + 1 : page
}
