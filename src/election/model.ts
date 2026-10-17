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
export const groups = [
  {
    name: "北海道・東北",
    names: [
      "北海道",
      "青森県",
      "岩手県",
      "宮城県",
      "秋田県",
      "山形県",
      "福島県",
    ],
  },
  {
    name: "関東",
    names: [
      "茨城県",
      "栃木県",
      "群馬県",
      "埼玉県",
      "千葉県",
      "東京都",
      "神奈川県",
    ],
  },
  {
    name: "中部",
    names: [
      "新潟県",
      "富山県",
      "石川県",
      "福井県",
      "山梨県",
      "長野県",
      "岐阜県",
      "静岡県",
      "愛知県",
    ],
  },
  {
    name: "近畿",
    names: [
      "三重県",
      "滋賀県",
      "京都府",
      "大阪府",
      "兵庫県",
      "奈良県",
      "和歌山県",
    ],
  },
  {
    name: "中国・四国",
    names: [
      "鳥取県",
      "島根県",
      "岡山県",
      "広島県",
      "山口県",
      "徳島県",
      "香川県",
      "愛媛県",
      "高知県",
    ],
  },
  {
    name: "九州・沖縄",
    names: [
      "福岡県",
      "佐賀県",
      "長崎県",
      "熊本県",
      "大分県",
      "宮崎県",
      "鹿児島県",
      "沖縄県",
    ],
  },
];
export const prefectures = groups.flatMap((group) => group.names);
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
