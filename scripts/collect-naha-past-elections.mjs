import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const OUT_DIR = resolve("shared/past-elections");
const today = new Date().toISOString().slice(0, 10);

const targets = [
  {
    file: "naha-mayor.json",
    url: "https://www.city.naha.okinawa.jp/admin/senkan/1004625/1004626.html",
    kind: "municipal-mayor",
    municipality: "那覇市",
    votesColumn: "得票数",
  },
  {
    file: "okinawa-governor.json",
    url: "https://www.city.naha.okinawa.jp/admin/senkan/1004625/1004628.html",
    kind: "governor",
    municipality: undefined,
    votesColumn: "全県得票数",
  },
];

const clean = (html) =>
  html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/[\s\u3000]+/g, " ")
    .trim();

function tables(html) {
  return [...html.matchAll(/<table[\s\S]*?<\/table>/g)].map((match) =>
    [...match[0].matchAll(/<tr[\s\S]*?<\/tr>/g)].map((row) =>
      [...row[0].matchAll(/<t[hd][\s\S]*?<\/t[hd]>/g)].map((cell) => clean(cell[0])),
    ),
  );
}

function japaneseDate(text) {
  const match = text.match(/令和(\d+)年(\d+)月(\d+)日/);
  if (!match) throw new Error(`date not found: ${text}`);
  const [, era, month, day] = match.map(Number);
  return `${2018 + era}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

async function collect(target) {
  const response = await fetch(target.url);
  if (!response.ok) throw new Error(`${target.url}: HTTP ${response.status}`);
  const html = await response.text();
  const text = clean(html);
  const heading = html.match(/<h3[^>]*>\s*(第\d+回[^<]+?)\s*<\/h3>/)?.[1];
  const date = japaneseDate(text.slice(text.indexOf("選挙期日")));
  const candidateTable = tables(html).find((rows) => rows[0]?.includes("候補者氏名"));
  if (!heading || !candidateTable) throw new Error(`${target.url}: layout changed`);
  const header = candidateTable[0];
  const column = (name) => header.indexOf(name);
  const standingColumn = header.findIndex((name) => name.startsWith("新"));
  const candidates = candidateTable.slice(1).map((row) => {
    const get = (name) => row[column(name)];
    return {
      name: get("候補者氏名"),
      age: Number(get("年齢")) || null,
      party: get("党派"),
      standing: row[standingColumn],
      occupation: get("職業") || null,
      votes: Number(get(target.votesColumn).replace(/,/g, "")),
      elected: get("当落") === "当",
    };
  });
  const record = {
    id: `past-${target.kind}-${target.municipality ?? "okinawa"}-${date}`,
    name: heading,
    kind: target.kind,
    ...(target.municipality ? { municipality: target.municipality } : {}),
    date,
    sources: [
      {
        url: target.url,
        publisher: "那覇市選挙管理委員会",
        checkedAt: today,
      },
    ],
    candidates,
  };
  return record;
}

await mkdir(OUT_DIR, { recursive: true });
for (const target of targets) {
  const record = await collect(target);
  await writeFile(resolve(OUT_DIR, target.file), JSON.stringify([record], null, 2) + "\n");
  console.log(target.file, record.name, record.date, record.candidates.length);
}
