export async function onRequest(context) {
  const { request, env } = context;

  const ip = request.headers.get("CF-Connecting-IP");

  const already = await env.COUNTER.get("ip:" + ip);

  let total = parseInt(await env.COUNTER.get("total") || "0");

  if (!already) {
    total++;
    await env.COUNTER.put("total", total.toString());
    await env.COUNTER.put("ip:" + ip, "1");
  }

  return new Response(JSON.stringify({
    total: total,
    unique: total
  }), {
    headers: { "Content-Type": "application/json" }
  });
}