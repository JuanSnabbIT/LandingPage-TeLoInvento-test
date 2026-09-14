import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const dir = 'public/textures/particulas';
const shapes = {};
for (const f of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
  const j = JSON.parse(readFileSync(join(dir, f), 'utf8'));
  (shapes[j.shape] ??= {})[j.lod] = {
    file: `/textures/particulas/${j.shape}-positions-${j.lod}.bin`, size: j.size, count: j.count, bbox: j.bbox,
    // `params` lo tiene TODA forma (RGB = color horneado, A = cercanía a arista);
    // `hasColor` dice si el RGB es un color de verdad o blanco de relleno.
    ...(j.params ? { params: `/textures/particulas/${j.params}`, hasColor: !!j.hasColor } : {}),
    ...(j.links ? { links: `/textures/particulas/${j.links}`, linkCount: j.linkCount, structure: j.structure } : {}),
  };
}
const manifest = {
  shapes,
  sequence: ['logo', 'nodo', 'set', 'capacidades', 'wifi', 'nodo-explotado', 'nodo'],
  tiers: { high: 'lod2', medium: 'lod2', low: 'mobile' },
  generatedAt: new Date().toISOString(),
};
writeFileSync('public/scene-manifest.json', JSON.stringify(manifest, null, 2) + '\n');
console.log('manifest:', Object.keys(shapes).length, 'shapes');
