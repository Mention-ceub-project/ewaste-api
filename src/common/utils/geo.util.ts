const RAIO_TERRA_KM = 6371;

const paraRadianos = (graus: number) => (graus * Math.PI) / 180;

// Distancia em km entre duas coordenadas (formula de Haversine).
// Usada para ordenar os pontos de coleta mais proximos do usuario no mapa.
export function distanciaEmKm(
  origemLat: number,
  origemLng: number,
  destinoLat: number,
  destinoLng: number,
): number {
  const deltaLat = paraRadianos(destinoLat - origemLat);
  const deltaLng = paraRadianos(destinoLng - origemLng);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(paraRadianos(origemLat)) *
      Math.cos(paraRadianos(destinoLat)) *
      Math.sin(deltaLng / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(RAIO_TERRA_KM * c * 100) / 100;
}
