/**
 * Calculates the maximum Sound System quantity for Pavilion / Kagitingan Hall locations.
 * - Kagitingan Hall Entire (or 3 sections booked): 3 quantity
 * - 2 Kagitingan sections booked: 2 quantity
 * - 1 Kagitingan section booked (e.g. Kagitingan Hall 1 / Section A): 1 quantity
 * - Single Pavilion location (e.g. Kalayaan Ballroom): 1 quantity
 */
export const getPavilionSoundSystemMaxQuantity = (
  locationStr?: string | null,
  locationsArr?: string[] | null,
  defaultQty: number = 3
): number => {
  const locList: string[] = [];

  if (Array.isArray(locationsArr) && locationsArr.length > 0) {
    locationsArr.forEach((l) => {
      if (l) locList.push(...l.split('+').map((s) => s.trim()));
    });
  } else if (locationStr) {
    locList.push(...locationStr.split('+').map((s) => s.trim()));
  }

  if (locList.length === 0) return defaultQty;

  const isKagitingan = locList.some((l) => l.includes('Kagitingan'));
  if (isKagitingan) {
    if (locList.some((l) => l.includes('Entire'))) {
      return 3;
    }
    const kagitinganSections = new Set<string>();
    locList.forEach((l) => {
      const match = l.match(/Section\s+([A-C])/i) || l.match(/Hall\s+([1-3])/i);
      if (match) {
        kagitinganSections.add(match[1].toUpperCase());
      } else if (l.includes('Kagitingan')) {
        kagitinganSections.add(l);
      }
    });
    const sectionCount = kagitinganSections.size;
    return sectionCount > 0 ? Math.min(sectionCount, 3) : 1;
  }

  const isPavilion = locList.some((l) => l.toLowerCase().includes('pavilion'));
  if (isPavilion) {
    const distinctLocs = new Set(locList.filter((l) => l.toLowerCase().includes('pavilion')));
    return Math.max(1, Math.min(distinctLocs.size, defaultQty));
  }

  return defaultQty;
};
