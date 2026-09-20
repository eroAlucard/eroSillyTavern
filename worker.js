// Cloudflare Worker — HTTP Basic Auth 保护整个站点
// 凭据通过 Cloudflare Secrets 设置:
//   wrangler secret put AUTH_USERNAME
//   wrangler secret put AUTH_PASSWORD

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 允许 Service Worker 脚本无认证访问（浏览器需要能加载 SW 才能注册）
    // 但 SW 注册后所有页面请求仍需认证
    if (url.pathname === '/service-worker.js') {
      return env.ASSETS.fetch(request);
    }

    // 检查 Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) {
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="eroSillyTavern", charset="UTF-8"',
        },
      });
    }

    // 解析 Basic Auth 凭据
    const [scheme, encoded] = authHeader.split(' ');
    if (scheme !== 'Basic' || !encoded) {
      return new Response('Unauthorized', {
        status: 401,
        headers: {
          'WWW-Authenticate': 'Basic realm="eroSillyTavern", charset="UTF-8"',
        },
      });
    }

    const decoded = atob(encoded);
    const colonIndex = decoded.indexOf(':');
    const username = decoded.substring(0, colonIndex);
    const password = decoded.substring(colonIndex + 1);

    // 从环境变量读取凭据（通过 wrangler secret put 设置）
    const validUsername = env.AUTH_USERNAME || 'eroAlucard';
    const validPassword = env.AUTH_PASSWORD || 'GOKO19921218';

    if (username === validUsername && password === validPassword) {
      // 认证通过，代理到 assets
      return env.ASSETS.fetch(request);
    }

    // 认证失败
    return new Response('Unauthorized', {
      status: 401,
      headers: {
        'WWW-Authenticate': 'Basic realm="eroSillyTavern", charset="UTF-8"',
      },
    });
  },
};
