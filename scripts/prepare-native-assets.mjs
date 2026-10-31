import {build} from 'esbuild';
import fs from 'node:fs';
fs.mkdirSync('.qa/native-world',{recursive:true});
await build({entryPoints:['scripts/native-assets.ts'],outfile:'.qa/native-world/prepare.cjs',bundle:true,platform:'node',format:'cjs'});
await import('../.qa/native-world/prepare.cjs?'+Date.now());
