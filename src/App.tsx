import { useEffect, useRef, useState } from "react";
import { candidates, elections, glossary } from "./election/data";
import {
  checkLabels,
  groups,
  missing,
  normalize,
  prefectures,
  searchCandidates,
  toggleSelection,
  type Candidate,
} from "./election/model";
import {
  Empty,
  Icon,
  Photo,
  RecordText,
  RichText,
  Sources,
} from "./election/components";

type Page = "home" | "region" | "candidates" | "detail" | "compare" | "guide";
const tutorialKey = "election-prototype:tutorial:v1";
const tabs = [
  "公約",
  "経歴",
  "議会での発言",
  "議案への賛否",
  "過去の公約・実施状況",
];
const steps = [
  [
    "まずは、地域を選びましょう",
    "地域検索に都道府県名を入力するか、47都道府県一覧から地域を選べます。",
    "region-search",
  ],
  [
    "選挙と候補者を確認",
    "地域ページから現在・過去の選挙と候補者を確認できます。未登録の情報は「未収録」と表示します。",
    "prefecture-list",
  ],
  [
    "自分で読んで、比べる",
    "候補者の「比較に追加」で横並びに比較できます。推薦や順位付けは行いません。「公約比較」から開けます。",
    "comparison-link",
  ],
];

function App() {
  const [page, setPage] = useState<Page>("home");
  const [region, setRegion] = useState("");
  const [regionQuery, setRegionQuery] = useState("");
  const [query, setQuery] = useState("");
  const [electionId, setElectionId] = useState<string | null>(null);
  const [level, setLevel] = useState("all");
  const [period, setPeriod] = useState("current");
  const [selected, setSelected] = useState<string[]>([]);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [preview, setPreview] = useState(false);
  const [slots, setSlots] = useState([1, 2]);
  const [tour, setTour] = useState<number | null>(() => {
    try {
      return localStorage.getItem(tutorialKey) === "done" ? null : 0;
    } catch {
      return 0;
    }
  });
  const [storageWarning, setStorageWarning] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const tourRef = useRef<HTMLDivElement>(null);
  const activeElection = elections.find((item) => item.id === electionId);
  const candidate = candidates.find((item) => item.id === candidateId);
  const compared = selected
    .map((id) => candidates.find((item) => item.id === id))
    .filter((item): item is Candidate => !!item);
  const regionalElections = elections.filter((item) =>
    item.prefectureIds.includes(region),
  );
  const visibleElections = regionalElections.filter(
    (item) =>
      (level === "all" || item.level === level) && item.period === period,
  );
  const regionalCandidates = candidates.filter(
    (item) =>
      regionalElections.some((election) => election.id === item.electionId) &&
      (!electionId || item.electionId === electionId),
  );
  const results = searchCandidates(regionalCandidates, query);
  const matches = prefectures.filter((name) =>
    normalize(name).includes(normalize(regionQuery)),
  );
  const municipalMatches = regionQuery.trim()
    ? elections.filter(
        (item) =>
          item.municipality &&
          normalize(item.municipality).includes(normalize(regionQuery)),
      )
    : [];
  useEffect(() => {
    heading.current?.focus();
  }, [page, region, candidateId]);
  useEffect(() => {
    if (tour !== null) {
      document
        .getElementById(steps[tour][2])
        ?.scrollIntoView({ block: "center" });
      tourRef.current?.focus();
    }
  }, [tour]);
  function navigate(next: Page) {
    setPage(next);
    setPreview(false);
    window.scrollTo(0, 0);
  }
  function chooseRegion(name: string) {
    setRegion(name);
    setElectionId(null);
    setQuery("");
    setLevel("all");
    setPeriod("current");
    navigate("region");
  }
  function finishTour() {
    try {
      localStorage.setItem(tutorialKey, "done");
    } catch {
      setStorageWarning(true);
    }
    setTour(null);
  }
  function openCandidate(id: string) {
    setCandidateId(id);
    setTab(0);
    navigate("detail");
  }
  function compareButton(item: Candidate) {
    return (
      <button
        className={
          selected.includes(item.id) ? "button selected" : "button secondary"
        }
        aria-pressed={selected.includes(item.id)}
        onClick={() => setSelected((ids) => toggleSelection(ids, item.id))}
      >
        {selected.includes(item.id) ? "✓ 比較から外す" : "＋ 比較に追加"}
      </button>
    );
  }
  function pledgeText(item?: Candidate) {
    return item?.pledges.length ? (
      item.pledges.map((pledge) => (
        <div key={pledge.id}>
          <RecordText entry={pledge.text} />
        </div>
      ))
    ) : (
      <RecordText entry={missing<string>()} />
    );
  }
  const title =
    page === "region"
      ? region
      : page === "candidates"
        ? "候補者と公約"
        : page === "detail"
          ? candidate?.name || "候補者情報：未収録"
          : page === "compare"
            ? "公約を比較する"
            : "データについて";

  return (
    <>
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <header className="header">
        <div className="header-inner">
          <button className="brand" onClick={() => navigate("home")}>
            <span className="brand-mark" aria-hidden="true">
              選
            </span>
            <span>
              選挙情報<span className="brand-sub">アプリ名称未定 · 試作品</span>
            </span>
          </button>
          <nav className="navigation" aria-label="メインナビゲーション">
            {(
              [
                ["home", "home", "ホーム"],
                ["region", "region", "地域を探す"],
                ["compare", "compare", "公約比較"],
                ["guide", "book", "データについて"],
              ] as const
            ).map(([target, icon, label]) => (
              <button
                id={target === "compare" ? "comparison-link" : undefined}
                key={target}
                className={
                  page === target ||
                  (target === "region" &&
                    ["candidates", "detail"].includes(page))
                    ? "nav-active"
                    : ""
                }
                aria-current={page === target ? "page" : undefined}
                onClick={() =>
                  target === "region" ? navigate("home") : navigate(target)
                }
              >
                <Icon name={icon} />
                <span>{label}</span>
                {target === "compare" && (
                  <span className="count">{selected.length}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" className="main">
        <div className="prototype-note">
          <span className="status-dot" />
          試作品・データ登録前
          <span>
            掲載がないことは、選挙や記録が存在しないことを意味しません。
          </span>
        </div>
        {storageWarning && (
          <p role="status" className="notice">
            ブラウザーへの保存ができませんでした。次回も操作ガイドが表示される場合があります。
          </p>
        )}
        {page !== "home" && (
          <>
            <div className="breadcrumb">
              <button onClick={() => navigate("home")}>ホーム</button>
              <span>/</span>
              {!["guide", "compare"].includes(page) && (
                <>
                  <button onClick={() => navigate("region")}>{region}</button>
                  <span>/</span>
                </>
              )}
              <span>{title}</span>
            </div>
            <div className="page-heading">
              <div>
                <p className="eyebrow">
                  {page === "region"
                    ? "REGIONAL DASHBOARD"
                    : page === "compare"
                      ? "PLEDGE COMPARISON"
                      : "ELECTION INFORMATION"}
                </p>
                <h1 ref={heading} tabIndex={-1}>
                  {title}
                </h1>
                <p>
                  {page === "compare"
                    ? "同じ項目を横並びに。自分の視点で、読み比べる。"
                    : ["candidates", "detail"].includes(page)
                      ? `${region} · ${activeElection?.name || "選挙情報は未収録"}`
                      : "公式資料を確かめながら、必要な情報を。"}
                </p>
              </div>
              {page === "region" && (
                <button
                  className="button secondary"
                  onClick={() => navigate("home")}
                >
                  地域を変更する
                </button>
              )}
              {page === "detail" && candidate && compareButton(candidate)}
            </div>
          </>
        )}
        {page === "home" && (
          <>
            <section className="hero">
              <div className="hero-copy">
                <p className="eyebrow">YOUR REGION. YOUR CHOICE.</p>
                <h1 ref={heading} tabIndex={-1}>
                  知ることから、
                  <br />
                  わたしの一票へ。
                </h1>
                <p className="hero-description">
                  地域の選挙と候補者の公約を、公式資料から。
                  <br className="desktop-break" />
                  必要な情報を見つけて、自分の視点で比較できます。
                </p>
                <div className="hero-tags">
                  <span>全国47都道府県</span>
                  <span>国政・地方選挙</span>
                  <span>公式資料を確認</span>
                </div>
              </div>
              <div className="hero-art" aria-hidden="true">
                <div className="orbit orbit-one" />
                <div className="orbit orbit-two" />
                <div className="art-label">INFORMATION → UNDERSTANDING</div>
                <div className="paper">
                  <span />
                  <span />
                  <span />
                  <b>✓</b>
                </div>
                <div className="ballot-box">
                  <div className="slot" />
                  <span>一票の、その前に。</span>
                </div>
                <div className="art-dot dot-one" />
                <div className="art-dot dot-two" />
              </div>
            </section>
            <section
              id="region-search"
              className={`search-panel ${tour === 0 ? "tour-highlight" : ""}`}
            >
              <div>
                <p className="eyebrow">FIND YOUR REGION</p>
                <h2>あなたの地域を探す</h2>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (matches.length === 1) chooseRegion(matches[0]);
                }}
              >
                <label className="sr-only" htmlFor="region-query">
                  地域名で検索
                </label>
                <div className="search-input">
                  <Icon name="region" />
                  <input
                    id="region-query"
                    type="search"
                    placeholder="都道府県名を入力（例：東京都）"
                    value={regionQuery}
                    onChange={(event) => setRegionQuery(event.target.value)}
                  />
                  <button className="button primary" type="submit">
                    検索
                  </button>
                </div>
              </form>
              <p className="small">
                市区町村の検索は、確認済みの選挙データが登録された地域から利用できます。
              </p>
              {municipalMatches.map((item) => (
                <button
                  className="text-button"
                  key={item.id}
                  onClick={() => {
                    chooseRegion(item.prefectureIds[0]);
                    setElectionId(item.id);
                    setPage("candidates");
                  }}
                >
                  {item.municipality} · {item.name} →
                </button>
              ))}
            </section>
            <section
              id="prefecture-list"
              className={`section ${tour === 1 ? "tour-highlight" : ""}`}
            >
              <div className="section-heading">
                <div>
                  <p className="eyebrow">ALL PREFECTURES</p>
                  <h2>都道府県から選ぶ</h2>
                </div>
                <span className="muted">47都道府県に対応</span>
              </div>
              <p className="small" role="status">
                {regionQuery
                  ? `${matches.length}件の都道府県が見つかりました。`
                  : "確認済みの地域から、順次情報を登録します。"}
              </p>
              {!matches.length && !municipalMatches.length && (
                <Empty title="一致する登録地域がありません">
                  都道府県名で検索してください。市区町村データは現在未収録です。
                </Empty>
              )}
              <div className="region-grid">
                {groups.map((group) => {
                  const names = group.names.filter((name) =>
                    matches.includes(name),
                  );
                  return (
                    !!names.length && (
                      <article className="region-group" key={group.name}>
                        <h3>
                          <span className="region-dot" />
                          {group.name}
                        </h3>
                        <div>
                          {names.map((name) => (
                            <button
                              key={name}
                              onClick={() => chooseRegion(name)}
                            >
                              {name}
                              <span aria-hidden="true">↗</span>
                            </button>
                          ))}
                        </div>
                      </article>
                    )
                  );
                })}
              </div>
            </section>
            <section className="principles">
              {[
                [
                  "01",
                  "公式資料を出発点に",
                  "出典・発行元・確認日を添えて、根拠へたどれる情報に。",
                ],
                [
                  "02",
                  "公約を、同じ目線で",
                  "横並びに読んで比較。候補者の推薦や順位付けはしません。",
                ],
                [
                  "03",
                  "わからないことも明確に",
                  "未収録と確認できなかった情報を区別して表示します。",
                ],
              ].map(([n, label, text]) => (
                <div key={n}>
                  <span>{n}</span>
                  <h3>{label}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </section>
          </>
        )}
        {page === "region" && (
          <>
            <section className="panel">
              <div className="section-heading">
                <h2>関連する選挙</h2>
                <span className="badge">
                  {regionalElections.length
                    ? `${regionalElections.length}件収録`
                    : "未収録"}
                </span>
              </div>
              <div className="filters">
                <div className="segmented" aria-label="選挙の時期">
                  {[
                    ["current", "現在の選挙"],
                    ["past", "過去の選挙"],
                  ].map(([value, label]) => (
                    <button
                      key={value}
                      aria-pressed={period === value}
                      onClick={() => setPeriod(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <label>
                  種類{" "}
                  <select
                    value={level}
                    onChange={(event) => setLevel(event.target.value)}
                  >
                    <option value="all">すべて</option>
                    <option value="national">国政選挙</option>
                    <option value="local">地方選挙</option>
                  </select>
                </label>
              </div>
              <div className="election-list">
                {visibleElections.map((item) => (
                  <article className="election-card" key={item.id}>
                    <span className="badge">
                      {item.level === "national" ? "国政選挙" : "地方選挙"}
                    </span>
                    <h3>{item.name}</h3>
                    <p>
                      {item.municipality || region} · 投票日 {item.date}
                    </p>
                    <Sources sources={item.sources} />
                    <button
                      className="text-button"
                      onClick={() => {
                        setElectionId(item.id);
                        setQuery("");
                        navigate("candidates");
                      }}
                    >
                      候補者を見る →
                    </button>
                  </article>
                ))}
              </div>
              {!visibleElections.length && (
                <Empty title="選挙情報は未収録です">
                  {region}の{period === "past" ? "過去" : "現在"}
                  の選挙情報は、公式資料の確認・登録後に掲載します。
                </Empty>
              )}
              <button
                className="text-button"
                onClick={() => {
                  setElectionId(null);
                  setQuery("");
                  navigate("candidates");
                }}
              >
                候補者一覧の収録状況を見る →
              </button>
            </section>
            <section className="panel">
              <h2>年代別投票率</h2>
              <p className="small">
                選挙ごとの公式集計を数値で表示します。推計や他の地域の数値による補完はしません。
              </p>
              {regionalElections.length ? (
                regionalElections.map((item) => (
                  <article key={item.id}>
                    <h3>{item.name}</h3>
                    {item.turnout.status === "recorded" ? (
                      <>
                        <table>
                          <thead>
                            <tr>
                              <th>年代</th>
                              <th>投票率</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.turnout.value.map((row) => (
                              <tr key={row.age}>
                                <td>{row.age}</td>
                                <td>{row.rate}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <Sources sources={item.turnout.sources} />
                      </>
                    ) : (
                      <RecordText entry={item.turnout} />
                    )}
                  </article>
                ))
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>対象選挙</th>
                      <th>年代</th>
                      <th>投票率</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>未収録</td>
                      <td>未収録</td>
                      <td>未収録</td>
                    </tr>
                  </tbody>
                </table>
              )}
            </section>
          </>
        )}
        {page === "candidates" && (
          <>
            {activeElection && <Sources sources={activeElection.sources} />}
            <section className="panel">
              <label className="input-label" htmlFor="candidate-query">
                公約・候補者名・政党名で検索
              </label>
              <input
                className="wide-input"
                id="candidate-query"
                type="search"
                value={query}
                placeholder="キーワードを入力"
                onChange={(event) => setQuery(event.target.value)}
              />
              <p className="small" role="status">
                {results.length}人の候補者{query && ` · 「${query}」の検索結果`}
              </p>
              <div className="candidate-grid">
                {results.map((item) => (
                  <article className="candidate-card" key={item.id}>
                    <div className="candidate-intro">
                      <Photo
                        key={item.id}
                        entry={item.photo}
                        name={item.name}
                      />
                      <div>
                        <h2>
                          <button
                            className="candidate-name"
                            onClick={() => openCandidate(item.id)}
                          >
                            {item.name}
                          </button>
                        </h2>
                        <RecordText entry={item.party} />
                      </div>
                    </div>
                    <h3>公約</h3>
                    {pledgeText(item)}
                    <Sources sources={item.sources} />
                    <div className="card-actions">
                      <button
                        className="text-button"
                        onClick={() => openCandidate(item.id)}
                      >
                        詳細を見る →
                      </button>
                      {compareButton(item)}
                    </div>
                  </article>
                ))}
              </div>
              {!results.length && (
                <Empty
                  title={
                    regionalCandidates.length
                      ? "条件に一致する候補者がいません"
                      : "候補者情報は未収録です"
                  }
                >
                  {regionalCandidates.length
                    ? "キーワードを変更して検索してください。"
                    : "公式資料を人が確認した候補者情報から順次掲載します。架空の候補者は掲載しません。"}
                </Empty>
              )}
              {query && (
                <button className="text-button" onClick={() => setQuery("")}>
                  検索をクリア
                </button>
              )}
            </section>
            <section className="preview-callout">
              <div>
                <span className="badge">空状態の表示確認</span>
                <h2>登録前の画面構成を確認する</h2>
                <p>実在候補者の情報を含まない、未収録の表示例です。</p>
              </div>
              <button
                className="button secondary"
                onClick={() => {
                  setCandidateId(null);
                  setTab(0);
                  navigate("detail");
                  setPreview(true);
                }}
              >
                詳細・具体性チェックを見る →
              </button>
            </section>
          </>
        )}
        {page === "detail" && (
          <>
            <button
              className="text-button back"
              onClick={() => navigate("candidates")}
            >
              ← 候補者一覧へ
            </button>
            {preview && (
              <p className="notice">
                空状態の表示例です。実在する候補者ではありません。比較対象にも登録されません。
              </p>
            )}
            <div className="detail-profile">
              <Photo
                key={candidate?.id || "empty"}
                entry={candidate?.photo || missing<string>()}
                name={candidate?.name || ""}
              />
              <div>
                {candidate && <RecordText entry={candidate.party} />}
                <p>
                  公式資料で確認した内容を掲載します。
                  <br />
                  未収録の情報は推測で補いません。
                </p>
              </div>
            </div>
            {candidate && <Sources sources={candidate.sources} />}
            <div className="tab-list" role="tablist" aria-label="候補者の情報">
              {tabs.map((label, index) => (
                <button
                  key={label}
                  role="tab"
                  id={`tab-${index}`}
                  aria-controls={`panel-${index}`}
                  aria-selected={tab === index}
                  tabIndex={tab === index ? 0 : -1}
                  onClick={() => setTab(index)}
                  onKeyDown={(event) => {
                    let next = index;
                    if (event.key === "ArrowRight")
                      next = (index + 1) % tabs.length;
                    else if (event.key === "ArrowLeft")
                      next = (index + tabs.length - 1) % tabs.length;
                    else if (event.key === "Home") next = 0;
                    else if (event.key === "End") next = tabs.length - 1;
                    else return;
                    event.preventDefault();
                    setTab(next);
                    document.getElementById(`tab-${next}`)?.focus();
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <section
              className="panel detail-content"
              role="tabpanel"
              id={`panel-${tab}`}
              aria-labelledby={`tab-${tab}`}
              tabIndex={0}
            >
              <h2>{tabs[tab]}</h2>
              {tab === 0 ? (
                <>
                  {pledgeText(candidate)}
                  <h3>公約の具体性チェック</h3>
                  <p className="small">
                    公式資料の記載状況を確認する項目です。能力・実現可能性の採点ではありません。
                  </p>
                  {candidate?.pledges.length ? (
                    candidate.pledges.map((pledge) => (
                      <article className="pledge" key={pledge.id}>
                        <RecordText entry={pledge.text} />
                        <dl className="checks">
                          {checkLabels.map((label) => (
                            <div key={label}>
                              <dt>{label}</dt>
                              <dd>
                                <RecordText entry={pledge.checks[label]} />
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </article>
                    ))
                  ) : (
                    <dl className="checks">
                      {checkLabels.map((label) => (
                        <div key={label}>
                          <dt>{label}</dt>
                          <dd>
                            <RecordText entry={missing<string>()} />
                            <p className="small">根拠文章・公式資料：未収録</p>
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </>
              ) : (
                <RecordText
                  entry={
                    candidate
                      ? [
                          candidate.profile,
                          candidate.speeches,
                          candidate.votes,
                          candidate.history,
                        ][tab - 1]
                      : missing<string[]>()
                  }
                />
              )}
            </section>
          </>
        )}
        {page === "compare" && (
          <>
            <p className="notice">
              人数制限なし・横スクロール対応。候補者の独自採点、推薦、順位付けは行いません。
            </p>
            {!compared.length && !preview && (
              <section className="panel">
                <Empty title="比較する候補者が選択されていません">
                  候補者一覧の「比較に追加」から選択できます。候補者データは現在未収録です。
                </Empty>
                <div className="center-actions">
                  <button
                    className="button primary"
                    onClick={() => navigate(region ? "candidates" : "home")}
                  >
                    {region ? "候補者一覧へ" : "地域を選ぶ"}
                  </button>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setPreview(true);
                      setSlots([1, 2]);
                    }}
                  >
                    未収録の比較表示を見る
                  </button>
                </div>
              </section>
            )}
            {preview && (
              <div className="preview-toolbar">
                <p>
                  空状態の表示例です。各列は候補者ではなく、未入力の表示枠です。
                </p>
                <button
                  className="button secondary"
                  onClick={() =>
                    setSlots((items) => [...items, Math.max(0, ...items) + 1])
                  }
                >
                  ＋ 表示枠を追加
                </button>
                <button
                  className="text-button"
                  onClick={() => setPreview(false)}
                >
                  表示例を閉じる
                </button>
              </div>
            )}
            {(compared.length > 0 || preview) && (
              <>
                <p className="small">
                  左右にスクロールして、すべての列を確認できます。
                </p>
                <div
                  className="comparison-scroll"
                  role="region"
                  aria-label="公約比較表・横スクロール"
                  tabIndex={0}
                >
                  <table className="comparison-table">
                    <caption className="sr-only">
                      候補者の公約と公式資料の記載状況
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">確認する項目</th>
                        {preview
                          ? slots.map((slot) => (
                              <th scope="col" key={slot}>
                                未入力の表示枠 {slot}
                                <button
                                  className="text-button"
                                  onClick={() =>
                                    setSlots((items) =>
                                      items.filter((item) => item !== slot),
                                    )
                                  }
                                >
                                  表示枠を削除
                                </button>
                              </th>
                            ))
                          : compared.map((item) => (
                              <th scope="col" key={item.id}>
                                <button
                                  className="candidate-name"
                                  onClick={() => openCandidate(item.id)}
                                >
                                  {item.name}
                                </button>
                                <p className="small">
                                  {
                                    elections.find(
                                      (election) =>
                                        election.id === item.electionId,
                                    )?.name
                                  }
                                </p>
                                {compareButton(item)}
                              </th>
                            ))}
                      </tr>
                    </thead>
                    <tbody>
                      {["所属政党", "公約", ...checkLabels].map((label) => (
                        <tr key={label}>
                          <th scope="row">{label}</th>
                          {preview
                            ? slots.map((slot) => (
                                <td key={slot}>
                                  <RecordText entry={missing<string>()} />
                                </td>
                              ))
                            : compared.map((item) => (
                                <td key={item.id}>
                                  {label === "所属政党" ? (
                                    <RecordText entry={item.party} />
                                  ) : !item.pledges.length ? (
                                    <RecordText entry={missing<string>()} />
                                  ) : (
                                    item.pledges.map((pledge) => (
                                      <div
                                        className="comparison-pledge"
                                        key={pledge.id}
                                      >
                                        {label !== "公約" && (
                                          <RecordText entry={pledge.text} />
                                        )}
                                        <RecordText
                                          entry={
                                            label === "公約"
                                              ? pledge.text
                                              : pledge.checks[
                                                  label as (typeof checkLabels)[number]
                                                ]
                                          }
                                        />
                                      </div>
                                    ))
                                  )}
                                </td>
                              ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
        {page === "guide" && (
          <>
            <section className="panel">
              <h2>公式資料を、人が確認して登録</h2>
              <p>
                公約・経歴・議会記録・投票率には、公式リンク、発行元、最終確認日を表示します。現在、選挙・候補者・投票率の確認済みデータは未収録です。
              </p>
              <div className="status-guide">
                {[
                  [
                    "未収録",
                    "まだ情報を登録していません。存在しないという意味ではありません。",
                  ],
                  [
                    "確認できず",
                    "確認した資料では内容を確認できませんでした。確認に使った資料を表示します。",
                  ],
                  [
                    "該当記録なし",
                    "確認した公式資料の対象範囲に、該当記録がないと確認しています。対象範囲と資料を表示します。",
                  ],
                ].map(([label, text]) => (
                  <div key={label}>
                    <span className="badge">{label}</span>
                    <p>{text}</p>
                  </div>
                ))}
              </div>
            </section>
            <section className="panel">
              <h2>公約の具体性チェック</h2>
              <p>
                5項目の記載状況と根拠文章を確認できます。記載の有無を能力や実現可能性の採点に変換しません。
              </p>
            </section>
            <section className="panel">
              <h2>政治用語の解説</h2>
              <p>
                公約内で下線が付いた用語を押すと、短い解説と出典が開きます。
              </p>
              {glossary.length ? (
                glossary.map((item) => (
                  <p key={item.term}>
                    <RichText text={item.term} />
                  </p>
                ))
              ) : (
                <p className="small">
                  解説文と出典は未収録です。人が確認した用語が登録されると、公約内でも利用できます。
                </p>
              )}
            </section>
            <section className="panel">
              <h2>この試作品について</h2>
              <p>
                管理者画面・認証・公開承認フロー・データベース・デプロイ先は未決定のため未実装です。チュートリアルの完了状態のみブラウザー内に保存します。比較の選択状態は再読み込みでリセットされます。
              </p>
              <button
                className="button secondary"
                onClick={() => {
                  navigate("home");
                  setTour(0);
                }}
              >
                操作ガイドをもう一度見る
              </button>
            </section>
          </>
        )}
        <footer className="footer">
          <span>選挙情報（仮称）</span>
          <p>情報を知る。根拠を読む。自分で考える。</p>
          <button className="text-button" onClick={() => navigate("guide")}>
            データと収録方針 →
          </button>
        </footer>
      </main>
      {selected.length > 0 && page !== "compare" && (
        <div className="compare-tray" role="status">
          <span>{selected.length}人を比較に選択中</span>
          <button
            className="button primary"
            onClick={() => navigate("compare")}
          >
            比較する →
          </button>
        </div>
      )}
      {tour !== null && (
        <div className="tour-shade">
          <div
            ref={tourRef}
            tabIndex={-1}
            className="tour-card"
            role="dialog"
            aria-modal="true"
            aria-labelledby="tour-title"
            aria-describedby="tour-description"
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                finishTour();
                return;
              }
              if (event.key === "Tab") {
                const items = Array.from(
                  event.currentTarget.querySelectorAll<HTMLButtonElement>(
                    "button",
                  ),
                );
                const first = items[0];
                const last = items[items.length - 1];
                if (
                  event.shiftKey &&
                  (document.activeElement === first ||
                    document.activeElement === event.currentTarget)
                ) {
                  event.preventDefault();
                  last.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault();
                  first.focus();
                }
              }
            }}
          >
            <div className="tour-progress">
              <span>はじめての操作ガイド</span>
              <span>
                {tour + 1} / {steps.length}
              </span>
            </div>
            <h2 id="tour-title">{steps[tour][0]}</h2>
            <p id="tour-description">{steps[tour][1]}</p>
            <div className="tour-actions">
              <button className="text-button" onClick={finishTour}>
                ガイドを終了
              </button>
              {tour > 0 && (
                <button
                  className="text-button"
                  onClick={() => setTour(tour - 1)}
                >
                  戻る
                </button>
              )}
              <button
                className="button primary"
                onClick={() =>
                  tour === steps.length - 1 ? finishTour() : setTour(tour + 1)
                }
              >
                {tour === steps.length - 1 ? "はじめる" : "次へ →"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
export default App;
