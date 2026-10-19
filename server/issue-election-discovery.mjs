import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const ISSUE_API_URL =
  "https://api.github.com/repos/jphacks/ok_2603/issues/2";
const registryHeading = "## 沖縄県・市町村の公式サイト（選挙情報の確認起点）";
const allowedStandaloneHosts = new Set([
  "www.nakijin.jp",
  "www.ienoson.jp",
  "www.iheya.jp",
  "www.chatan.jp",
]);
const electionLinkPattern = /選挙|選管|選挙管理委員会|senkyo|senkan/i;
const municipalities = JSON.parse(
  await readFile(new URL("../shared/municipalities.json", import.meta.url), "utf8"),
);

function officialUrl(value) {
  try {
    const url = new URL(value);
    const allowedHost =
      /^(?:www\.)?pref\.okinawa\.lg\.jp$/u.test(url.hostname) ||
      /^(?:www\.)?(?:city|town|vill)\.[a-z0-9-]+\.lg\.jp$/u.test(
        url.hostname,
      ) ||
      /^(?:www\.)?(?:city|town|vill)\.[a-z0-9-]+\.okinawa\.jp$/u.test(
        url.hostname,
      ) ||
      allowedStandaloneHosts.has(url.hostname);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.search ||
      url.hash ||
      !allowedHost
    ) {
      return null;
    }
    return url;
  } catch {
    return null;
  }
}

function cellUrl(value) {
  const markdownLink = value.match(/\[[^\]]+\]\((https:\/\/[^)\s]+)\)/u);
  const rawUrl = markdownLink?.[1] ?? value.match(/https:\/\/\S+/u)?.[0];
  return rawUrl?.replace(/[),.;]+$/u, "") ?? null;
}

export function parseIssueOfficialRoots(body) {
  const headingIndex = body.indexOf(registryHeading);
  if (headingIndex < 0) throw new Error("issue_registry_section_missing");
  const section = body
    .slice(headingIndex + registryHeading.length)
    .split(/\n## (?!#)/u, 1)[0];
  const roots = new Map();
  for (const line of section.split(/\r?\n/u)) {
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    const bullet = line.match(/^\s*-\s*([^:：]+)[:：]\s*(.*)$/u);
    const label = bullet?.[1]?.trim() ?? cells[0] ?? "";
    const municipality = municipalities.find((name) => name === label);
    const isPrefecture =
      label === "沖縄県" ||
      (label.startsWith("沖縄県") && /選挙管理委員会/u.test(label));
    const directElection = cells.length >= 3 && /選挙/u.test(cells[1]);
    if (!municipality && !isPrefecture) continue;
    const url = officialUrl(
      bullet ? cellUrl(bullet[2]) : cellUrl(cells.at(-1)),
    );
    if (!url) continue;
    const type = directElection ? "election" : "root";
    const key = `${municipality ?? "沖縄県"}:${url.href}`;
    roots.set(key, {
      municipality: municipality ?? "沖縄県",
      type,
      url: url.href,
      hostname: url.hostname,
    });
  }
  if (!roots.size) throw new Error("issue_registry_has_no_approved_roots");
  return [...roots.values()];
}

export async function fetchIssueOfficialRoots() {
  const response = await fetch(ISSUE_API_URL, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "focus-town-election-collector",
    },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok)
    throw new Error(`github_issue_http_${response.status}`);
  const issue = await response.json();
  if (issue.number !== 2 || typeof issue.body !== "string") {
    throw new Error("github_issue_registry_unavailable");
  }
  if (issue.body.length > 200_000)
    throw new Error("github_issue_registry_too_large");
  return parseIssueOfficialRoots(issue.body);
}

export function parseApprovedLinks(html, baseUrl, allowedHosts) {
  const links = [];
  for (const match of html.matchAll(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu,
  )) {
    const raw = match[1].replaceAll("&amp;", "&");
    let url;
    try {
      url = new URL(raw, baseUrl);
    } catch {
      continue;
    }
    const label = match[2]
      .replace(/<[^>]+>/gu, " ")
      .replace(/&nbsp;|&#160;/giu, " ")
      .replace(/&amp;/giu, "&")
      .replace(/\s+/gu, " ")
      .trim();
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.port &&
      allowedHosts.has(url.hostname) &&
      electionLinkPattern.test(`${label} ${url.pathname}`)
    ) {
      links.push({ url: url.href, label });
    }
  }
  return links.filter(
    (link, index, all) =>
      all.findIndex((candidate) => candidate.url === link.url) === index,
  );
}

function plainText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/giu, " ")
    .replace(/<[^>]+>/gu, " ")
    .replace(/&nbsp;|&#160;/giu, " ")
    .replace(/&amp;/giu, "&")
    .replace(/&lt;/giu, "<")
    .replace(/&gt;/giu, ">")
    .replace(/&quot;/giu, '"')
    .replace(/&#39;/giu, "'")
    .replace(/\s+/gu, " ")
    .trim();
}

function parseDateNear(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const match = text.match(
    new RegExp(
      `${escaped}[^。]{0,120}?(令和\\s*[元0-9０-９]+年\\s*[0-9０-９]+月\\s*[0-9０-９]+日|平成\\s*[元0-9０-９]+年\\s*[0-9０-９]+月\\s*[0-9０-９]+日|20[0-9]{2}年\\s*[0-9]{1,2}月\\s*[0-9]{1,2}日)`,
      "u",
    ),
  );
  if (!match) return null;
  const date = match[1].replace(/[０-９]/gu, (digit) =>
    String.fromCharCode(digit.charCodeAt(0) - 0xfee0),
  );
  const normalized = date
    .replace(/令和\s*元年/u, "令和1年")
    .replace(/令和\s*(\d+)年/u, (_, year) => `${2018 + Number(year)}年`)
    .replace(/平成\s*(\d+)年/u, (_, year) => `${1988 + Number(year)}年`)
    .replace(/年\s*/u, "-")
    .replace(/月\s*/u, "-")
    .replace(/日/u, "")
    .replace(/\s/gu, "");
  const parts = normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/u);
  if (!parts) return null;
  const [, year, month, day] = parts;
  const iso = `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  const parsed = new Date(`${iso}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === iso
    ? iso
    : null;
}

export function extractMunicipalElection(html, url, municipality, checkedAt) {
  const title =
    html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/iu)?.[1] ??
    html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/iu)?.[1] ??
    "";
  const normalizedTitle = plainText(title).normalize("NFKC");
  if (!normalizedTitle.includes(municipality)) return null;
  const nameMatch = normalizedTitle.match(
    new RegExp(
      `(?:第\\s*[0-9０-９]+回\\s*)?${municipality}(?:長|議会議員)選挙`,
      "u",
    ),
  );
  if (!nameMatch) return null;
  const text = plainText(html).normalize("NFKC");
  const votingOn =
    parseDateNear(text, "選挙期日") ??
    parseDateNear(text, "投開票日") ??
    parseDateNear(text, "当日投票") ??
    parseDateNear(text, "投票日");
  if (!votingOn) return null;
  const announcedOn =
    parseDateNear(text, "告示日") ?? parseDateNear(text, "公示日");
  const electionName = nameMatch[0];
  const kind = /長選挙/u.test(electionName)
    ? "municipal-mayor"
    : "municipal-assembly";
  const id = createHash("sha256")
    .update(`${municipality}:${electionName}:${votingOn}`)
    .digest("hex")
    .slice(0, 24);
  return {
    id: `municipal-${id}`,
    name: electionName,
    kind,
    municipality,
    announcedOn,
    votingOn,
    status:
      votingOn < checkedAt
        ? "投票終了"
        : announcedOn && announcedOn <= checkedAt
          ? "告示済み"
          : "予定",
    officialUrl: url,
    sourceTitle: `${municipality}公式選挙ページ`,
    sourceExcerpt: text.slice(0, 2500),
    sourceHash: createHash("sha256").update(html).digest("hex"),
  };
}

export function findMunicipalPdfLinks(html, baseUrl, hostname) {
  const links = [];
  for (const match of html.matchAll(
    /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/giu,
  )) {
    let url;
    try {
      url = new URL(match[1].replaceAll("&amp;", "&"), baseUrl);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" || url.hostname !== hostname) continue;
    if (!/\.pdf(?:$|\?)/iu.test(url.pathname)) continue;
    links.push({ url: url.href, label: plainText(match[2]).normalize("NFKC") });
  }
  const candidateList = links.find((link) => /立候補者一覧/u.test(link.label));
  const bulletin = links.find((link) => /選挙公報/u.test(link.label));
  return { candidateList: candidateList ?? null, bulletin: bulletin ?? null };
}

// 市選管の「立候補者一覧」PDFの文字列（届出番号、姓、ふりがな、年齢、党派、職業…、名）を解析する
export function parseMunicipalRoster(text) {
  const lines = text
    .normalize("NFKC")
    .split(/\r?\n/u)
    .map((line) => line.replace(/[\s\u3000]+/gu, " ").trim())
    .filter(Boolean);
  const start = lines.findIndex((line) => /^最終$/u.test(line));
  if (start < 0) return [];
  const body = lines.slice(start + 1);
  const roster = [];
  let expected = 1;
  let block = null;
  const flush = () => {
    if (!block) return;
    // ふりがなが氏名と同じカタカナ表記の場合は省略される
    const ageIndex = block.lines.slice(0, 3).findIndex((line) => /^\d{2}$/u.test(line));
    if (ageIndex < 1 || block.lines.length < ageIndex + 3) return;
    const surname = block.lines[0];
    const age = block.lines[ageIndex];
    const party = block.lines[ageIndex + 1];
    const given = block.lines.at(-1);
    roster.push({
      number: block.number,
      name: `${surname}${given}`.replace(/\s/gu, ""),
      age: Number(age),
      party,
    });
  };
  for (const line of body) {
    if (line === String(expected)) {
      flush();
      block = { number: expected, lines: [] };
      expected++;
    } else if (block) {
      block.lines.push(line);
    }
  }
  flush();
  return roster;
}

export function electionLinksForRoot(html, baseUrl, allowedHosts) {
  return parseApprovedLinks(html, baseUrl, allowedHosts).slice(0, 12);
}
