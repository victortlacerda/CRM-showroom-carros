// Copia o build (dist/index.html) para demo/showroom3d.html — o arquivo que abre com duplo clique.
// Uso: npm run demo
import { copyFileSync, mkdirSync } from 'node:fs';

mkdirSync(new URL('../demo/', import.meta.url), { recursive: true });
copyFileSync(new URL('../dist/index.html', import.meta.url), new URL('../demo/showroom3d.html', import.meta.url));
console.log('demo/showroom3d.html atualizado.');
