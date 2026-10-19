import { Fragment, useId, useState } from "react";
import { glossary } from "./data";
import readings from "../../shared/candidate-readings.json";
import { statusLabels, type Entry, type Source } from "./model";

export function Photo({ entry, name }: { entry: Entry<string>; name: string }) {
  const [failed, setFailed] = useState(false);
  if (entry.status !== "recorded" || failed)
    return <span className="photo-missing">写真未収録</span>;
  return (
    <img
      src={entry.value}
      alt={`${name}の顔写真`}
      onError={() => setFailed(true)}
    />
  );
}

export function RubyName({ name }: { name: string }) {
  const reading = (readings as Record<string, string>)[name.replace(/\s+/g, "")];
  if (!reading) return <>{name}</>;
  return (
    <ruby>
      {name}
      <rp>（</rp>
      <rt>{reading}</rt>
      <rp>）</rp>
    </ruby>
  );
}

export function Sources({ sources }: { sources: Source[] }) {
  return (
    <span className="sources">
      {sources.map((source, index) => (
        <span className="source-item" key={`${source.url}-${index}`}>
          <a href={source.url} target="_blank" rel="noreferrer">
            出典 ↗
          </a>
          <span>
            {source.publisher}
            {source.checkedAt
              ? ` · 最終確認 ${source.checkedAt}`
              : " · 確認日未記録"}
          </span>
        </span>
      ))}
    </span>
  );
}

export function RichText({ text }: { text: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const id = useId();
  const terms = glossary
    .filter((item) => item.term && text.includes(item.term))
    .sort((a, b) => b.term.length - a.term.length);
  if (!terms.length) return <>{text}</>;
  const expression = new RegExp(
    `(${terms.map((item) => item.term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
    "g",
  );
  return (
    <>
      {text.split(expression).map((part, index) => {
        const entry = terms.find((item) => item.term === part);
        const key = `${id}-${index}`;
        return entry ? (
          <span className="term-wrap" key={key}>
            <button
              className="term"
              aria-expanded={open === key}
              aria-controls={key}
              onClick={() => setOpen(open === key ? null : key)}
            >
              {part}
            </button>
            {open === key && (
              <span
                role="region"
                aria-label={`${part}の解説`}
                id={key}
                className="popover"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setOpen(null);
                    event.currentTarget.parentElement
                      ?.querySelector("button")
                      ?.focus();
                  }
                }}
              >
                <strong>{part}</strong>
                <span>{entry.definition}</span>
                <Sources sources={entry.sources} />
                <button className="text-button" onClick={() => setOpen(null)}>
                  閉じる
                </button>
              </span>
            )}
          </span>
        ) : (
          <Fragment key={key}>{part}</Fragment>
        );
      })}
    </>
  );
}

export function RecordText({ entry }: { entry: Entry<string | string[]> }) {
  return (
    <div className="record">
      {entry.status !== "recorded" && (
        <span className="badge">{statusLabels[entry.status]}</span>
      )}
      {entry.status === "recorded" &&
        (Array.isArray(entry.value) ? (
          <ul>
            {entry.value.map((text, index) => (
              <li key={index}>
                <RichText text={text} />
              </li>
            ))}
          </ul>
        ) : (
          <p>
            <RichText text={entry.value} />
          </p>
        ))}
      {(entry.status === "not-confirmed" || entry.status === "no-record") && (
        <p>{entry.note}</p>
      )}
      {entry.status !== "unrecorded" && <Sources sources={entry.sources} />}
    </div>
  );
}

export function Empty({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`empty${className ? ` ${className}` : ""}`}>
      <span className="empty-symbol" aria-hidden="true">
        ▤
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}

export function Icon({
  name,
}: {
  name: "home" | "region" | "compare" | "book";
}) {
  const paths = {
    home: "M3 10 12 3l9 7M5 9v12h5v-7h4v7h5V9",
    region:
      "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0ZM15 10a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
    compare: "M4 4h6v16H4zM14 4h6v16h-6z",
    book: "M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1ZM12 5v15",
  };
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  );
}
