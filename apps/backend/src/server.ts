import { env } from './config/env.js';
import { createApp } from './app.js';
import { prisma } from './lib/prisma.js';

const server = createApp().listen(env.PORT, () => {
  console.log(`DevFlow API listening on http://localhost:${env.PORT} (AI provider: ${env.AI_PROVIDER}${env.ENABLE_TEST_ROUTES ? ', test routes ON' : ''})`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
