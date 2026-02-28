export async function onRequest(context) {

  const { request, env } = context;

  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "*"
  };

  // Handle preflight (XHR sends OPTIONS)
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files[]");

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: "No files uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      });
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif"
    ];

    const extensionMap = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif"
    };

    let results = [];

    for (const file of files) {

      // 🔒 Enforce type
      if (!allowedTypes.includes(file.type)) {
        return new Response(JSON.stringify({
          error: `Invalid file type: ${file.type}`
        }), {
          status: 415,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // 🔒 Enforce size
      if (file.size > MAX_SIZE) {
        return new Response(JSON.stringify({
          error: `${file.name} exceeds 10MB limit`
        }), {
          status: 413,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        });
      }

      // 🔥 Generate short random ID (6 characters)
      const id = generateId(6);
      const extension = extensionMap[file.type];
      const key = `${id}.${extension}`;

      // Save to R2
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
        ...corsHeaders
      }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}


// 🔹 Small random ID generator
function generateId(length = 7) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}