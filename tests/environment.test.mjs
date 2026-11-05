import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validateEnvironment,
  normalizeConnectionString,
  directFromPooled,
} from "../scripts/env.mjs";

const good = {
  DATABASE_URL:
    "postgresql://user:someActualRandomValue@ep-unit-test-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  DATABASE_URL_UNPOOLED:
    "postgresql://user:someActualRandomValue@ep-unit-test.ap-southeast-1.aws.neon.tech/neondb?sslmode=require",
  PORT: "3000",
};
test("koneksi pooled/direct pada branch sama diterima", () =>
  assert.deepEqual(validateEnvironment(good), []));
test("koneksi kosong ditolak dengan instruksi", () =>
  assert.ok(validateEnvironment({}).length >= 2));
test("placeholder lama ditolak", () =>
  assert.ok(
    validateEnvironment({
      ...good,
      DATABASE_URL: good.DATABASE_URL.replace("ep-unit-test", "ep-NAMA-BRANCH"),
    }).length,
  ));
test("direct tidak boleh memakai pooler", () =>
  assert.ok(
    validateEnvironment({ ...good, DATABASE_URL_UNPOOLED: good.DATABASE_URL })
      .length,
  ));
test("dua branch berbeda ditolak", () =>
  assert.ok(
    validateEnvironment({
      ...good,
      DATABASE_URL_UNPOOLED: good.DATABASE_URL_UNPOOLED.replace(
        "unit-test",
        "branch-other",
      ),
    }).length,
  ));
test("port bukan angka ditolak", () =>
  assert.ok(validateEnvironment({ ...good, PORT: "abc" }).length));
test("setup menerima URL, kutip, assignment .env, dan perintah psql", () => {
  for (const input of [
    good.DATABASE_URL,
    `'${good.DATABASE_URL}'`,
    `DATABASE_URL="${good.DATABASE_URL}"`,
    `psql '${good.DATABASE_URL}'`,
  ]) {
    assert.equal(normalizeConnectionString(input), good.DATABASE_URL);
  }
});
test("direct dapat dibuat dari pooled pada branch/database/role yang sama", () => {
  assert.equal(directFromPooled(good.DATABASE_URL), good.DATABASE_URL_UNPOOLED);
});
test("pembuatan direct tidak mengubah URL asing atau input rusak", () => {
  assert.equal(directFromPooled("bukan URL"), "");
  assert.equal(
    directFromPooled(good.DATABASE_URL.replace(".neon.tech", ".example.org")),
    "",
  );
});
