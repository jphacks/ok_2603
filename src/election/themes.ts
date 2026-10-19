import type { Candidate } from "./model";

// 先に一致したテーマに分類する。公約の文章は変えず、読点で区切った項目を振り分けるだけ。
export const pledgeThemes = [
  { id: "base", name: "基地・平和", words: ["基地", "軍港", "返還", "平和", "米軍", "空港", "辺野古", "普天間"] },
  { id: "education", name: "子育て・教育", words: ["教育", "学校", "教職員", "児童", "子育て", "給食", "いじめ", "保育", "こども", "子ども", "学び", "体育館"] },
  { id: "traffic", name: "交通・まちづくり", words: ["交通", "鉄道", "ライトレール", "LRT", "バリアフリー", "渋滞", "都市", "土地利用", "市街地", "住環境", "公園", "那覇港", "移設", "PFI", "跡地"] },
  { id: "welfare", name: "福祉・医療", words: ["福祉", "介護", "国保", "医療", "高齢者", "障がい", "健康"] },
  { id: "safety", name: "防災・安全", words: ["災害", "防災"] },
  { id: "environment", name: "環境・エネルギー", words: ["環境", "脱炭素", "省エネ", "再エネ", "エネルギー", "ごみ"] },
  { id: "living", name: "暮らし・物価", words: ["減税", "家賃", "水道料金", "値下げ", "物価", "生活支援"] },
  { id: "economy", name: "経済・観光", words: ["経済", "企業", "所得", "雇用", "産業", "観光", "ふるさと納税"] },
  { id: "culture", name: "文化・多様性", words: ["文化", "伝統", "歴史", "しまくとぅば", "地域交流", "多様性", "LGBTQ", "権利", "パートナーシップ"] },
  { id: "admin", name: "市政・デジタル", words: ["デジタル", "DX", "市役所", "議会", "透明", "市政", "スマートフォン", "スマホ", "公開", "進捗"] },
  { id: "other", name: "その他", words: [] as string[] },
] as const;

export type PledgeTheme = (typeof pledgeThemes)[number];

export function themeOf(fragment: string): PledgeTheme {
  return (
    pledgeThemes.find((theme) => theme.words.some((word) => fragment.includes(word))) ??
    pledgeThemes[pledgeThemes.length - 1]
  );
}

export function pledgeFragments(candidate: Candidate) {
  return candidate.pledges.flatMap((pledge) =>
    (pledge.summary ?? (pledge.text.status === "recorded" ? pledge.text.value : ""))
      .split(/[、。]/)
      .map((text) => text.trim())
      .filter(Boolean),
  );
}

export type ThemeRow = {
  theme: PledgeTheme;
  byCandidate: Map<string, string[]>;
};

export function buildThemeRows(candidates: Candidate[]): ThemeRow[] {
  const rows = new Map<string, ThemeRow>();
  for (const candidate of candidates) {
    for (const fragment of pledgeFragments(candidate)) {
      const theme = themeOf(fragment);
      const row = rows.get(theme.id) ?? { theme, byCandidate: new Map() };
      row.byCandidate.set(candidate.id, [
        ...(row.byCandidate.get(candidate.id) ?? []),
        fragment,
      ]);
      rows.set(theme.id, row);
    }
  }
  return pledgeThemes.flatMap((theme) => rows.get(theme.id) ?? []);
}
