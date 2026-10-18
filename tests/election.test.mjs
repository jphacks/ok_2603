import assert from "node:assert/strict";
import { test } from "node:test";
import { loadTypescript } from "../scripts/load-typescript.mjs";
import { validateData } from "../scripts/validate-election-data.mjs";

const model = await loadTypescript("../src/election/model.ts");
const data = await loadTypescript("../src/election/data.ts");
const mapSearch = await loadTypescript("../src/election/mapSearch.ts");
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
test("那覇市長選の公式候補者一覧を比較対象として掲載し、公約は未収録のまま扱う", () => {
  const election = data.elections.find((item) => item.id === "naha-mayor-2026");
  const candidates = data.candidates.filter(
    (item) => item.electionId === "naha-mayor-2026",
  );
  assert.equal(election?.date, "2026-10-25");
  assert.deepEqual(
    candidates.map((item) => item.name),
    ["久手堅 さちこ", "矢島 ケント", "知念 さとる", "ヨシミネ リョウ"],
  );
  assert.ok(
    candidates.every(
      (item) =>
        item.sources[0]?.url.endsWith(
          "r8sityou_riltukouhosyaitiran_0930.pdf",
        ) && item.pledges.length === 0,
    ),
  );
});
test("知事選挙は種別で判別し、既存の名称のみのデータにも対応する", () => {
  assert.equal(model.isGovernorElection({...election, kind:"governor"}), true);
  assert.equal(model.isGovernorElection({...election, name:"テスト専用知事選挙"}), true);
  assert.equal(model.isGovernorElection({...election, kind:"municipal-mayor"}), false);
  assert.equal(model.isGovernorElection(election), false);
});
test("過去選挙は重複を除き、投票日の新しい順に最大6件を返す", () => {
  const elections = Array.from({ length: 8 }, (_, index) => ({
    ...election,
    id: `past-election-${index}`,
    name: `テスト専用選挙${index}`,
    municipality: "那覇市",
    date: `202${index}-01-01`,
  }));
  elections.push({
    ...elections[7],
    id: "duplicate-past-election",
  });
  const result = model.recentUniqueElections(elections);
  assert.equal(result.length, 6);
  assert.deepEqual(
    result.map((item) => item.date),
    ["2027-01-01", "2026-01-01", "2025-01-01", "2024-01-01", "2023-01-01", "2022-01-01"],
  );
  assert.equal(result.filter((item) => item.date === "2027-01-01").length, 1);
});
test("41市町村は公式の県議13選挙区に重複なく対応する", () => {
  assert.equal(model.prefecturalDistricts.length, 13);
  const districtCities = model.prefecturalDistricts.flatMap(d => d.municipalities);
  assert.deepEqual([...districtCities].sort(), [...model.municipalities].sort());
  assert.equal(new Set(districtCities).size, 41);
  assert.equal(model.prefecturalDistrictFor("那覇市").name, "那覇市・南部離島選挙区");
  assert.equal(model.prefecturalDistrictFor("南風原町").name, "島尻・南城市選挙区");
  assert.equal(model.prefecturalDistrictFor("伊是名村").name, "国頭郡選挙区");
  const assembly = {...election, kind:"prefectural-assembly", district:"那覇市・南部離島選挙区"};
  assert.equal(model.electionAppliesToMunicipality(assembly,"渡嘉敷村"), true);
  assert.equal(model.electionAppliesToMunicipality(assembly,"名護市"), false);
  assert.equal(model.electionAppliesToMunicipality({...assembly, district:undefined, name:"処理検証 県議会議員選挙（那覇市・南部離島選挙区）"},"久米島町"), true);
  assert.equal(model.electionAppliesToMunicipality({...election, municipality:"名護市"},"那覇市"), false);
});
test("沖縄県内の41市町村を重複なく選択できる", () => {
  assert.equal(model.municipalities.length, 41);
  assert.equal(new Set(model.municipalities).size, 41);
  assert.ok(model.municipalities.includes("那覇市"));
  assert.deepEqual(Object.keys(model.municipalityReadings).sort(), [...model.municipalities].sort());
  assert.ok(Object.values(model.municipalityReadings).every(reading => /^[ぁ-ゖー]+$/.test(reading)));
});
test("市町村は1文字・読み仮名・カタカナ・部分一致で検索できる", () => {
  for (const query of ["な", "ナ", "ﾅ"]) {
    const results = model.searchMunicipalities(query);
    assert.ok(results.includes("那覇市"));
    assert.ok(results.includes("名護市"));
    assert.ok(results.indexOf("名護市") < results.indexOf("与那国町"));
  }
  for (const query of ["なは", "ナハ", "ﾅﾊ", " なは ", "はし"]) {
    assert.deepEqual(model.searchMunicipalities(query), ["那覇市"]);
  }
  assert.deepEqual(model.searchMunicipalities("那"), ["那覇市", "与那原町", "与那国町"]);
  assert.deepEqual(model.searchMunicipalities("なご"), ["名護市"]);
  assert.deepEqual(model.searchMunicipalities("沖縄"), ["沖縄市"]);
  assert.deepEqual(model.searchMunicipalities("はえばる"), ["南風原町"]);
  assert.deepEqual(model.searchMunicipalities("ぐすく"), ["豊見城市", "北中城村", "中城村"]);
  for (const name of model.municipalities) assert.ok(model.searchMunicipalities(model.municipalityReadings[name]).includes(name));
  for (const query of ["", "  ", "東京都", "市町村なし"]) assert.deepEqual(model.searchMunicipalities(query), []);
});
test("地図検索URLを安全に組み立てる", () => {
  const url = new URL(mapSearch.mapSearchUrl("那覇市", "首里支所"));
  assert.equal(url.origin, "https://www.google.com");
  assert.equal(url.pathname, "/maps/search/");
  assert.equal(url.searchParams.get("query"), "沖縄県 那覇市 首里支所");
});
test("住所を含む投票場所の地図検索URLを組み立てる", () => {
  const url = new URL(
    mapSearch.mapSearchUrl("宜野湾市", "普天間小学校 普天間1-10-1"),
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
test("現職県議の氏名・選挙区検索と出典検証を候補者と分けて扱う", () => {
  const member = {id:"test-member",name:"テスト専用氏名ＡＢＣ",faction:null,district:"テスト専用選挙区",sources:[source]};
  for (const query of ["氏名", "abc", "選挙区", "氏名 選挙区", ""]) {
    assert.deepEqual(model.searchCouncilMembers([member], query), [member]);
  }
  assert.deepEqual(model.searchCouncilMembers([member], "未収録"), []);
  assert.deepEqual(model.searchCouncilMembers([{...member,district:null}], "選挙区"), []);
  const input={elections:[],candidates:[],glossary:[],councilMembers:[member]};
  assert.deepEqual(validateData(input,model), []);
  assert.ok(validateData({...input,councilMembers:[{...member,sources:[]}]},model).some(error=>error.includes("確認日が必要")));
  assert.equal(data.councilMembers.length,0);
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
