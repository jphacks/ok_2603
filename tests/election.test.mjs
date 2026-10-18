import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTypescript } from "../scripts/load-typescript.mjs";
import { validateData } from "../scripts/validate-election-data.mjs";

const model = await loadTypescript("../src/election/model.ts");
const data = await loadTypescript("../src/election/data.ts");
const earlyVotingPlaces = await loadTypescript(
  "../src/election/earlyVotingPlaces.ts",
);
// 以下は処理検証専用。公開data.tsには登録せず、実在人物・政策を表さない。
const source = {
  url: "https://example.invalid/test-only",
  publisher: "テスト用発行元",
  checkedAt: "2026-10-17",
};
const recorded = (value) => ({ status: "recorded", value, sources: [source] });
const candidate = {
  id: "test-only",
  electionId: "test-election",
  name: "テスト専用氏名",
  party: recorded("テスト専用所属"),
  photo: model.missing(),
  profile: model.missing(),
  speeches: model.missing(),
  votes: model.missing(),
  history: model.missing(),
  sources: [source],
  pledges: [
    {
      id: "test-pledge",
      text: recorded("検索対象ＡＢＣ 処理確認用"),
      checks: model.emptyChecks(),
    },
  ],
};
const election = {
  id: "test-election",
  name: "テスト専用選挙",
  prefectureIds: ["沖縄県"],
  level: "local",
  period: "past",
  date: "2020-01-01",
  sources: [source],
  turnout: model.missing(),
};

test("対象地域は沖縄県のみ", () => {
  assert.deepEqual(model.prefectures, ["沖縄県"]);
});
test("沖縄県内の41市町村を重複なく選択できる", () => {
  assert.equal(model.municipalities.length, 41);
  assert.equal(new Set(model.municipalities).size, 41);
  assert.ok(model.municipalities.includes("那覇市"));
});
test("過去の期日前投票所資料を全市町村分だけ掲載し、地図検索URLを安全に組み立てる", () => {
  const places = earlyVotingPlaces.earlyVotingPlacesByMunicipality;
  assert.deepEqual(
    Object.keys(places).sort(),
    [...model.municipalities].sort(),
  );
  for (const venues of Object.values(places)) {
    assert.ok(venues.length > 0);
    assert.equal(new Set(venues).size, venues.length);
  }
  assert.equal(
    earlyVotingPlaces.earlyVotingPlacesSource.electionDate,
    "2026-09-13",
  );
  const url = new URL(earlyVotingPlaces.mapSearchUrl("那覇市", "首里支所"));
  assert.equal(url.origin, "https://www.google.com");
  assert.equal(url.pathname, "/maps/search/");
  assert.equal(url.searchParams.get("query"), "沖縄県 那覇市 首里支所");
});
test("宜野湾市の当日投票所は提供された4施設と所在地を表示する", () => {
  assert.deepEqual(
    earlyVotingPlaces.electionDayVotingPlacesByMunicipality["宜野湾市"],
    [
      { name: "野嵩一区自治会事務所", address: "野嵩2－21－1" },
      { name: "普天間小学校", address: "普天間1-10-1" },
      { name: "普天間第二小学校クラブハウス", address: "新城2-8-19" },
      { name: "普天間中学校体育館", address: "新城2-41-1" },
    ],
  );
  const url = new URL(
    earlyVotingPlaces.mapSearchUrl("宜野湾市", "普天間小学校 普天間1-10-1"),
  );
  assert.equal(
    url.searchParams.get("query"),
    "沖縄県 宜野湾市 普天間小学校 普天間1-10-1",
  );
});
test("氏名・政党・公約を検索し、全角と半角を正規化する", () => {
  for (const query of ["氏名", "所属", "abc", "ＡＢＣ", "検索対象 処理確認"])
    assert.deepEqual(model.searchCandidates([candidate], query), [candidate]);
  assert.deepEqual(model.searchCandidates([candidate], "一致しない"), []);
  assert.deepEqual(model.searchCandidates([candidate], "   "), [candidate]);
  assert.deepEqual(
    model.searchCandidates(
      [{ ...candidate, party: model.missing(), pledges: [] }],
      "未収録",
    ),
    [],
  );
});
test("比較に人数制限がなく、重複せず追加・解除できる", () => {
  let ids = [];
  for (let i = 0; i < 100; i++) ids = model.toggleSelection(ids, `test-${i}`);
  assert.equal(ids.length, 100);
  ids = model.toggleSelection(ids, "test-5");
  assert.equal(ids.length, 99);
  assert.ok(!ids.includes("test-5"));
});
test("公開データの整合性と、空状態を有効な未収録として扱う", () => {
  assert.deepEqual(validateData({ elections: [], candidates: [], glossary: [] }, model), []);
  assert.ok(!data.candidates.some(item => item.id === 'test-only'));
  assert.deepEqual(validateData(data, model), []);
  assert.ok(data.glossary.length >= 75);
  assert.deepEqual(
    Object.keys(data.glossaryReadings).sort(),
    data.glossary.map((item) => item.term).sort(),
  );
  assert.ok(
    Object.values(data.glossaryReadings).every((reading) =>
      /^[ぁ-ゖー]+$/.test(reading),
    ),
  );
  assert.ok(
    data.glossary.some((item) => item.term === "公示と告示") &&
      data.glossary.some((item) => item.term === "与党と野党"),
  );
  assert.ok(
    !["公示", "告示", "与党", "野党"].some((term) =>
      data.glossary.some((item) => item.term === term),
    ),
  );
  assert.ok(
    data.glossary.every((item) =>
      item.sources.some((itemSource) =>
        [
          "soumu.go.jp",
          "laws.e-gov.go.jp",
        ].includes(new URL(itemSource.url).hostname) ||
        new URL(itemSource.url).hostname.endsWith(".soumu.go.jp"),
      ),
    ),
  );
  assert.match(
    data.glossary.find((item) => item.term === "公示と告示").definition,
    /国政選挙.*告示/,
  );
  assert.match(
    data.glossary.find((item) => item.term === "公示と告示").definition,
    /地方選挙/,
  );
  assert.match(
    data.glossary.find((item) => item.term === "与党と野党").definition,
    /内閣に参加していない/,
  );
  assert.ok(
    model
      .searchGlossary(data.glossary, "比例代表")
      .some((item) => item.term === "比例代表選挙"),
  );
  assert.ok(
    model
      .searchGlossary(
        data.glossary,
        "ないかくふしんにん",
        data.glossaryReadings,
      )
      .some((item) => item.term === "内閣不信任決議"),
  );
  assert.ok(
    model
      .searchGlossary(data.glossary, "けんぽう", data.glossaryReadings)
      .some((item) => item.term === "憲法改正"),
  );
  assert.deepEqual(model.searchGlossary(data.glossary, "該当しない語"), []);
  const outOfScope = {
    elections: [{ ...election, prefectureIds: ["沖縄県", "東京都"] }],
    candidates: [],
    glossary: [],
  };
  assert.ok(
    validateData(outOfScope, model).some((error) =>
      error.includes("対象都道府県が不正"),
    ),
  );
});
test("出典不足・不明な選挙・不正な投票率を検出する", () => {
  const valid = {
    elections: [election],
    candidates: [candidate],
    glossary: [],
  };
  assert.deepEqual(validateData(valid, model), []);
  const invalid = structuredClone(valid);
  invalid.candidates[0].electionId = "missing";
  invalid.candidates[0].sources = [];
  invalid.elections[0].turnout = recorded([{ age: "test", rate: 101 }]);
  assert.equal(validateData(invalid, model).length, 3);
});
test("確認できず・該当記録なしには確認範囲と出典を要求する", () => {
  for (const status of ["not-confirmed", "no-record"]) {
    const fixture = {
      elections: [election],
      candidates: [
        {
          ...candidate,
          profile: { status, note: "テスト範囲のみ", sources: [source] },
        },
      ],
      glossary: [],
    };
    assert.deepEqual(validateData(fixture, model), []);
    fixture.candidates[0].profile.note = "";
    assert.equal(validateData(fixture, model).length, 1);
  }
});
