import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { counterKey, device, message, run, today } from "./helpers.mjs";

const fixtures = JSON.parse(readFileSync(new URL("./fixtures/meals.json", import.meta.url), "utf8"));
const scoreboard = "0a1b2c3d-4e5f-4a6b-8c7d-9e0f1a2b3c4d";
const address = "203.0.113.7";
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, ...new Array(64).fill(7)]);
const mealAnswer = { foods: [], merged: [] };
const photoAnswer = { food: true, main: "Käsespätzle", meal: "1 plate of Käsespätzle" };

function meal(id) {
  return new Request("https://api.joinakari.com/meal", {
    method: "POST",
    body: JSON.stringify(fixtures.kaesespaetzle),
    headers: { "content-type": "application/json", "x-akari-device": id, "cf-connecting-ip": address },
  });
}

function photo(id) {
  return new Request("https://api.joinakari.com/photo", {
    method: "POST",
    body: jpeg,
    headers: { "content-type": "image/jpeg", "x-akari-device": id, "cf-connecting-ip": address },
  });
}

// The device and address counters for this id, both at today's cap, and the global one below it.
async function atCaps(id) {
  return {
    [await counterKey("device", id)]: "80",
    [await counterKey("address", address)]: "240",
    [`global:${today()}`]: "9",
  };
}

async function logged(work) {
  const lines = [];
  const original = console.log;
  console.log = (line) => lines.push(JSON.parse(line));
  try {
    return { result: await work(), lines };
  } finally {
    console.log = original;
  }
}

for (const [name, request, answer] of [
  ["meal", meal, mealAnswer],
  ["photo", photo, photoAnswer],
]) {
  test(`a ${name} from the scoreboard passes the device and address caps and still spends the global one`, async () => {
    const seed = await atCaps(scoreboard);
    // The secret is matched trimmed and without regard to case.
    const env = { SCOREBOARD_DEVICE: ` ${scoreboard.toUpperCase()}\n` };
    const { result, lines } = await logged(() => run(request(scoreboard), { seed, env }, message(answer)));
    assert.equal(result.response.status, 200);
    assert.equal(result.calls.length, 1);
    assert.equal(result.counters.store.get(`global:${today()}`), "10");
    assert.equal(result.counters.store.get(await counterKey("device", scoreboard)), "80");
    assert.equal(result.counters.store.get(await counterKey("address", address)), "240");
    assert.deepEqual(result.counters.puts.map((put) => put.key), [`global:${today()}`]);
    assert.equal(lines.length, 1);
    assert.equal(lines[0].scoreboard, true);
  });
}

test("the global cap still stops the scoreboard", async () => {
  const seed = { [`global:${today()}`]: "6000" };
  const { response, calls } = await run(meal(scoreboard), { seed, env: { SCOREBOARD_DEVICE: scoreboard } }, message(mealAnswer));
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), { reason: "global" });
  assert.equal(calls.length, 0);
});

test("any other device is refused at the device cap as before, and logs nothing new", async () => {
  const env = { SCOREBOARD_DEVICE: scoreboard };
  const refused = await run(meal(device), { seed: await atCaps(device), env }, message(mealAnswer));
  assert.equal(refused.response.status, 429);
  assert.deepEqual(await refused.response.json(), { reason: "device" });
  assert.equal(refused.calls.length, 0);

  const { lines } = await logged(() => run(meal(device), { env }, message(mealAnswer)));
  assert.equal("scoreboard" in lines[0], false);
});

test("without the secret, or with an empty one, nothing is exempt", async () => {
  for (const env of [{}, { SCOREBOARD_DEVICE: "" }, { SCOREBOARD_DEVICE: "  " }]) {
    const { response, calls } = await run(meal(scoreboard), { seed: await atCaps(scoreboard), env }, message(mealAnswer));
    assert.equal(response.status, 429);
    assert.deepEqual(await response.json(), { reason: "device" });
    assert.equal(calls.length, 0);
  }
});
