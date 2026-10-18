import municipalityNames from "../../shared/municipalities.json";
export type Source = { url: string; publisher: string; checkedAt: string };
export type Entry<T> =
  | { status: "recorded"; value: T; sources: Source[] }
  | { status: "unrecorded"; sources?: never }
  | { status: "not-confirmed" | "no-record"; note: string; sources: Source[] };

export const statusLabels = {
  recorded: "記載あり",
  unrecorded: "未収録",
  "not-confirmed": "確認できず",
  "no-record": "該当記録なし",
};
export const checkLabels = [
  "何をするか",
  "誰を対象にするか",
  "いつまでに行うか",
  "財源・実施方法",
  "成果の確認方法",
] as const;
export type CheckLabel = (typeof checkLabels)[number];
export type Pledge = {
  id: string;
  text: Entry<string>;
  checks: Record<CheckLabel, Entry<string>>;
};
export type Candidate = {
  id: string;
  electionId: string;
  name: string;
  party: Entry<string>;
  photo: Entry<string>;
  pledges: Pledge[];
  profile: Entry<string[]>;
  speeches: Entry<string[]>;
  votes: Entry<string[]>;
  history: Entry<string[]>;
  sources: Source[];
};
export type Election = {
  id: string;
  name: string;
  kind?: "governor" | "prefectural-assembly" | "municipal-mayor" | "municipal-assembly" | "national";
  prefectureIds: string[];
  municipality?: string;
  district?: string;
  level: "national" | "local";
  period: "current" | "past";
  date: string;
  sources: Source[];
  turnout: Entry<{ age: string; rate: number }[]>;
};
export function isGovernorElection(election: Election) {
  return election.kind ? election.kind === "governor" : election.name.includes("知事選挙");
}
// 沖縄県議会「県議会の組織」各選挙区の区域（2026-10-18確認）。
export const districtSource: Source = {
  url: "https://www.pref.okinawa.lg.jp/kensei/gikai/1016969/1016972.html",
  publisher: "沖縄県議会",
  checkedAt: "2026-10-18",
};
export const prefecturalDistricts = [
  { name: "名護市選挙区", municipalities: ["名護市"] },
  { name: "うるま市選挙区", municipalities: ["うるま市"] },
  { name: "沖縄市選挙区", municipalities: ["沖縄市"] },
  { name: "宜野湾市選挙区", municipalities: ["宜野湾市"] },
  { name: "浦添市選挙区", municipalities: ["浦添市"] },
  { name: "那覇市・南部離島選挙区", municipalities: ["那覇市", "渡嘉敷村", "座間味村", "粟国村", "渡名喜村", "南大東村", "北大東村", "久米島町"] },
  { name: "豊見城市選挙区", municipalities: ["豊見城市"] },
  { name: "島尻・南城市選挙区", municipalities: ["南城市", "与那原町", "南風原町", "八重瀬町"] },
  { name: "糸満市選挙区", municipalities: ["糸満市"] },
  { name: "宮古島市選挙区", municipalities: ["宮古島市", "多良間村"] },
  { name: "石垣市選挙区", municipalities: ["石垣市", "竹富町", "与那国町"] },
  { name: "国頭郡選挙区", municipalities: ["国頭村", "大宜味村", "東村", "今帰仁村", "本部町", "恩納村", "宜野座村", "金武町", "伊江村", "伊平屋村", "伊是名村"] },
  { name: "中頭郡選挙区", municipalities: ["読谷村", "嘉手納町", "北谷町", "北中城村", "中城村", "西原町"] },
];
export function prefecturalDistrictFor(municipality: string) {
  return prefecturalDistricts.find(district => district.municipalities.includes(municipality));
}
export function electionAppliesToMunicipality(election: Election, municipality: string) {
  const district = prefecturalDistrictFor(municipality);
  const assembly = election.kind === "prefectural-assembly" || (!election.kind && election.name.includes("県議会議員"));
  if (assembly && district) {
    if (election.district) return election.district === district.name;
    if (election.name.includes(district.name)) return true;
    return election.municipality === municipality;
  }
  return !election.municipality || election.municipality === municipality || election.municipality === "沖縄県";
}
export type GlossaryTerm = {
  term: string;
  definition: string;
  sources: Source[];
};
// 現職議員は選挙ごとの候補者と分けて管理する。
export type CouncilMember = {
  id: string;
  name: string;
  faction: string | null;
  district: string | null;
  sources: Source[];
};

export function searchCouncilMembers(members: CouncilMember[], query: string) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return members.filter(member => {
    const text = normalize([member.name, member.district || ""].join(" "));
    return words.every(word => text.includes(word));
  });
}
export const prefectures = ["沖縄県"];
export const municipalities = municipalityNames;
// 名称・読みの出典：沖縄県「沖縄県内の市町村」（2026-10-18確認）
// https://www.pref.okinawa.lg.jp/machizukuri/jutakutochi/1012354/1012440.html
// 既存のmunicipalities配列と画面遷移には正式名称を使い続ける。
export const municipalityReadings: Record<string, string> = {
  那覇市: "なはし", 宜野湾市: "ぎのわんし", 石垣市: "いしがきし",
  浦添市: "うらそえし", 名護市: "なごし", 糸満市: "いとまんし",
  沖縄市: "おきなわし", 豊見城市: "とみぐすくし", うるま市: "うるまし",
  宮古島市: "みやこじまし", 南城市: "なんじょうし", 国頭村: "くにがみそん",
  大宜味村: "おおぎみそん", 東村: "ひがしそん", 今帰仁村: "なきじんそん",
  本部町: "もとぶちょう", 恩納村: "おんなそん", 宜野座村: "ぎのざそん",
  金武町: "きんちょう", 伊江村: "いえそん", 読谷村: "よみたんそん",
  嘉手納町: "かでなちょう", 北谷町: "ちゃたんちょう", 北中城村: "きたなかぐすくそん",
  中城村: "なかぐすくそん", 西原町: "にしはらちょう", 与那原町: "よなばるちょう",
  南風原町: "はえばるちょう", 渡嘉敷村: "とかしきそん", 座間味村: "ざまみそん",
  粟国村: "あぐにそん", 渡名喜村: "となきそん", 南大東村: "みなみだいとうそん",
  北大東村: "きただいとうそん", 伊平屋村: "いへやそん", 伊是名村: "いぜなそん",
  久米島町: "くめじまちょう", 八重瀬町: "やえせちょう", 多良間村: "たらまそん",
  竹富町: "たけとみちょう", 与那国町: "よなぐにちょう",
};

export function normalizeRegion(value: string) {
  return normalize(value).replace(/[ァ-ヶ]/g, character =>
    String.fromCharCode(character.charCodeAt(0) - 0x60),
  );
}

export function searchMunicipalities(query: string) {
  const key = normalizeRegion(query);
  if (!key) return [];
  const rank = (name: string) => {
    const terms = [normalizeRegion(name), municipalityReadings[name]];
    if (terms.some(term => term === key)) return 0;
    if (terms.some(term => term.startsWith(key))) return 1;
    return 2;
  };
  return municipalities
    .filter(name => [normalizeRegion(name), municipalityReadings[name]].some(term => term.includes(key)))
    .sort((a, b) => rank(a) - rank(b));
}
export const missing = <T>(): Entry<T> => ({ status: "unrecorded" });
export function emptyChecks(): Record<CheckLabel, Entry<string>> {
  return Object.fromEntries(
    checkLabels.map((label) => [label, missing<string>()]),
  ) as Record<CheckLabel, Entry<string>>;
}
export function normalize(value: string) {
  return value.normalize("NFKC").toLocaleLowerCase("ja").trim();
}
export function searchCandidates(candidates: Candidate[], query: string) {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return candidates.filter((candidate) => {
    const text = normalize(
      [
        candidate.name,
        candidate.party.status === "recorded" ? candidate.party.value : "",
        ...candidate.pledges.map((pledge) =>
          pledge.text.status === "recorded" ? pledge.text.value : "",
        ),
      ].join(" "),
    );
    return words.every((word) => text.includes(word));
  });
}
export function searchGlossary(
  terms: GlossaryTerm[],
  query: string,
  readings: Record<string, string> = {},
) {
  const normalizedQuery = normalize(query);
  return terms.filter((item) =>
    normalize(`${item.term} ${readings[item.term] ?? ""} ${item.definition}`).includes(
      normalizedQuery,
    ),
  );
}
export function toggleSelection(ids: string[], id: string) {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}
export function sourceIsValid(source: Source) {
  return (
    /^https:\/\//.test(source.url) &&
    !!source.publisher.trim() &&
    /^\d{4}-\d{2}-\d{2}$/.test(source.checkedAt)
  );
}
