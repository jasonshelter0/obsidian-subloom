import { build } from 'esbuild';
await build({ entryPoints: ['tests/domain.test.ts'], bundle: true, platform: 'node', format: 'cjs', target: 'node20', outfile: 'build-tests/domain.test.cjs' });
