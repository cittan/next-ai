import 'dotenv/config';
import { asyncProcessor } from '../../lib/services/document/AsyncProcessor';

async function main() {
  await asyncProcessor.start();
  console.log('Document worker started');
}

async function shutdown() {
  await asyncProcessor.stop();
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);

main().catch((error) => {
  console.error('Document worker failed to start', error);
  process.exit(1);
});
