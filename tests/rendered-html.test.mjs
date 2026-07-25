import assert from "node:assert/strict";
import test from "node:test";

const productionTitle = /<title>معتز للذكاء الاصطناعي<\/title>/i;
const productionDescription = /<meta(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["']منصة عربية متعددة المزودات للذكاء الاصطناعي والمحتوى التقني والأتمتة\.["'])[^>]*>/i;
const developmentPreviewMeta = /<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i;

async function renderHomePage() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("renders production identity metadata", async () => {
  const response = await renderHomePage();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, productionTitle);
  assert.match(html, productionDescription);
  assert.doesNotMatch(html, developmentPreviewMeta);
});
