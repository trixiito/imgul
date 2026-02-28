export async function onRequest(context) {

  const { request, env } = context;

  // Allow preflight for XHR
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

    /* ==============================
       TURNSTILE VERIFICATION
    ============================== */

    const token = formData.get("cf-turnstile-response");

    if (!token) {
      return new Response(JSON.stringify({ error: "Captcha missing" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET,
          response: token,
          remoteip: request.headers.get("CF-Connecting-IP")
        })
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
  return new Response(JSON.stringify({
    error: "Captcha failed",
    details: verifyData
  }), {
        status: 403,
        headers: { "Content-Type": "application/json" }
      });
    }

    /* ==============================
       FILE PROCESSING
    ============================== */

    const files = formData.getAll("files[]");

    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ error: "No files uploaded" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    const ALLOWED_TYPES = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif"
    };

    let results = [];

    for (const file of files) {

      // Enforce file size limit
      if (file.size > MAX_SIZE) {
        results.push({
          status: "error"
        });
        continue;
      }

      // Enforce allowed types
      if (!ALLOWED_TYPES[file.type]) {
        results.push({
          status: "error"
        });
        continue;
      }

      // Generate short clean filename
      const id = crypto.randomUUID()
        .replace(/-/g, "")
        .slice(0, 8);

      const extension = ALLOWED_TYPES[file.type];
      const key = `${id}.${extension}`;

      await env.IMAGES.put(key, file.stream(), {
        httpMetadata: {
          contentType: file.type
        }
      });

      results.push({
        status: "success",
        file: key,
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