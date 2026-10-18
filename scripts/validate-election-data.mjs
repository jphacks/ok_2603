import { pathToFileURL } from "node:url";
import { loadTypescript } from "./load-typescript.mjs";

export function validateData(
  { elections, candidates, glossary, councilMembers = [] },
  { prefectures, checkLabels, sourceIsValid },
) {
  const errors = [];
  const expect = (condition, label) => {
    if (!condition) errors.push(label);
  };
  const text = (value) => typeof value === "string" && value.trim().length > 0;
  const sources = (list, path) =>
    expect(
      Array.isArray(list) && list.length > 0 && list.every(sourceIsValid),
      `${path}: 公式URL・発行元・確認日が必要`,
    );
  const entry = (value, path, validateValue) => {
    if (
      !value ||
      !["recorded", "unrecorded", "not-confirmed", "no-record"].includes(
        value.status,
      )
    ) {
      errors.push(`${path}: 不正な記載状況`);
      return;
    }
    if (value.status === "unrecorded") {
      expect(!("value" in value), `${path}: 未収録には値を含めない`);
      return;
    }
    sources(value.sources, path);
    if (value.status === "recorded")
      expect(validateValue(value.value), `${path}: 不正な値`);
    else {
      expect(text(value.note), `${path}: 確認範囲・理由が必要`);
      expect(!("value" in value), `${path}: 未確認の値を含めない`);
    }
  };
  const uniqueIds = (items, path) => {
    expect(
      items.every((item) => text(item.id)),
      `${path}: IDが必要`,
    );
    expect(
      new Set(items.map((item) => item.id)).size === items.length,
      `${path}: IDが重複`,
    );
  };
  uniqueIds(elections, "elections");
  uniqueIds(candidates, "candidates");
  uniqueIds(councilMembers, "councilMembers");
  for (const member of councilMembers) {
    const path = `councilMember:${member.id}`;
    expect(text(member.name), `${path}: 氏名が必要`);
    expect(member.faction === null || text(member.faction), `${path}: 会派は文字列または未収録(null)`);
    expect(member.district === null || text(member.district), `${path}: 選挙区は文字列または未収録(null)`);
    sources(member.sources, path);
  }
  for (const item of elections) {
    const path = `election:${item.id}`;
    expect(text(item.name), `${path}: 名称が必要`);
    expect(
      item.prefectureIds?.length > 0 &&
        item.prefectureIds.every((id) => prefectures.includes(id)),
      `${path}: 対象都道府県が不正`,
    );
    expect(["national", "local"].includes(item.level), `${path}: 種類が不正`);
    expect(
      ["current", "past"].includes(item.period),
      `${path}: 現在・過去の指定が必要`,
    );
    expect(/^\d{4}-\d{2}-\d{2}$/.test(item.date), `${path}: 投票日が必要`);
    sources(item.sources, path);
    entry(
      item.turnout,
      `${path}.turnout`,
      (rows) =>
        Array.isArray(rows) &&
        rows.length > 0 &&
        rows.every(
          (row) =>
            text(row.age) &&
            typeof row.rate === "number" &&
            row.rate >= 0 &&
            row.rate <= 100,
        ),
    );
  }
  for (const item of candidates) {
    const path = `candidate:${item.id}`;
    expect(text(item.name), `${path}: 氏名が必要`);
    expect(
      elections.some((election) => election.id === item.electionId),
      `${path}: 選挙IDが存在しない`,
    );
    sources(item.sources, path);
    entry(item.party, `${path}.party`, text);
    entry(item.photo, `${path}.photo`, (value) => /^https:\/\//.test(value));
    for (const field of ["profile", "speeches", "votes", "history"])
      entry(
        item[field],
        `${path}.${field}`,
        (value) =>
          Array.isArray(value) && value.length > 0 && value.every(text),
      );
    expect(Array.isArray(item.pledges), `${path}: 公約配列が必要`);
    uniqueIds(item.pledges || [], `${path}.pledges`);
    for (const pledge of item.pledges || []) {
      entry(pledge.text, `${path}.pledge:${pledge.id}`, text);
      if (pledge.summary !== undefined)
        expect(text(pledge.summary), `${path}.pledge:${pledge.id}.summary: 要約が必要`);
      for (const label of checkLabels)
        entry(
          pledge.checks?.[label],
          `${path}.pledge:${pledge.id}.${label}`,
          text,
        );
    }
  }
  expect(
    new Set(glossary.map((item) => item.term)).size === glossary.length,
    "glossary: 用語が重複",
  );
  for (const item of glossary) {
    expect(
      text(item.term) && text(item.definition),
      "glossary: 用語と解説が必要",
    );
    sources(item.sources, `glossary:${item.term}`);
  }
  return errors;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [data, model] = await Promise.all([
    loadTypescript("../src/election/data.ts"),
    loadTypescript("../src/election/model.ts"),
  ]);
  const errors = validateData(data, model);
  if (errors.length) {
    console.error(errors.join("\n"));
    process.exitCode = 1;
  } else
    console.log(
      `選挙データ検証成功: 選挙${data.elections.length}件 / 候補者${data.candidates.length}人 / 用語${data.glossary.length}件 / 現職県議${data.councilMembers.length}人`,
    );
}
