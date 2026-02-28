export async function onRequest(context) {

  const { request, env } = context;

  // Allow preflight (XHR sends this)
  if (request.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "*"
      }
    });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files[]");

    let results = [];

    for (const file of files) {

      const id = crypto.randomUUID().replace(/-/g, "").slice(0, 8);

      const extensionMap = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif"
      };

      const extension = extensionMap[file.type] || "bin";
      const key = `${id}.${extension}`;

      await env.IMAGES.put(key, file.stream(), {
        httpMetadata: { contentType: file.type }
      });

      results.push({
        status: "success",
        file: file.name,
        url: key
      });
    }

    return new Response(JSON.stringify({ files: results }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}