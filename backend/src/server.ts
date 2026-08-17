import { authService } from './application/auth/auth.service';
import { createApp } from './app';
import { runtimeConfig } from './config/runtime';
import { createAuthRouter } from './http/routes/auth.routes';

createApp({ featureRouters: [createAuthRouter({ authService })] }).listen(runtimeConfig.port, () => {
  console.log(`Express server listening on port ${runtimeConfig.port}`);
});
