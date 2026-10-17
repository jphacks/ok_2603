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
  prefectureIds: string[];
  municipality?: string;
  level: "national" | "local";
  period: "current" | "past";
  date: string;
  sources: Source[];
  turnout: Entry<{ age: string; rate: number }[]>;
};
export type GlossaryTerm = {
  term: string;
  definition: string;
  sources: Source[];
};
export const prefectures = ["沖縄県"];
export const municipalities = [
  "那覇市",
  "宜野湾市",
  "石垣市",
  "浦添市",
  "名護市",
  "糸満市",
  "沖縄市",
  "豊見城市",
  "うるま市",
  "宮古島市",
  "南城市",
  "国頭村",
  "大宜味村",
  "東村",
  "今帰仁村",
  "本部町",
  "恩納村",
  "宜野座村",
  "金武町",
  "伊江村",
  "読谷村",
  "嘉手納町",
  "北谷町",
  "北中城村",
  "中城村",
  "西原町",
  "与那原町",
  "南風原町",
  "渡嘉敷村",
  "座間味村",
  "粟国村",
  "渡名喜村",
  "南大東村",
  "北大東村",
  "伊平屋村",
  "伊是名村",
  "久米島町",
  "八重瀬町",
  "多良間村",
  "竹富町",
  "与那国町",
];
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
