export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const TARGET = "https://proxyium.com";

    if (url.pathname === "/proxy") {
      const target = url.searchParams.get("url");
      if (!target) return new Response("Missing url", { status: 400 });
      return fetch(target);
    }

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

      const forced = `${url.origin}/proxy?url=https://cdn.proxyium.com/proxyrequest/php`;

      const blocker = `
<script>
(function(){
  const r="${forced}";
  const n=()=>{window.location.href=r};
  window.open=n;
  window.location.assign=n;
  window.location.replace=n;
  Object.defineProperty(window.location,"href",{set:n});
  history.pushState=n;
  history.replaceState=n;
  document.addEventListener("click",e=>{
    const a=e.target.closest("a");
    if(a&&a.href){e.preventDefault();n()}
  },true);
  document.addEventListener("submit",e=>{e.preventDefault();n()},true);
  window.addEventListener("beforeunload",e=>{e.preventDefault();n()});
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
