export function mapSearchUrl(municipality: string, place: string) {
  const query = `沖縄県 ${municipality} ${place}`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}
