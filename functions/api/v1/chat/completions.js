/**
 * Cloudflare Functions - AI API 代理
 * 
 * 解决 CORS 问题，将前端请求转发到用户配置的 AI 后端
 * 支持 OpenAI、Anthropic、Google 等多种 AI 提供商
 */

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  
  // 从请求头获取目标 API URL
  const targetApiUrl = request.headers.get('X-API-URL');
  
  if (!targetApiUrl) {
    return new Response(JSON.stringify({ 
      error: 'Missing X-API-URL header',
      message: '请配置 API 地址' 
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  try {
    // 克隆请求并修改目标 URL
    const modifiedRequest = new Request(targetApiUrl, {
      method: request.method,
      headers: request.headers,
      body: request.body,
    });
    
    // 转发请求到目标 AI API
    const response = await fetch(modifiedRequest);
    
    // 返回响应，保留原始状态码和头部
    const responseBody = await response.text();
    return new Response(responseBody, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-URL',
      }
    });
    
  } catch (error) {
    console.error('API Proxy Error:', error);
    return new Response(JSON.stringify({ 
      error: 'API request failed',
      message: error.message 
    }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 处理 OPTIONS 预检请求
export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-URL',
      'Access-Control-Max-Age': '86400',
    }
  });
}
