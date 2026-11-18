import { test } from "node:test";
import assert from "node:assert/strict";
import { getProduct, getProducts } from "./woocommerce";

// The build holds no wc/v3 keys, so the server read must come from the
// prebuild Store API snapshot (no credential, no request-time network). Without
// this the /shop grid is empty in the built HTML and LCP waits on a browser fetch.

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

test("no wc/v3 keys: products come from the build snapshot, with no network call", async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = (async () => {
    throw new Error("the snapshot read must not touch the network");
  }) as typeof fetch;
  try {
    const list = await withoutKeys(() => getProducts());
    assert.ok(list.length > 0, "the committed snapshot holds the catalogue");
    assert.ok(list.every((p) => p.name && p.slug && p.priceMinor >= 0));
    const one = await withoutKeys(() => getProduct(list[0].slug));
    assert.equal(one?.name, list[0].name);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("no wc/v3 keys: a slug missing from the snapshot asks the Store API, with one retry", async () => {
  const realFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls += 1;
    assert.equal((init?.headers as Record<string, string> | undefined)?.Authorization, undefined);
    assert.match(String(input), /\/wc\/store\/v1\/products\?slug=new-thing/);
    if (calls === 1) throw new TypeError("fetch failed");
    return new Response(JSON.stringify([{ ...storeProduct, slug: "new-thing", name: "New Thing" }]), { status: 200 });
  }) as typeof fetch;
  try {
    const one = await withoutKeys(() => getProduct("new-thing"));
    assert.equal(one?.name, "New Thing");
    assert.equal(calls, 2);
    globalThis.fetch = (async () => {
      throw new TypeError("fetch failed");
    }) as typeof fetch;
    await assert.rejects(withoutKeys(() => getProduct("new-thing")));
  } finally {
    globalThis.fetch = realFetch;
  }
});
