import { createApp } from './app';
import { runtimeConfig } from './config/runtime';

createApp().listen(runtimeConfig.port, () => {
  console.log(`Express server listening on port ${runtimeConfig.port}`);
});
