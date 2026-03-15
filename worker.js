export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const TARGET = "https://example.com";
    const upstream = new URL(TARGET + url.pathname + url.search);
    const newRequest = new Request(upstream, {
      method: request.method,
      headers: request.headers,
      body: request.method !== "GET" && request.method !== "HEAD"
        ? await request.arrayBuffer()
        : undefined,
      redirect: "manual"
    });
    let response = await fetch(newRequest);
    const newHeaders = new Headers(response.headers);
    newHeaders.delete("content-security-policy");
    newHeaders.delete("x-frame-options");
    newHeaders.delete("x-content-type-options");
    newHeaders.delete("referrer-policy");
    const contentType = newHeaders.get("content-type") || "";
    if (contentType.includes("text/html")) {
      let text = await response.text();
      text = text
        .replace(/https:\/\/proxyium\.com/gi, "")
        .replace(/href="\//gi, 'href="')
        .replace(/src="\//gi, 'src="');

      return new Response(text, {
        status: response.status,
        headers: newHeaders
      });
    }
    return new Response(response.body, {
      status: response.status,
      headers: newHeaders
    });
  }
};
