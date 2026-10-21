// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json).
// The backend is compiled to backend/dist by `npm run build` before functions are bundled.
export { default } from '../backend/dist/app.js';
