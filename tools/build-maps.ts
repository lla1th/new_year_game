// Запуск: node --experimental-strip-types tools/build-maps.ts
// Модули грузятся через Vite (ssrLoadModule): исходники игры импортируют друг друга без расширений.
import { readdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'vite';

const root = new URL('..', import.meta.url).pathname;
const mapsDir = new URL('./maps/', import.meta.url);
const outDir = new URL('../public/assets/maps/', import.meta.url);

const vite = await createServer({
  root, configFile: false, appType: 'custom', logLevel: 'error',
  server: { middlewareMode: true, watch: null },
});
try {
  const { buildTiledMap } = await vite.ssrLoadModule('/tools/mapSpec.ts') as typeof import('./mapSpec.ts');
  for (const f of readdirSync(mapsDir).filter(n => n.endsWith('.ts')).sort()) {
    const mod = await vite.ssrLoadModule(`/tools/maps/${f}`) as { default: { file: string; spec: Parameters<typeof buildTiledMap>[0] } };
    const { file, spec } = mod.default;
    writeFileSync(new URL(`${file}.json`, outDir), JSON.stringify(buildTiledMap(spec), null, 2) + '\n', 'utf8');
    console.log(`Карта ${file}.json собрана`);
  }
} finally {
  await vite.close();
}
