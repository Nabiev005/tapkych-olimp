import app from './app.js';
import { env } from './config/env.js';

app.listen(env.PORT, () => {
  console.log(`Tapkych Olimp API: http://localhost:${env.PORT}/api`);
});
