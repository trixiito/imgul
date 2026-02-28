export async function onRequest(context) {
  const { params, env } = context;

  const key = params.key;

  const object = await env.IMAGES.get(key);

  if (!object) {
    return new Response("Not found", { status: 404 });
  }

  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000"
    }
  });
}