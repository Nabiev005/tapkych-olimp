// Vercel serverless entry: every /api/* request is rewritten here (see vercel.json).
// The backend is compiled to backend/dist by `npm run build` before functions are bundled.
//
// If the app fails to start (most often: missing environment variables), answer with a
// clear JSON error instead of crashing, so the cause is visible. Only variable names are
// reported — never their values.

let handler;

try {
  ({ default: handler } = await import('../backend/dist/app.js'));
} catch (error) {
  console.error('Tapkych Olimp API failed to start:', error);
  const message = error instanceof Error ? error.message : String(error);
  const envProblem = message.startsWith('Invalid environment variables');
  handler = (_req, res) => {
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        error: {
          code: 'STARTUP_FAILED',
          message: envProblem
            ? 'Server is not configured: environment variables are missing or invalid (see DEPLOYMENT.md).'
            : 'Server failed to start. See the function logs.',
          // e.g. ["DATABASE_URL: Invalid input", "JWT_ACCESS_SECRET: Too small"]
          details: envProblem
            ? message
                .split('\n')
                .slice(1)
                .map((line) => line.trim())
            : undefined,
        },
      }),
    );
  };
}

export default function tapkychOlimpApi(req, res) {
  return handler(req, res);
}
