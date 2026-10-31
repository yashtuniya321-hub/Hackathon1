import app from './app.js';
import { ENV } from './config/env.js';
import { initDatabase } from './config/db.js';

async function startServer() {
  try {
    console.log('[SERVER] Booting Brightloop Software Subscription Backend...');
    await initDatabase();

    const server = app.listen(ENV.PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 Brightloop Backend running at: http://localhost:${ENV.PORT}`);
      console.log(`🎯 Odoo x Flux Hackathon 2026 Engine Ready`);
      console.log(`⚡ Performance SLA Target: < 2000ms`);
      console.log(`======================================================\n`);
    });

    return server;
  } catch (err) {
    console.error('[FATAL] Server initialization failed:', err);
    process.exit(1);
  }
}

// Start server if run directly
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export default startServer;
