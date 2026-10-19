import { useState } from "react";
import { RubyName, Sources } from "./components";
import type { Candidate, Source } from "./model";
import { buildThemeRows } from "./themes";

function uniqueSources(sources: Source[]) {
  const seen = new Set<string>();
  return sources.filter((source) => !seen.has(source.url) && seen.add(source.url));
}

export function ThemeComparison({
  candidates,
  sourcesFor,
}: {
  candidates: Candidate[];
  sourcesFor: (item: Candidate) => Source[];
}) {
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [focusIds, setFocusIds] = useState<string[]>([]);
  const rows = buildThemeRows(candidates);

  if (!rows.length) {
    return <p className="small">テーマ別に比べられる公約はまだありません。</p>;
  }

  const shown = focusIds.length
    ? candidates.filter((candidate) => focusIds.includes(candidate.id))
    : candidates;
  const allOpen = openIds.length === rows.length;
  const toggleOpen = (id: string) =>
    setOpenIds((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );
  const toggleFocus = (id: string) =>
    setFocusIds((ids) =>
      ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id],
    );

  return (
    <div className="theme-compare">
      <div className="theme-toolbar">
        <div className="theme-focus" role="group" aria-label="表示する候補者">
          <span className="theme-focus-label">表示する候補者</span>
          <div className="theme-focus-chips">
            <button
              type="button"
              className="theme-chip"
              aria-pressed={focusIds.length === 0}
              onClick={() => setFocusIds([])}
            >
              全員
            </button>
            {candidates.map((candidate) => (
              <button
                type="button"
                className="theme-chip"
                key={candidate.id}
                aria-pressed={focusIds.includes(candidate.id)}
                onClick={() => toggleFocus(candidate.id)}
              >
                {candidate.name}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          className="theme-expand"
          onClick={() => setOpenIds(allOpen ? [] : rows.map((row) => row.theme.id))}
        >
          {allOpen ? "すべて閉じる" : "すべて開く"}
        </button>
      </div>
      <ul className="theme-list">
        {rows.map(({ theme, byCandidate }) => {
          const open = openIds.includes(theme.id);
          return (
            <li key={theme.id} className={`theme-item${open ? " is-open" : ""}`}>
              <button
                type="button"
                className="theme-head"
                aria-expanded={open}
                aria-controls={`theme-${theme.id}`}
                onClick={() => toggleOpen(theme.id)}
              >
                <span className="theme-name">{theme.name}</span>
                <span className="theme-arrow" aria-hidden="true">
                  {open ? "▲" : "▼"}
                </span>
                <span className="theme-marks">
                  {shown.map((candidate) => {
                    const has = byCandidate.has(candidate.id);
                    return (
                      <span
                        key={candidate.id}
                        className={`theme-mark ${has ? "has" : "none"}`}
                      >
                        <span aria-hidden="true">{has ? "●" : "○"}</span>
                        {candidate.name}
                        <span className="sr-only">
                          {has ? "：記載あり" : "：記載なし"}
                        </span>
                      </span>
                    );
                  })}
                </span>
              </button>
              {open && (
                <div className="theme-body" id={`theme-${theme.id}`}>
                  {shown
                    .filter((candidate) => byCandidate.has(candidate.id))
                    .map((candidate) => (
                      <section className="theme-candidate" key={candidate.id}>
                        <h3>
                          <RubyName name={candidate.name} />
                        </h3>
                        <ul className="pledge-bullets">
                          {byCandidate.get(candidate.id)!.map((text, index) => (
                            <li className="comparison-pledge" key={index}>
                              {text}
                            </li>
                          ))}
                        </ul>
                      </section>
                    ))}
                  {shown.some((candidate) => !byCandidate.has(candidate.id)) && (
                    <p className="theme-note">
                      ※ 公約が載っていない候補者は、公報にこのテーマが書かれていないだけで、賛成・反対とは関係ありません。
                    </p>
                  )}
                  <div className="theme-sources">
                    <Sources
                      sources={uniqueSources(
                        shown
                          .filter((candidate) => byCandidate.has(candidate.id))
                          .flatMap((candidate) => sourcesFor(candidate)),
                      )}
                    />
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
