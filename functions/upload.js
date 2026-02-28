export async function onRequest(context) {

  const { request, env } = context;

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
    const token = formData.get("cf-turnstile-response");

    if (!token) {
      return new Response(JSON.stringify({ error: "Verification required" }), { status: 403 });
    }

    // 🔐 VERIFY TURNSTILE
    const verify = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: new URLSearchParams({
        secret: env.TURNSTILE_SECRET,
        response: token,
        remoteip: request.headers.get("CF-Connecting-IP")
      })
    });

    const result = await verify.json();

    if (!result.success) {
      return new Response(JSON.stringify({ error: "Bot verification failed" }), { status: 403 });
    }

    // 🚫 Rate limit (20 uploads per minute per IP)
    const ip = request.headers.get("CF-Connecting-IP");
    const rateKey = `rate:${ip}`;
    const count = await env.COUNTER.get(rateKey);

    if (count && Number(count) >= 20) {
      return new Response("Too many uploads. Try again later.", { status: 429 });
    }

    await env.COUNTER.put(rateKey, (Number(count || 0) + 1).toString(), {
      expirationTtl: 60
    });

    const files = formData.getAll("files[]");
    let results = [];

    for (const file of files) {

      // 10MB hard limit
      if (file.size > 10 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "File too large (max 10MB)" }), { status: 400 });
      }

      const allowedTypes = ["image/jpeg","image/png","image/webp","image/gif"];

      if (!allowedTypes.includes(file.type)) {
        return new Response(JSON.stringify({ error: "Invalid file type" }), { status: 400 });
      }

      // Small random name
      const id = crypto.randomUUID().replace(/-/g, "").slice(0, 8);

      const extensionMap = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif"
      };

      const extension = extensionMap[file.type];
      const key = `${id}.${extension}`;

      await env.IMAGES.put(key, file.stream(), {
        httpMetadata: { contentType: file.type }
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