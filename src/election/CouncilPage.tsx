import { useState } from "react";
import { councilMembers } from "./data";
import { searchCouncilMembers } from "./model";
import { Empty, Sources } from "./components";

export function CouncilPage() {
  const [query, setQuery] = useState("");
  const results = searchCouncilMembers(councilMembers, query);
  return (
    <section className="panel council-panel" aria-labelledby="council-list-title">
      <h2 id="council-list-title">現職議員一覧</h2>
      <label className="input-label" htmlFor="council-query">氏名・選挙区で検索</label>
      <input
        id="council-query"
        className="wide-input"
        type="search"
        placeholder="氏名または選挙区を入力"
        value={query}
        onChange={event => setQuery(event.target.value)}
      />
      <p className="small">公式資料で現職・会派・選挙区を確認し、出典と最終確認日を添えて掲載します。</p>
      {councilMembers.length === 0 ? (
        <div role="status">
          <Empty title="現職県議会議員の情報は未収録です">
            まだ情報を登録していません。議員がいないという意味ではありません。
          </Empty>
        </div>
      ) : (
        <>
          <p role="status" className="small">収録済み {councilMembers.length}件 · 検索結果 {results.length}件</p>
          {results.length ? (
            <ul className="council-list" aria-label="現職県議会議員">
              {results.map(member => (
                <li key={member.id}>
                  <article>
                    <h3>{member.name}</h3>
                    <dl className="council-fields">
                      <div><dt>会派</dt><dd>{member.faction || "未収録"}</dd></div>
                      <div><dt>選挙区</dt><dd>{member.district || "未収録"}</dd></div>
                    </dl>
                    <Sources sources={member.sources} />
                  </article>
                </li>
              ))}
            </ul>
          ) : <Empty title="条件に一致する議員情報はありません">収録済み情報の検索結果です。氏名・選挙区を変えて検索してください。</Empty>}
        </>
      )}
    </section>
  );
}
