const HEADER_OFFSET_PX = 80;

/**
 * Scroll to #map so the map sits below the sticky header (nothing hidden under it).
 */
export function scrollToMap(e?: React.MouseEvent): void {
  if (e) {
    e.preventDefault();
  }
  const el = document.querySelector("#map") as HTMLElement | null;
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET_PX;
  window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
}

