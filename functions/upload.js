export async function onRequest(context) {

  const { request, env } = context;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "*"
  };

  // ✅ Proper preflight response
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders
    });
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

    const MAX_SIZE = 10 * 1024 * 1024;
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

      // ✅ Per-file type validation
      if (!allowedTypes.includes(file.type)) {
        results.push({
          status: "error",
          file: file.name,
          error: `Invalid file type: ${file.type}`
        });
        continue;
      }

      // ✅ Per-file size validation
      if (file.size > MAX_SIZE) {
        results.push({
          status: "error",
          file: file.name,
          error: `${file.name} exceeds 10MB limit`
        });
        continue;
      }

      try {

        const id = generateId(6); // unchanged as requested
        const extension = extensionMap[file.type];
        const key = `${id}.${extension}`;

        // ✅ Simpler & safer R2 upload
        await env.IMAGES.put(key, file, {
          httpMetadata: { contentType: file.type }
        });

        results.push({
          status: "success",
          file: file.name,
          url: key
        });

      } catch (uploadErr) {
        results.push({
          status: "error",
          file: file.name,
          error: "Upload failed"
        });
      }
    }

    return new Response(JSON.stringify({ files: results }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });

  } catch (err) {

    // ✅ CORS included on 500
    return new Response(JSON.stringify({
      error: err.message || "Internal Server Error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
}


// Small random ID generator (unchanged)
function generateId(length = 7) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}
