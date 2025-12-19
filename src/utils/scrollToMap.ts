/**
 * Exact same functionality as the header "Book IXTAbox" button
 * This is the EXACT code from the header button onClick handler:
 * 
 * if (item.href.startsWith("#")) {
 *   e.preventDefault();
 *   const el = document.querySelector(item.href);
 *   if (el) {
 *     (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
 *   }
 *   setActiveHash(item.href);
 * }
 */
export function scrollToMap(e?: React.MouseEvent): void {
  // Exact same logic as header button (item.href is "#map")
  if (e) {
    e.preventDefault();
  }
  const el = document.querySelector("#map");
  if (el) {
    (el as HTMLElement).scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

