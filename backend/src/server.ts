import { authService } from './application/auth/auth.service';
import { createApp } from './app';
import { runtimeConfig } from './config/runtime';
import { createAuthRouter } from './http/routes/auth.routes';
import { createSessionRouter } from './http/routes/session.routes';
import { createKnowledgeRouter } from './http/routes/knowledge.routes';

createApp({ featureRouters: [createAuthRouter({ authService }), createSessionRouter(), createKnowledgeRouter()] }).listen(runtimeConfig.port, () => {
  console.log(`Express server listening on port ${runtimeConfig.port}`);
});
