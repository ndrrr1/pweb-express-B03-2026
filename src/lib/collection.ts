import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";

const statuses = [
  200, 200, 200, 200, 404, 201, 409, 400, 200, 200, 200, 201, 409, 200, 400,
  200, 400, 201, 201, 409, 400, 200, 200, 409, 200, 200, 404, 404,
];
const assertions: Record<number, string[]> = {
  2: ["pm.expect(body.metadata?.totalItems).to.eql(20);"],
  3: ["pm.expect(body.metadata?.totalItems).to.eql(10);"],
  4: [
    'pm.expect(body.data?.name).to.eql("Layla");',
    "pm.expect(body.data?.skins?.length).to.eql(11);",
  ],
  6: ["pm.expect(body.data?.id).to.eql(134);"],
  9: ["pm.expect(body.metadata?.totalItems).to.eql(11);"],
  10: ["pm.expect(body.metadata?.totalItems).to.eql(98);"],
  11: [
    'pm.expect(body.data?.name).to.eql("Silverbolt Raiko");',
    'pm.expect(body.data?.hero?.name).to.eql("Selena");',
  ],
  12: [
    "pm.expect(body.data?.id).to.eql(4);",
    "pm.expect(body.data?.bp).to.eql(10000);",
    "pm.expect(body.data?.diamond).to.eql(0);",
  ],
  14: ["pm.expect(body.data?.diamond).to.eql(706);"],
  16: [
    "pm.expect(body.data?.bp).to.eql(10300);",
    "pm.expect(body.data?.bpEarned).to.eql(300);",
  ],
  18: [
    "pm.expect(body.data?.balance?.diamond).to.eql(107);",
    "pm.expect(body.data?.pricePaid).to.eql(599);",
  ],
  19: [
    "pm.expect(body.data?.balance?.bp).to.eql(8300);",
    "pm.expect(body.data?.pricePaid).to.eql(2000);",
  ],
  22: [
    "pm.expect(body.data?.heroes?.map(h => h.heroId).sort((a,b)=>a-b)).to.eql([18,22]);",
  ],
  23: ['pm.expect(body.data?.nickname).to.eql("MageITS");'],
  25: [
    "pm.expect(body.data?.totalPlayers).to.eql(4);",
    "pm.expect(body.data?.totalHeroesOwned).to.eql(6);",
    "pm.expect(body.data?.totalDiamond).to.eql(3074);",
    'pm.expect(body.data?.mostOwnedHero).to.eql({heroId:18,name:"Layla",owners:2});',
  ],
};

export async function buildCollection(baseUrl = "http://localhost:3000") {
  const collection = JSON.parse(
    await readFile(
      new URL(
        "../../postman/mlbb-shop-testcase.original.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  collection.info._postman_id = randomUUID();
  collection.info.name = "MLBB Shop - 28 Testcase Teruji";
  collection.auth = { type: "noauth" };
  collection.item.forEach((item: Record<string, any>, index: number) => {
    const code = statuses[index]!;
    const url = new URL(item.request.url.raw);
    const actual = new URL(baseUrl);
    url.protocol = actual.protocol;
    url.host = actual.host;
    item.id = randomUUID();
    item.response = [];
    item.request.url = {
      raw: url.href,
      protocol: url.protocol.slice(0, -1),
      host: url.hostname.split("."),
      port: url.port,
      path: url.pathname.slice(1).split("/"),
      query: [...url.searchParams].map(([key, value]) => ({ key, value })),
      variable: [],
    };
    item.event = [
      {
        listen: "test",
        script: {
          id: randomUUID(),
          type: "text/javascript",
          exec: [
            `pm.test('HTTP ${code}', function(){ pm.response.to.have.status(${code}); });`,
            `pm.test('Response dan hasil sesuai modul', function(){`,
            "  const body=pm.response.json();",
            `  pm.expect(body.status).to.eql(${code < 400});`,
            '  pm.expect(body.message).to.be.a("string");',
            ...(assertions[index + 1] || []).map((line) => `  ${line}`),
            "});",
          ],
        },
      },
    ];
  });
  return collection;
}
