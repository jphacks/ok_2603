import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTypescript } from "../scripts/load-typescript.mjs";
import { validateData } from "../scripts/validate-election-data.mjs";

const model = await loadTypescript("../src/election/model.ts");
const data = await loadTypescript("../src/election/data.ts");
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
  assert.ok(data.glossary.length >= 25);
  assert.ok(
    data.glossary.every((item) =>
      item.sources.some((itemSource) =>
        new URL(itemSource.url).hostname.endsWith(".soumu.go.jp"),
      ),
    ),
  );
  assert.ok(
    model
      .searchGlossary(data.glossary, "比例代表")
      .some((item) => item.term === "比例代表選挙"),
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
