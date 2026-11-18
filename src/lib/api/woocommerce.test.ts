import { test } from "node:test";
import assert from "node:assert/strict";
import { getProduct, getProducts } from "./woocommerce";

// The build holds no wc/v3 keys, so the server read must go to the public
// Store API (no credential) and survive one transient failure. Without this the
// /shop grid is empty in the built HTML and LCP waits on a browser fetch.

const storeProduct = {
  id: 7,
  slug: "cowgirl-boot-koozie",
  name: "Cowgirl Boot Koozie",
  type: "simple",
  permalink: "",
  short_description: "",
  description: "",
  on_sale: false,
  is_in_stock: true,
  is_purchasable: true,
  prices: {
    price: "800",
    regular_price: "800",
    currency_code: "USD",
    currency_minor_unit: 2,
    currency_decimal_separator: ".",
    currency_thousand_separator: ",",
    currency_prefix: "$",
    currency_suffix: "",
  },
  images: [],
  attributes: [],
};

function withoutKeys<T>(run: () => Promise<T>): Promise<T> {
  const saved = [process.env.WC_CONSUMER_KEY, process.env.WC_CONSUMER_SECRET];
  delete process.env.WC_CONSUMER_KEY;
  delete process.env.WC_CONSUMER_SECRET;
  return run().finally(() => {
    if (saved[0] !== undefined) process.env.WC_CONSUMER_KEY = saved[0];
    if (saved[1] !== undefined) process.env.WC_CONSUMER_SECRET = saved[1];
  });
}

test("no wc/v3 keys: products come from the public Store API, with no auth header", async () => {
  const realFetch = globalThis.fetch;
  const urls: string[] = [];
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    urls.push(String(input));
    assert.equal((init?.headers as Record<string, string> | undefined)?.Authorization, undefined);
    return new Response(JSON.stringify([storeProduct]), { status: 200 });
  }) as typeof fetch;
  try {
    const list = await withoutKeys(() => getProducts());
    assert.equal(list.length, 1);
    assert.equal(list[0].priceMinor, 800);
    assert.match(urls[0], /\/wc\/store\/v1\/products/);
    const one = await withoutKeys(() => getProduct("cowgirl-boot-koozie"));
    assert.equal(one?.name, "Cowgirl Boot Koozie");
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("no wc/v3 keys: one transient failure is retried; two in a row throw", async () => {
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async () => {
    calls += 1;
    if (calls === 1) throw new TypeError("fetch failed");
    return new Response(JSON.stringify([storeProduct]), { status: 200 });
  }) as typeof fetch;
  try {
    assert.equal((await withoutKeys(() => getProducts())).length, 1);
    assert.equal(calls, 2);
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await assert.rejects(withoutKeys(() => getProducts()));
  } finally {
    globalThis.fetch = realFetch;
  }
});
