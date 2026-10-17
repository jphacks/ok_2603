import type { Candidate, Election, GlossaryTerm } from "./model";

// 人が公式資料を確認した後に登録する。未収録は選挙・候補者が存在しないという意味ではない。
export const elections: Election[] = [];
export const candidates: Candidate[] = [];
// 解説文も人による確認と出典の登録が完了してから公開する。
export const glossary: GlossaryTerm[] = [];
