import { useState } from "react";
import { Sources } from "./components";
import type { Candidate, Source } from "./model";
import { buildThemeRows } from "./themes";

export function ThemeComparison({
  candidates,
  sourcesFor,
}: {
  candidates: Candidate[];
  sourcesFor: (item: Candidate) => Source[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = buildThemeRows(candidates);
  const total = candidates.length;

  if (!rows.length) {
    return <p className="small">テーマ別に比べられる公約はまだありません。</p>;
  }

  return (
    <div className="theme-compare">
      <p className="small">
        公約を内容ごとに分けて、誰が何を掲げているかを比べられます。文章は公報の要約のままです。
      </p>
      <ul className="theme-list">
        {rows.map(({ theme, byCandidate }) => {
          const count = byCandidate.size;
          const open = openId === theme.id;
          const level =
            total > 1 && count === total ? "all" : count === 1 && total > 1 ? "one" : "some";
          const label =
            total <= 1
              ? "掲載あり"
              : level === "all"
                ? "全員が掲載"
                : level === "one"
                  ? "1人だけが掲載"
                  : `${count}人が掲載`;
          return (
            <li key={theme.id} className="theme-item">
              <button
                type="button"
                className="theme-head"
                aria-expanded={open}
                aria-controls={`theme-${theme.id}`}
                onClick={() => setOpenId(open ? null : theme.id)}
              >
                <span className="theme-name">{theme.name}</span>
                <span className={`theme-badge theme-badge-${level}`}>{label}</span>
                <span className="theme-who">
                  {candidates
                    .filter((candidate) => byCandidate.has(candidate.id))
                    .map((candidate) => candidate.name)
                    .join("・")}
                </span>
                <span className="theme-arrow" aria-hidden="true">
                  {open ? "▲" : "▼"}
                </span>
              </button>
              {open && (
                <div className="theme-body" id={`theme-${theme.id}`}>
                  {candidates.map((candidate) => {
                    const items = byCandidate.get(candidate.id);
                    return (
                      <section className="theme-candidate" key={candidate.id}>
                        <h3>{candidate.name}</h3>
                        {items ? (
                          <ul className="pledge-bullets">
                            {items.map((text, index) => (
                              <li className="comparison-pledge" key={index}>
                                {text}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="small">
                            公報には記載がありません。反対や賛成の意思表示ではありません。
                          </p>
                        )}
                        {items && <Sources sources={sourcesFor(candidate)} />}
                      </section>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
