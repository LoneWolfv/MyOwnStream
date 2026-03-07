/**
 * My Own Stream — Cloudflare Worker Proxy
 *
 * Reenvía peticiones HTTP del servidor IPTV a través de HTTPS,
 * evitando bloqueos de Mixed Content / HSTS en el navegador.
 *
 * Uso en la web: pon la URL del Worker en el campo "Proxy" del login.
 * Ejemplo: https://mi-proxy.miusuario.workers.dev
 *
 * Despliegue:
 *  1. Ve a https://workers.cloudflare.com y crea una cuenta gratuita
 *  2. Crea un nuevo Worker
 *  3. Pega este código completo
 *  4. Despliega → copia la URL (https://xxx.workers.dev)
 *  5. Pégala en el campo "Proxy (opcional)" del login de la web
 */

export default {
  async fetch(request) {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    const incoming = new URL(request.url);

    // La URL objetivo viene en el path después del origen del Worker:
    //   https://worker.dev/http://servidor.com/player_api.php?action=...
    // Se extrae quitando el "/" inicial del pathname y agregando el search
    let target = incoming.pathname.slice(1);          // quita el "/" inicial
    if (!target.startsWith('http')) {
      return new Response('Bad Request: target URL missing', { status: 400, headers: corsHeaders() });
    }

    // Reattach query string (credentials, action, etc.)
    if (incoming.search) target += incoming.search;

    try {
      const response = await fetch(target, {
        method:  request.method,
        headers: { 'User-Agent': 'Mozilla/5.0' },
        // No reenviamos el body para peticiones GET (IPTV API es solo GET)
      });

      const body = await response.arrayBuffer();
      const ct   = response.headers.get('Content-Type') || 'application/json';

      return new Response(body, {
        status:  response.status,
        headers: { 'Content-Type': ct, ...corsHeaders() },
      });
    } catch (err) {
      return new Response(
        JSON.stringify({ error: err.message }),
        { status: 502, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
      );
    }
  }
};

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
  };
}
