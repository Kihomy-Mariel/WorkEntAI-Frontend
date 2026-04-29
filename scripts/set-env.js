const fs = require('fs');
const path = require('path');

// Lee el .env del directorio raíz del frontend
const envFile = path.resolve(__dirname, '..', '.env');
const targetDir = path.resolve(__dirname, '..', 'src', 'environments');

if (!fs.existsSync(envFile)) {
  console.error('❌ No se encontró el archivo .env. Copia .env.example como .env y configura tus valores.');
  process.exit(1);
}

// Parsea el .env manualmente (sin dependencias externas)
const raw = fs.readFileSync(envFile, 'utf8');
const vars = {};
raw.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return;
  const [key, ...rest] = trimmed.split('=');
  vars[key.trim()] = rest.join('=').trim();
});

const apiUrl = vars['API_URL'] || 'http://localhost:8080/api';
const wsUrl  = vars['WS_URL']  || 'http://localhost:8080/ws';
const isProd = process.env.NODE_ENV === 'production';

const content = `// Generado automáticamente por scripts/set-env.js — NO editar manualmente
export const environment = {
  production: ${isProd},
  apiUrl: '${apiUrl}',
  wsUrl: '${wsUrl}'
};
`;

const fileName = isProd ? 'environment.production.ts' : 'environment.development.ts';
const targetPath = path.join(targetDir, fileName);

fs.writeFileSync(targetPath, content);
console.log(`✅ ${fileName} generado desde .env`);
