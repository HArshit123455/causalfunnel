import 'dotenv/config';
import { createApp } from './app.js';
import { connectDb } from './db.js';
import { logger } from './logger.js';

async function main() {
  const uri = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/causalfunnel';
  const port = Number(process.env.PORT ?? 4000);
  await connectDb(uri);
  createApp().listen(port, () => logger.info({ port }, 'backend listening'));
}

main().catch((err) => { logger.fatal({ err }, 'fatal startup error'); process.exit(1); });
