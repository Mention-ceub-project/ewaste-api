import { describe, expect, it } from 'vitest';
import { distanciaEmKm } from './geo.util';

describe('distanciaEmKm (Haversine)', () => {
  it('é zero entre um ponto e ele mesmo', () => {
    expect(distanciaEmKm(-15.7939, -47.8828, -15.7939, -47.8828)).toBe(0);
  });

  it('mede um grau de longitude sobre o equador (≈ 111,19 km)', () => {
    expect(distanciaEmKm(0, 0, 0, 1)).toBe(111.19);
  });

  it('é simétrica: a ida tem a mesma distância que a volta', () => {
    const ida = distanciaEmKm(-15.7982, -47.8854, -15.8341, -48.0559);
    const volta = distanciaEmKm(-15.8341, -48.0559, -15.7982, -47.8854);

    expect(ida).toBe(volta);
  });

  it('calcula a distância entre dois pontos de coleta do seed (Asa Sul → Taguatinga)', () => {
    // ≈ 18,7 km em linha reta
    expect(distanciaEmKm(-15.7982, -47.8854, -15.8341, -48.0559)).toBeCloseTo(18.7, 0);
  });
});
