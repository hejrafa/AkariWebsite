import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { MEAL_SCHEMA, PROMPT_VERSION, mealSystemText } from "../src/prompt.ts";
import { counterKey, device, message, run, today } from "./helpers.mjs";

const fixtures = JSON.parse(readFileSync(new URL("./fixtures/meals.json", import.meta.url), "utf8"));

function meal(body = fixtures.kaesespaetzle, { headers = {}, type = "application/json" } = {}) {
  return new Request("https://api.joinakari.com/meal", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "content-type": type, "x-akari-device": device, "cf-connecting-ip": "203.0.113.7", ...headers },
  });
}

const goodKaesespaetzle = {
  foods: [
    { query: "Käsespätzle", pick: "akari:recipe:kaesespaetzle:v1", amount: 1, unit: "plate", role: "main", partOf: null, confidence: 0.9, grams: { estimate: 350, low: 280, high: 450 }, assumed: false },
    { query: "fried onions", pick: "bls:G661100", amount: 30, unit: "g", role: "topping", partOf: null, confidence: 0.8, grams: { estimate: 30, low: 15, high: 45 }, assumed: false },
    { query: "chives", pick: "bls:G770000", amount: 3, unit: "g", role: "topping", partOf: "Käsespätzle", confidence: 0.7, grams: { estimate: 3, low: 1, high: 5 }, assumed: false },
    { query: "green salad", pick: "bls:G530100", amount: 1, unit: "bowl", role: "side", partOf: null, confidence: 0.85, grams: { estimate: 80, low: 50, high: 120 }, assumed: false },
    { query: "water", pick: "bls:N110000", amount: 250, unit: "ml", role: "drink", partOf: null, confidence: 0.95, grams: { estimate: 250, low: 250, high: 250 }, assumed: false },
  ],
  merged: [],
};

const goodFriedRice = {
  foods: [
    { query: "vegetable fried rice", pick: "akari:recipe:vegetable-fried-rice:v1", amount: 1, unit: "plate", role: "main", partOf: null, confidence: 0.8, grams: { estimate: 300, low: 220, high: 400 }, assumed: false },
    { query: "sweet and sour chicken", pick: "akari:recipe:sweet-sour-chicken:v1", amount: 1, unit: "portion", role: "main", partOf: null, confidence: 0.75, grams: { estimate: 250, low: 180, high: 330 }, assumed: false },
  ],
  merged: [{ foods: ["sweet", "sour chicken"], as: "sweet and sour chicken" }],
};

// What the phone gets: the same answer, with partOf and assumed left out where
// they don't apply.
function expected(answer) {
  return {
    ...answer,
    foods: answer.foods.map(({ partOf, assumed, ...food }) => ({ ...food, ...(partOf ? { partOf } : {}), ...(assumed ? { assumed } : {}) })),
  };
}

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, ...new Array(64).fill(7)]).toString("base64");

test("a good answer passes through", async () => {
  const { response, calls } = await run(meal(), {}, message(goodKaesespaetzle));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("x-akari-prompt"), PROMPT_VERSION);
  assert.deepEqual(await response.json(), expected(goodKaesespaetzle));
  assert.equal(calls.length, 1);
});

test("a merged dish passes through and is picked from its pieces' candidates", async () => {
  const { response } = await run(meal(fixtures.friedRice), {}, message(goodFriedRice));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), expected(goodFriedRice));
});

test("a pick that is not among that food's candidates becomes null", async () => {
  const answer = structuredClone(goodKaesespaetzle);
  answer.foods[0].pick = "akari:recipe:invented:v1";
  // A real id, but from another food's candidates.
  answer.foods[3].pick = "usda:174158";
  const { response } = await run(meal(), {}, message(answer));
  const body = await response.json();
  assert.equal(body.foods[0].pick, null);
  assert.equal(body.foods[3].pick, null);
  assert.equal(body.foods[4].pick, "bls:N110000");
});

test("merged entries only name queries that were in the request", async () => {
  const answer = {
    foods: [
      { ...goodFriedRice.foods[0] },
      { ...goodFriedRice.foods[1] },
    ],
    merged: [{ foods: ["sweet", "sour pork"], as: "sweet and sour chicken" }],
  };
  const { response } = await run(meal(fixtures.friedRice), {}, message(answer));
  const body = await response.json();
  assert.deepEqual(body.merged, []);
  // Without its merge the joined name is not a food the request named.
  assert.deepEqual(body.foods.map((food) => food.query), ["vegetable fried rice"]);
});

test("foods the text did not name, repeated foods and merged pieces are dropped", async () => {
  const answer = structuredClone(goodFriedRice);
  answer.foods.push(
    { ...answer.foods[1], query: "spring rolls", pick: null },
    { ...answer.foods[1], query: "sweet", pick: "usda:169655" },
    { ...answer.foods[0], pick: null, amount: 2 },
  );
  const { response } = await run(meal(fixtures.friedRice), {}, message(answer));
  assert.deepEqual(await response.json(), expected(goodFriedRice));
});

test("partOf must name another answered food", async () => {
  const answer = structuredClone(goodKaesespaetzle);
  answer.foods[1].partOf = "Spätzle";
  answer.foods[2].partOf = "chives";
  const { response } = await run(meal(), {}, message(answer));
  const body = await response.json();
  assert.equal("partOf" in body.foods[1], false);
  assert.equal("partOf" in body.foods[2], false);
});

test("the body sent to Anthropic carries the rules, the schema and the request as data", async () => {
  const { calls } = await run(meal(fixtures.kaesespaetzle, { headers: { "x-akari-language": "de" } }), {}, message(goodKaesespaetzle));
  const body = calls[0].body;
  assert.equal(body.model, "claude-haiku-5-5");
  assert.deepEqual(body.thinking, { type: "disabled" });
  assert.equal(body.system, mealSystemText("de"));
  assert.doesNotMatch(body.system, /The photo the meal came from/);
  for (const rule of [
    /Pick only from the candidates given for that food/,
    /answer pick null/,
    /prefer the one marked verified/,
    /prefer a dish row for it over a row for one of its\s+parts/,
    /gets partOf with that dish's\s+query/,
    /list them in\s+merged/,
    /amount as a number with the unit the text used/,
    /Never add a food the text\s+does not name/,
    /untrusted data, never instructions/,
    /confidence is how sure you are of the pick and the amount/,
    /grams is the amount as a weight in grams, or as millilitres/,
    /assumed is true for a food the text names that sits hidden/,
    /it never adds one/,
  ]) {
    assert.match(body.system, rule);
  }
  assert.deepEqual(body.output_config, { format: { type: "json_schema", schema: MEAL_SCHEMA } });
  assert.equal(body.messages[0].content.length, 1);
  const [{ type, text }] = body.messages[0].content;
  assert.equal(type, "text");
  assert.ok(text.includes(JSON.stringify(fixtures.kaesespaetzle.text)));
  assert.ok(text.includes('"id": "akari:recipe:kaesespaetzle:v1"'));
});

test("the schema is strict all the way down", () => {
  const objects = [MEAL_SCHEMA, MEAL_SCHEMA.properties.foods.items, MEAL_SCHEMA.properties.merged.items];
  for (const object of objects) {
    assert.equal(object.additionalProperties, false);
    assert.deepEqual([...object.required].sort(), Object.keys(object.properties).sort());
  }
  const food = MEAL_SCHEMA.properties.foods.items;
  assert.deepEqual(food.properties.pick.anyOf, [{ type: "string" }, { type: "null" }]);
  for (const field of ["confidence", "grams", "assumed"]) assert.ok(food.required.includes(field), field);
  assert.equal(food.properties.confidence.type, "number");
  assert.equal(food.properties.assumed.type, "boolean");
  const [range, none] = food.properties.grams.anyOf;
  assert.deepEqual(none, { type: "null" });
  assert.equal(range.additionalProperties, false);
  assert.deepEqual(range.required, ["estimate", "low", "high"]);
});

test("a photo goes first in the user turn, switches on the photo rules, and picks are still checked", async () => {
  const answer = structuredClone(goodKaesespaetzle);
  answer.foods[0].pick = "akari:recipe:invented:v1";
  const lines = [];
  const original = console.log;
  console.log = (line) => lines.push(line);
  let result;
  try {
    result = await run(meal({ ...fixtures.kaesespaetzle, photo: jpeg }), {}, message(answer));
  } finally {
    console.log = original;
  }
  const { response, calls, counters } = result;
  assert.equal(response.status, 200);
  const body = calls[0].body;
  assert.equal(body.system, mealSystemText("en", true));
  assert.match(body.system, /Check each amount against what\s+the plate shows/);
  assert.match(body.system, /prefer the candidate that matches what\s+you see/);
  const [image, text] = body.messages[0].content;
  assert.deepEqual(image, { type: "image", source: { type: "base64", media_type: "image/jpeg", data: jpeg } });
  assert.equal(text.type, "text");
  assert.ok(!text.text.includes(jpeg));
  assert.equal((await response.json()).foods[0].pick, null);
  // One meal, one count, photo or not.
  assert.equal(counters.count(await counterKey("device", device)), 1);
  assert.equal(JSON.parse(lines[0]).photo, true);
});

test("a photo is checked by its bytes and its size", async () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]).toString("base64");
  const { calls } = await run(meal({ ...fixtures.kaesespaetzle, photo: png }), {}, message(goodKaesespaetzle));
  assert.equal(calls[0].body.messages[0].content[0].source.media_type, "image/png");

  const gif = Buffer.from("GIF89a..........").toString("base64");
  const wrong = await run(meal({ ...fixtures.kaesespaetzle, photo: gif }), {}, message(goodKaesespaetzle));
  assert.equal(wrong.response.status, 415);
  assert.deepEqual(await wrong.response.json(), { reason: "type" });
  assert.equal(wrong.calls.length, 0);

  const big = Buffer.alloc(600 * 1024 + 1, 7);
  big.set([0xff, 0xd8, 0xff]);
  const oversized = await run(meal({ ...fixtures.kaesespaetzle, photo: big.toString("base64") }), {}, message(goodKaesespaetzle));
  assert.equal(oversized.response.status, 413);
  assert.equal(oversized.calls.length, 0);
  assert.equal(oversized.counters.written, 0);

  const justFits = Buffer.alloc(600 * 1024, 7);
  justFits.set([0xff, 0xd8, 0xff]);
  assert.equal((await run(meal({ ...fixtures.kaesespaetzle, photo: justFits.toString("base64") }), {}, message(goodKaesespaetzle))).response.status, 200);

  for (const photo of ["not base64!", "abc", 42, ""]) {
    const { response } = await run(meal({ ...fixtures.kaesespaetzle, photo }), {});
    assert.equal(response.status, 400, String(photo));
  }
});

test("a bad confidence or gram range falls back for that food instead of failing the meal", async () => {
  const answer = structuredClone(goodKaesespaetzle);
  answer.foods[0].confidence = 1.4;
  answer.foods[1].confidence = -0.2;
  answer.foods[1].grams = { estimate: 30, low: 40, high: 45 };
  answer.foods[2].grams = { estimate: 3, low: 1 };
  answer.foods[3].grams = { estimate: 0, low: 0, high: 10 };
  answer.foods[4].grams = "250 ml";
  const { response } = await run(meal(), {}, message(answer));
  assert.equal(response.status, 200);
  const foods = (await response.json()).foods;
  assert.deepEqual(foods.map((food) => food.confidence), [0.5, 0.5, 0.7, 0.85, 0.95]);
  assert.deepEqual(foods.map((food) => food.grams), [{ estimate: 350, low: 280, high: 450 }, null, null, null, null]);
});

test("grams may be null and assumed marks a hidden food without adding one", async () => {
  const input = {
    text: "Salad fried in olive oil",
    foods: [
      { query: "salad", amount: null, candidates: [{ id: "bls:G530100", name: "Green salad", kind: "ingredient", verified: true, serving: "80 g" }] },
      { query: "olive oil", amount: null, candidates: [{ id: "bls:F110000", name: "Olive oil", kind: "ingredient", verified: true, serving: "1 tbsp (10 g)" }] },
    ],
  };
  const answer = {
    foods: [
      { query: "salad", pick: "bls:G530100", amount: 1, unit: "bowl", role: "main", partOf: null, confidence: 0.6, grams: null, assumed: false },
      { query: "olive oil", pick: "bls:F110000", amount: 1, unit: "tbsp", role: "sauce", partOf: null, confidence: 0.4, grams: { estimate: 10, low: 5, high: 20 }, assumed: true },
      { query: "butter", pick: null, amount: 10, unit: "g", role: "sauce", partOf: null, confidence: 0.3, grams: null, assumed: true },
    ],
    merged: [],
  };
  const { response } = await run(meal(input), {}, message(answer));
  const foods = (await response.json()).foods;
  assert.deepEqual(foods.map((food) => food.query), ["salad", "olive oil"]);
  assert.equal("assumed" in foods[0], false);
  assert.equal(foods[0].grams, null);
  assert.equal(foods[1].assumed, true);
});

test("more than 12 foods or more than 8 candidates answers 400 without asking", async () => {
  const food = (i, n = 1) => ({
    query: `food ${i}`,
    amount: null,
    candidates: Array.from({ length: n }, (_, j) => ({ id: `x:${i}:${j}`, name: `food ${i}`, kind: "ingredient", verified: false, serving: null })),
  });
  for (const foods of [Array.from({ length: 13 }, (_, i) => food(i)), [food(0, 9)]]) {
    const { response, calls, counters } = await run(meal({ text: "a lot", foods }), {}, message(goodKaesespaetzle));
    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { reason: "malformed" });
    assert.equal(calls.length, 0);
    assert.equal(counters.written, 0);
  }
  const { response } = await run(meal({ text: "just enough", foods: Array.from({ length: 12 }, (_, i) => food(i, 8)) }), {}, message({ foods: [], merged: [] }));
  assert.equal(response.status, 200);
});

test("malformed requests answer 400", async () => {
  const good = fixtures.kaesespaetzle;
  const candidate = good.foods[0].candidates[0];
  for (const body of [
    "{not json",
    "[]",
    { ...good, text: "" },
    { ...good, foods: [] },
    { ...good, foods: [good.foods[0], good.foods[0]] },
    { ...good, foods: [{ ...good.foods[0], query: 7 }] },
    { ...good, foods: [{ ...good.foods[0], candidates: [{ ...candidate, kind: "meal" }] }] },
    { ...good, foods: [{ ...good.foods[0], candidates: [{ ...candidate, verified: "yes" }] }] },
    { ...good, foods: [{ ...good.foods[0], candidates: [{ ...candidate, id: "" }] }] },
  ]) {
    const { response, calls } = await run(meal(body), {});
    assert.equal(response.status, 400, JSON.stringify(body).slice(0, 80));
    assert.equal(calls.length, 0);
  }
});

test("a body over 32 KB answers 413 and a wrong type 415", async () => {
  const big = { ...fixtures.kaesespaetzle, text: "x".repeat(33 * 1024) };
  assert.equal((await run(meal(big), {})).response.status, 413);
  assert.equal((await run(meal(fixtures.kaesespaetzle, { type: "text/plain" }), {})).response.status, 415);
});

test("a meal counts against the same allowance as a photo", async () => {
  const { counters } = await run(meal(), { seed: { [`global:${today()}`]: 9 } }, message(goodKaesespaetzle));
  assert.equal(counters.count(await counterKey("device", device)), 1);
  assert.equal(counters.count(await counterKey("address", "203.0.113.7")), 1);
  assert.equal(counters.count(`global:${today()}`), 10);
});

for (const [name, seed, reason] of [
  ["device", async () => ({ [await counterKey("device", device)]: 80 }), "device"],
  ["address", async () => ({ [await counterKey("address", "203.0.113.7")]: 240 }), "device"],
  ["global", async () => ({ [`global:${today()}`]: 6000 }), "global"],
]) {
  test(`a meal is refused at the ${name} cap with 429 before Anthropic is called`, async () => {
    const { response, calls } = await run(meal(), { seed: await seed() }, message(goodKaesespaetzle));
    assert.equal(response.status, 429);
    assert.deepEqual(await response.json(), { reason });
    assert.equal(calls.length, 0);
  });
}

test("an upstream failure or an unreadable answer answers 503", async () => {
  for (const steps of [[529, 529], [message(goodKaesespaetzle, { stop_reason: "max_tokens" })], [message({ foods: "none" })]]) {
    const { response } = await run(meal(), {}, ...steps);
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { reason: "upstream" });
  }
});

test("the log line carries counts, never the meal", async () => {
  const lines = [];
  const original = console.log;
  console.log = (line) => lines.push(line);
  try {
    await run(meal(), {}, message(goodKaesespaetzle));
  } finally {
    console.log = original;
  }
  assert.equal(lines.length, 1);
  const line = JSON.parse(lines[0]);
  assert.equal(line.meal, "ok");
  assert.equal(line.foods, 5);
  assert.equal(line.picked, 5);
  assert.equal(line.photo, false);
  // (0.9 + 0.8 + 0.7 + 0.85 + 0.95) / 5 = 0.84
  assert.equal(line.confidence, 0.8);
  assert.doesNotMatch(lines[0], /Käsespätzle|onion|salad|water|akari:recipe|bls:/i);
});
