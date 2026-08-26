/** Origins allowed to call this API - shared by main.ts's app.enableCors()
 * and event-chat.gateway.ts's WebSocketGateway cors option, so the two
 * never drift apart. Evaluated fresh on every call rather than cached once
 * at import time, so a socket connection's dynamic cors.origin function
 * (see the gateway) never depends on whether .env has finished loading by
 * the time this module was first imported. */
export function resolveAllowedOrigins(): string[] {
  const defaultDevOrigins = [
    'http://localhost:8100',
    'http://localhost:4200',
    'capacitor://localhost',
    'http://localhost',
    // Capacitor's actual default Android origin (capacitor.config.ts doesn't
    // override androidScheme, which defaults to "https") - without this,
    // every request from the native Android app (including the profile
    // lookup right after Firebase login) was silently rejected by CORS.
    'https://localhost',
  ];
  return process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map((origin) => origin.trim())
    : defaultDevOrigins;
}
