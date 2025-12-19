/**
 * Utility function to scroll to the map container with consistent positioning
 * This ensures all booking interactions maintain the same view as the header "Book IXTAbox" button
 * Scrolls to position the map container at the top of the viewport (accounting for header)
 */
export function scrollToMapContainer(): void {
  setTimeout(() => {
    const mapSection = document.getElementById('map');
    if (mapSection) {
      // Find the map container div - it's the div with class "w-full relative" inside the section
      const mapContainer = mapSection.querySelector('.w-full.relative') as HTMLElement;
      if (mapContainer) {
        const headerHeight = 80; // Approximate header height
        const containerTop = mapContainer.getBoundingClientRect().top + window.pageYOffset;
        
        // Scroll to position the map container at the top of the viewport, accounting for header
        // This ensures only the map is visible, not the section title or empty space above
        const finalPosition = containerTop - headerHeight;

        window.scrollTo({
          top: Math.max(0, finalPosition), // Ensure we don't scroll to negative position
          behavior: 'smooth'
        });
      }
    }
  }, 100);
}

