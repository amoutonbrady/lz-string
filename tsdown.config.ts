import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'src/index.ts',
  format: ['esm', 'cjs'],
  platform: 'neutral',
  fixedExtension: true,
  dts: true,
  clean: true,
  // Lint the published package shape and its types on every build
  publint: true,
  attw: true,
});
