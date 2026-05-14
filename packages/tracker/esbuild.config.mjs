import { build, context } from 'esbuild';
import { argv } from 'node:process';

const config = {
  entryPoints: ['src/index.ts'],
  outfile: 'dist/tracker.js',
  bundle: true,
  format: 'iife',
  target: ['es2018'],
  minify: true,
  sourcemap: true,
  logLevel: 'info',
};

if (argv.includes('--watch')) {
  const ctx = await context(config);
  await ctx.watch();
} else {
  await build(config);
}
