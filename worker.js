//path is /?url="the url you want to visit!"
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const target = url.searchParams.get("url");

    if (!target) {
      return new Response("Missing ?url=", { status: 400 });
    }

    const upstream = new URL(target);

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
    newHeaders.delete("referrer-policy");

    const contentType = newHeaders.get("content-type") || "";

    if (contentType.includes("text/html")) {
      let text = await response.text();

      const blocker = `
<script>
(function(){
  const stay=()=>{};
  window.open=stay;
  window.top!==window && (window.top.location=window.location);
})();
</script>`;

      text = text.replace(/<\/body>/i, blocker + "</body>");

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
