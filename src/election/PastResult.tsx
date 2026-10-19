import type { PastElection } from "./pastElections";
import { Sources } from "./components";

const standingLabels: Record<string, string> = {
  新: "新人",
  現: "現職",
  元: "元職",
  前: "前職",
};

export function PastResult({
  result,
  showPledgeNote = true,
}: {
  result: PastElection;
  showPledgeNote?: boolean;
}) {
  const unopposed = result.candidates.every((item) => item.votes === null);
  return (
    <section className="panel past-result">
      <div className="section-heading">
        <h2>選挙結果</h2>
        <span className="badge">{result.candidates.length}人</span>
      </div>
      <p className="small">
        {result.date.replace(/-/g, "/")} 執行。得票数の多い順に表示しています。
      </p>
      <ol className="past-result-list">
        {[...result.candidates]
          .sort((a, b) => (b.votes ?? -1) - (a.votes ?? -1))
          .map((item, index) => (
          <li
            className={`past-result-row${item.elected ? " is-elected" : ""}`}
            key={`${item.name}-${index}`}
          >
            <div className="past-result-main">
              <strong className="past-result-name">{item.name}</strong>
              {item.elected && <span className="past-result-badge">当選</span>}
            </div>
            <p className="past-result-meta">
              <span>{item.party}</span>
              {item.standing && (
                <span>{standingLabels[item.standing] ?? item.standing}</span>
              )}
              {item.age !== null && <span>{item.age}歳</span>}
              {item.occupation && <span>{item.occupation}</span>}
            </p>
            {item.votes !== null && (
              <p className="past-result-votes">
                {item.votes.toLocaleString("ja-JP")}票
              </p>
            )}
          </li>
        ))}
      </ol>
      {unopposed && <p className="small">無投票で当選が決まりました。</p>}
      {showPledgeNote && (
        <p className="small">
          この選挙の公約（選挙公報）は、公式資料で確認できていないため掲載していません。
        </p>
      )}
      <Sources sources={result.sources} />
    </section>
  );
}
