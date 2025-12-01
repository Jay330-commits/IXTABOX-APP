/**
 * Client-side logger that sends logs to server
 * This ensures all logs appear in the terminal, not browser console
 */

type LogLevel = 'log' | 'info' | 'warn' | 'error';

async function sendLogToServer(level: LogLevel, message: string, data?: unknown) {
  try {
    await fetch('/api/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        level,
        message,
        data,
      }),
    });
  } catch {
    // Silently fail - don't log errors about logging
  }
}

/**
 * Client-side logger that sends to server
 * Use this instead of console.log in client components
 */
export const logger = {
  log: (message: string, data?: unknown) => sendLogToServer('log', message, data),
  info: (message: string, data?: unknown) => sendLogToServer('info', message, data),
  warn: (message: string, data?: unknown) => sendLogToServer('warn', message, data),
  error: (message: string, data?: unknown) => sendLogToServer('error', message, data),
};

