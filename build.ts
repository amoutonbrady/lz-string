import { build } from 'esbuild';

build({
  entryPoints: ['./src/index.ts'],
  outdir: 'dist/esm',
  bundle: true,
  minify: true,
  format: 'esm',
  target: 'esnext',
  platform: 'neutral',
  outExtension: { '.js': '.mjs' },
  treeShaking: true,
});

build({
  entryPoints: ['./src/index.ts'],
  outdir: 'dist/cjs',
  bundle: true,
  minify: false,
  format: 'cjs',
  target: 'esnext',
  platform: 'neutral',
  treeShaking: true,
});
