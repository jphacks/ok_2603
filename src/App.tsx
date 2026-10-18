import { useEffect, useRef, useState } from "react";
import { PollingSearch } from "./polling/PollingSearch";
import { PollingAdmin } from "./polling/PollingAdmin";
import {
  candidates,
  elections,
  glossary,
  glossaryReadings,
} from "./election/data";
import { CouncilPage } from "./election/CouncilPage";
import { IslandDecoration, FlowerDecoration } from "./election/HomeDecor";
import "./home.css";
import {
  checkLabels,
  districtSource,
  electionAppliesToMunicipality,
  isGovernorElection,
  missing,
  municipalities,
  municipalityReadings,
  normalizeRegion,
  prefecturalDistrictFor,
  searchCandidates,
  searchMunicipalities,
  searchGlossary,
  toggleSelection,
  type Candidate,
} from "./election/model";
import {
  electionDayVotingPlacesByMunicipality,
  earlyVotingPlacesByMunicipality,
  earlyVotingPlacesSource,
  mapSearchUrl,
} from "./election/earlyVotingPlaces";
import {
  Empty,
  Icon,
  Photo,
  RecordText,
  Sources,
} from "./election/components";

type Page = "home" | "region" | "candidates" | "detail" | "compare" | "guide" | "council" | "polling" | "polling-admin";
const tutorialKey = "election-prototype:tutorial:v1";
const tabs = [
  "公約",
  "経歴",
  "議会での発言",
  "議案への賛否",
  "過去の公約・実施状況",
];
const comparisonLabels = ["所属政党", "公約", ...checkLabels] as const;
type ComparisonLabel = (typeof comparisonLabels)[number];
const steps = [
  [
    "まずは、沖縄県内の地域を選びましょう",
    "知事選挙のボタン、または市町村検索から選挙情報を確認できます。",
    "region-search",
  ],
  [
    "地域の選挙を選ぶ",
    "地域ページの選挙を選ぶと、候補者全員の公約比較ページに進みます。未登録の情報は「未収録」と表示します。",
    "region-search",
  ],
  [
    "公約を読み比べる",
    "比較ページには全候補者が表示されます。候補者を選ぶと比較対象を絞り込めます。推薦や順位付けは行いません。",
    "region-search",
  ],
];

function App() {
  const [page, setPage] = useState<Page>("home");
  const [homeHeadlineVersion, setHomeHeadlineVersion] = useState(0);
  const [homeMenuOpen, setHomeMenuOpen] = useState(false);
  const [showAllMunicipalities, setShowAllMunicipalities] = useState(false);
  const [region, setRegion] = useState("");
  const [municipality, setMunicipality] = useState<string | null>(null);
  const [governorOnly, setGovernorOnly] = useState(false);
  const [regionQuery, setRegionQuery] = useState("");
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [query, setQuery] = useState("");
  const [electionId, setElectionId] = useState<string | null>(null);
  const [level, setLevel] = useState("all");
  const [period, setPeriod] = useState("current");
  const [votingPlaceType, setVotingPlaceType] = useState<
    "early" | "election-day"
  >("early");
  const [selected, setSelected] = useState<string[]>([]);
  const [candidateId, setCandidateId] = useState<string | null>(null);
  const [tab, setTab] = useState(0);
  const [glossaryQuery, setGlossaryQuery] = useState("");
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
  const electionCandidates = candidates.filter(
    (item) => item.electionId === electionId,
  );
  const comparisonCandidates = compared.length ? compared : electionCandidates;
  const visibleGlossary = searchGlossary(
    glossary,
    glossaryQuery,
    glossaryReadings,
  );
  const regionalElections = elections.filter((item) =>
    item.prefectureIds.includes(region) &&
    (governorOnly ? isGovernorElection(item) : !isGovernorElection(item)) &&
    (!municipality || electionAppliesToMunicipality(item, municipality)),
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
  const municipalMatches = searchMunicipalities(regionQuery);
  const regionSuggestions = municipalMatches;
  const exactMunicipality = municipalities.find(
    (name) => [name, municipalityReadings[name]].some(term => normalizeRegion(term) === normalizeRegion(regionQuery)),
  );
  const canSearchRegion = !!exactMunicipality;
  const hasRegionSuggestions =
    !suggestionsDismissed && !!regionQuery.trim() && !!regionSuggestions.length;
  const invalidMunicipality =
    !!regionQuery.trim() &&
    !municipalMatches.length;
  useEffect(() => {
    heading.current?.focus({ preventScroll: page === "home" });
  }, [page, region, candidateId]);
  useEffect(() => {
    if (page !== "home" || !hasRegionSuggestions || !window.matchMedia("(max-width: 600px)").matches) return;
    const frame = requestAnimationFrame(() => {
      const input = document.getElementById("region-query");
      const section = document.getElementById("region-search");
      if (!input || !section) return;
      const available = window.innerHeight - 78 - input.getBoundingClientRect().bottom;
      if (available < 180) window.scrollBy(0, Math.min(180 - available, Math.max(0, section.getBoundingClientRect().top - 12)));
    });
    return () => cancelAnimationFrame(frame);
  }, [page, regionQuery, hasRegionSuggestions]);
  useEffect(() => {
    if (tour !== null) {
      document
        .getElementById(steps[tour][2])
        ?.scrollIntoView({ block: "center" });
      tourRef.current?.focus();
    }
  }, [tour]);
  function navigate(next: Page) {
    if (next === "home") setHomeHeadlineVersion(version => version + 1);
    setHomeMenuOpen(false);
    setPage(next);
    setPreview(false);
    window.scrollTo(0, 0);
  }
  function openRegionSearch() {
    const focusSearch = () => document.getElementById("region-search")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    });
    if (page === "home") focusSearch();
    else { navigate("home"); window.setTimeout(focusSearch, 0); }
  }
  function chooseRegion(name: string) {
    setRegion(name);
    setGovernorOnly(true);
    setMunicipality(null);
    setElectionId(null);
    setCandidateId(null);
    setSelected([]);
    setQuery("");
    setLevel("all");
    setPeriod("current");
    navigate("region");
  }
  function chooseMunicipality(name: string) {
    setRegion("沖縄県");
    setGovernorOnly(false);
    setMunicipality(name);
    setElectionId(null);
    setCandidateId(null);
    setSelected([]);
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
    if (page === "home") window.scrollTo(0, 0);
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
  function comparisonCell(item: Candidate, label: ComparisonLabel) {
    if (label === "所属政党") return <RecordText entry={item.party} />;
    if (label === "公約") {
      return item.pledges.length ? (
        item.pledges.map((pledge) => (
          <div className="comparison-pledge" key={pledge.id}>
            <RecordText entry={pledge.text} />
          </div>
        ))
      ) : (
        <RecordText entry={missing<string>()} />
      );
    }
    return item.pledges.length ? (
      item.pledges.map((pledge) => (
        <div className="comparison-pledge" key={pledge.id}>
          <RecordText entry={pledge.text} />
          <RecordText entry={pledge.checks[label]} />
        </div>
      ))
    ) : (
      <RecordText entry={missing<string>()} />
    );
  }
  const title =
    page === "region"
      ? governorOnly ? "沖縄県知事選挙" : municipality || region
      : page === "candidates"
        ? "候補者と公約"
        : page === "detail"
          ? candidate?.name || "候補者情報：未収録"
          : page === "compare"
            ? "公約を比較する"
            : page === "council" ? "沖縄県議会議員"
            : page === "polling" ? "投票所を探す"
            : page === "polling-admin" ? "投票所管理"
            : page === "guide"
              ? "政治・選挙の用語"
              : "用語";

  return (
    <div className={page === "home" ? "app-shell home-shell" : "app-shell"}>
      <a className="skip-link" href="#main">
        本文へ移動
      </a>
      <header className="header">
        <div className="header-inner">
          <button className="brand" onClick={() => navigate("home")}>
            <span className="brand-mark" aria-hidden="true">
              {page === "home" ? <img className="home-brand-logo" src="/images/logo.png" alt="" width="54" height="54" /> : "選"}
            </span>
            <span>
              選挙情報{page !== "home" && <span className="brand-sub">アプリ名称未定 · 試作品</span>}
            </span>
          </button>
          <nav className="navigation" aria-label="メインナビゲーション">
            {(
              [
                ["home", "home", "ホーム"],
                ["polling", "region", "投票所を探す"],
                ["compare", "compare", "公約比較"],
                ["guide", "book", "用語"],
              ] as const
            )
              .filter(([target]) => page === "home" ? target === "home" || target === "guide" : target !== "compare" || !!electionId)
              .map(([target, icon, label]) => {
                const classes = page === target ? "nav-active" : "";
                return (
                  <button
                    id={target === "compare" ? "comparison-link" : undefined}
                    key={target}
                    className={classes}
                    aria-current={page === target ? "page" : undefined}
                    onClick={() => navigate(target)}
                  >
                    <Icon name={icon} />
                    <span>{page === "home" && target === "guide" ? "データについて" : label}</span>
                    {target === "compare" && (
                      <span className="count">{selected.length}</span>
                    )}
                  </button>
                );
              })}
          </nav>
          {page === "home" && (
            <div className="home-menu">
              <button className="home-menu-toggle" aria-label={homeMenuOpen ? "メニューを閉じる" : "メニューを開く"} aria-expanded={homeMenuOpen} aria-controls="home-menu-links" onClick={() => setHomeMenuOpen(!homeMenuOpen)}>
                <span /><span /><span />
              </button>
              {homeMenuOpen && <nav id="home-menu-links" className="home-menu-links" aria-label="ホームメニュー">
                <button onClick={() => chooseRegion("沖縄県")}>沖縄県知事選挙</button>
                <button onClick={() => { setHomeMenuOpen(false); openRegionSearch(); }}>市町村別の選挙</button>
                <button onClick={() => navigate("polling")}>投票所を探す</button>
                <button onClick={() => navigate("guide")}>データについて</button>
              </nav>}
            </div>
          )}
        </div>
      </header>
      <main id="main" className="main">
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
              {!["guide", "council", "compare", "polling", "polling-admin"].includes(page) && (
                <>
                  <button onClick={() => navigate("region")}>{region}</button>
                  {!(page === "region" && !municipality) && <span>/</span>}
                </>
              )}
              <span>{title}</span>
            </div>
            <div
              className={`page-heading${page === "guide" ? " glossary-page-heading" : ""}`}
            >
              <div>
                <p className="eyebrow">
                  {page === "region"
                    ? "REGIONAL DASHBOARD"
                    : page === "council" ? "OKINAWA PREFECTURAL ASSEMBLY"
                    : page === "compare"
                      ? "PLEDGE COMPARISON"
                      : page === "guide"
                        ? "POLITICAL & ELECTION TERMS"
                        : "ELECTION INFORMATION"}
                </p>
                <h1
                  id={page === "guide" ? "glossary-title" : undefined}
                  ref={heading}
                  tabIndex={-1}
                >
                  {title}
                </h1>
                <p>
                  {page === "council"
                    ? "現職の県議会議員を、氏名・選挙区から探せます。"
                    : page === "compare"
                    ? "公約と実施方法を、候補者ごとに確認できます。"
                    : page === "guide"
                      ? "政治や選挙の基本用語を、公式情報をもとに解説します。"
                      : ["candidates", "detail"].includes(page)
                        ? `${municipality ? `${municipality} · ` : ""}${activeElection?.name || "選挙情報は未収録"}`
                        : page === "region" && municipality
                          ? `${municipality}に関係する選挙と公式情報を確認できます。`
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
        {page === "polling" && <PollingSearch openAdmin={() => navigate("polling-admin")} />}
        {page === "polling-admin" && <PollingAdmin />}
        {page === "home" && (
          <>
            <section className="home-visual" aria-label="沖縄の選挙情報">
            <h1 key={homeHeadlineVersion} className="home-catchphrase" ref={heading} tabIndex={-1}>
              知ることから、
              <br />
              わたしの一票へ。
            </h1>
            </section>
            <div className="home-content">
            <button className="governor-entry" onClick={() => chooseRegion("沖縄県")}>
              <span className="governor-entry-copy">
                <span className="governor-entry-eyebrow">沖縄県全体で選ぶ選挙</span>
                <span className="governor-entry-label">沖縄県知事選挙</span>
                <span className="governor-entry-caption">候補者・公約を確認する</span>
              </span>
              <IslandDecoration />
              <img className="governor-flower" src="/images/hibiscus.webp" alt="" aria-hidden="true" />
              <span className="governor-entry-arrow" aria-hidden="true">→</span>
            </button>
            <section
              id="region-search"
              className={`search-panel home-search ${tour === 0 ? "tour-highlight" : ""}`}
            >
              <FlowerDecoration />
              <div className="home-search-heading">
                <span className="home-pin"><Icon name="region" /></span>
                <div><h2>市町村別の選挙を探す</h2>
                <p>お住まいの地域の選挙情報を確認できます。</p></div>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (exactMunicipality)
                    chooseMunicipality(exactMunicipality);
                }}
              >
                <label className="sr-only" htmlFor="region-query">
                  沖縄県内の市町村名で検索
                </label>
                <div className="region-search-control">
                  <div className="search-input">
                    <svg className="home-search-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><circle cx="10.5" cy="10.5" r="7.5" /><path d="m16 16 6 6" /></svg>
                    <input
                      id="region-query"
                      type="search"
                      role="combobox"
                      aria-autocomplete="list"
                      aria-controls="region-suggestions"
                      aria-expanded={hasRegionSuggestions}
                      aria-activedescendant={hasRegionSuggestions && activeSuggestion >= 0 ? `region-option-${activeSuggestion}` : undefined}
                      aria-invalid={invalidMunicipality}
                      aria-describedby={
                        regionQuery.trim() && !canSearchRegion
                          ? "region-query-error"
                          : undefined
                      }
                      placeholder="市町村名・よみがなで検索"
                      value={regionQuery}
                      autoComplete="off"
                      onChange={(event) => {
                        setRegionQuery(event.target.value);
                        setActiveSuggestion(-1);
                        setSuggestionsDismissed(false);
                      }}
                      onFocus={() => setSuggestionsDismissed(false)}
                      onKeyDown={(event) => {
                        if (event.nativeEvent.isComposing) return;
                        if (event.key === "Escape") {
                          setSuggestionsDismissed(true);
                          setActiveSuggestion(-1);
                        } else if ((event.key === "ArrowDown" || event.key === "ArrowUp") && regionSuggestions.length && regionQuery.trim()) {
                          event.preventDefault();
                          setSuggestionsDismissed(false);
                          const next = event.key === "ArrowDown"
                            ? (activeSuggestion + 1) % regionSuggestions.length
                            : (activeSuggestion <= 0 ? regionSuggestions.length : activeSuggestion) - 1;
                          setActiveSuggestion(next);
                          document.getElementById(`region-option-${next}`)?.scrollIntoView({ block: "nearest" });
                        } else if (event.key === "Enter" && hasRegionSuggestions && activeSuggestion >= 0) {
                          event.preventDefault();
                          const name = regionSuggestions[activeSuggestion];
                          chooseMunicipality(name);
                        }
                      }}
                    />
                    <button
                      className="button primary"
                      type="submit"
                      disabled={!canSearchRegion}
                    >
                      検索
                    </button>
                  </div>
                  {hasRegionSuggestions && (
                    <div
                      id="region-suggestions"
                      className="region-suggestions"
                      role="listbox"
                      aria-label="検索候補"
                    >
                      {municipalMatches.map((name, index) => (
                        <button
                          type="button"
                          role="option"
                          id={`region-option-${index}`}
                          aria-selected={activeSuggestion === index}
                          key={name}
                          onClick={() => chooseMunicipality(name)}
                        >
                          {name} <span>{municipalityReadings[name]}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </form>
              <div className="home-city-shortcuts" aria-label="市町村を選択">
                {(showAllMunicipalities ? municipalities : ["那覇市", "名護市", "沖縄市", "うるま市", "宮古島市"]).map(name => <button key={name} onClick={() => chooseMunicipality(name)}>{name}</button>)}
                <button aria-label={showAllMunicipalities ? "市町村一覧を閉じる" : "すべての市町村を表示"} aria-expanded={showAllMunicipalities} onClick={() => setShowAllMunicipalities(!showAllMunicipalities)}>{showAllMunicipalities ? "閉じる" : "•••"}</button>
              </div>
              {!!regionQuery.trim() && !canSearchRegion && (
                <p
                  id="region-query-error"
                  className="search-error"
                  role={invalidMunicipality ? "alert" : "status"}
                >
                  {invalidMunicipality
                    ? "存在しない市町村名です。沖縄県内の候補から選択してください。"
                    : "市町村名の候補を選択するか、正式名称を入力してください。"}
                </p>
              )}
              <p className="small">
                公式資料を確認後に掲載。未登録の情報は「未収録」と表示。
              </p>
            </section>
              <p className="home-image-note">風景・花・地図は装飾イメージです。</p>
            </div>
          </>
        )}
        {page === "council" && <CouncilPage />}
        {page === "region" && (
          <>
            {municipality && prefecturalDistrictFor(municipality) && <div className="notice">
              <p>県議会議員選挙区：{prefecturalDistrictFor(municipality)!.name}</p>
              <Sources sources={[districtSource]} />
            </div>}
            {municipality && (
              <section className="panel" aria-labelledby="map-search-title">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">VOTING PLACES</p>
                    <h2 id="map-search-title">投票場所</h2>
                  </div>
                </div>
                <div className="segmented" role="group" aria-label="投票場所の種類">
                  <button
                    type="button"
                    aria-pressed={votingPlaceType === "early"}
                    onClick={() => setVotingPlaceType("early")}
                  >
                    期日前投票
                  </button>
                  <button
                    type="button"
                    aria-pressed={votingPlaceType === "election-day"}
                    onClick={() => setVotingPlaceType("election-day")}
                  >
                    当日投票
                  </button>
                </div>
                {votingPlaceType === "early" ? (
                  <>
                    <p className="small">
                      {earlyVotingPlacesSource.title}（{earlyVotingPlacesSource.publisher}、
                      {earlyVotingPlacesSource.asOf}時点）に掲載された場所です。
                      {earlyVotingPlacesSource.electionDate}執行の選挙は終了しており、
                      現在の投票所や施設の営業状況を示すものではありません。
                    </p>
                    <p className="small">
                      市町村内の掲載場所を表示しています。距離順ではなく、地図リンクを開くと施設名でGoogle
                      Mapsを検索します。
                    </p>
                    {earlyVotingPlacesByMunicipality[municipality]?.length ? (
                      <ul className="place-list">
                        {earlyVotingPlacesByMunicipality[municipality].map(
                          (place) => (
                            <li key={place}>
                              <span>{place}</span>
                              <a
                                className="button secondary"
                                href={mapSearchUrl(municipality, place)}
                                aria-label={`${municipality}の${place}をGoogle Mapsで検索（新しいタブで開く）`}
                                target="_blank"
                                rel="noreferrer"
                              >
                                地図で検索
                              </a>
                            </li>
                          ),
                        )}
                      </ul>
                    ) : (
                      <Empty title="掲載場所はありません">
                        この市町村の期日前投票所は添付資料に記載されていません。
                      </Empty>
                    )}
                    <p className="small place-source">
                      出典: {earlyVotingPlacesSource.fileName} · 地図検索を選ぶと
                      Google Mapsに検索語が送信されます。
                    </p>
                  </>
                ) : (
                  electionDayVotingPlacesByMunicipality[municipality]?.length ? (
                    <>
                      <p className="small">
                        以下は提供された情報です。対象となる選挙・年度と最新性は未確認のため、投票前に市町村選挙管理委員会の公式情報をご確認ください。
                      </p>
                      <ul className="place-list">
                        {electionDayVotingPlacesByMunicipality[
                          municipality
                        ].map((place) => (
                          <li key={place.name}>
                            <span>
                              <strong>{place.name}</strong>
                              <span className="place-address">
                                所在地：{place.address}
                              </span>
                            </span>
                            <a
                              className="button secondary"
                              href={mapSearchUrl(
                                municipality,
                                `${place.name} ${place.address}`,
                              )}
                              aria-label={`${municipality}の${place.name}（${place.address}）をGoogle Mapsで検索（新しいタブで開く）`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              地図で検索
                            </a>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <Empty title="当日投票所は未収録です">
                      当日投票所は、公式情報を確認後に掲載します。
                    </Empty>
                  )
                )}
              </section>
            )}
            <section className="panel">
              <div className="section-heading">
                <h2>
                  {municipality
                    ? `${municipality}に関連する選挙`
                    : governorOnly ? "沖縄県知事選挙" : "関連する選挙"}
                </h2>
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
                {!governorOnly && <label>
                  種類{" "}
                  <select
                    value={level}
                    onChange={(event) => setLevel(event.target.value)}
                  >
                    <option value="all">すべて</option>
                    <option value="national">国政選挙</option>
                    <option value="local">地方選挙</option>
                  </select>
                </label>}
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
                        setSelected([]);
                        setCandidateId(null);
                        setQuery("");
                        navigate("compare");
                      }}
                    >
                      この選挙の公約を比較する →
                    </button>
                  </article>
                ))}
              </div>
              {!visibleElections.length && (
                <Empty title="選挙情報は未収録です">
                  {governorOnly ? "沖縄県知事選挙" : municipality || region}の{period === "past" ? "過去" : "現在"}
                  の選挙情報は、公式資料の確認・登録後に掲載します。
                </Empty>
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
            {activeElection && (
              <>
                <button
                  className="text-button back"
                  onClick={() => navigate("region")}
                >
                  ← 選挙一覧に戻る
                </button>
                <section className="comparison-heading panel">
                  <span className="badge">
                    {activeElection.level === "national"
                      ? "国政選挙"
                      : "地方選挙"}
                  </span>
                  <h2>{activeElection.name}</h2>
                  <p>
                    {activeElection.municipality || region} · 投票日{" "}
                    {activeElection.date}
                  </p>
                  <Sources sources={activeElection.sources} />
                </section>
                {electionCandidates.length > 0 && (
                  <section
                    className="panel comparison-candidate-picker"
                    aria-labelledby="comparison-candidates-heading"
                  >
                    <div className="section-heading">
                      <div>
                        <h2 id="comparison-candidates-heading">
                          比較する候補者
                        </h2>
                        <p className="small">
                          初期表示では全候補者を比較します。候補者を選ぶと、その人たちに比較対象を絞り込めます。
                        </p>
                      </div>
                      <span className="badge">
                        {selected.length
                          ? `${selected.length}人を選択中`
                          : `${electionCandidates.length}人全員を表示`}
                      </span>
                    </div>
                    <div className="comparison-candidate-list">
                      {electionCandidates.map((item) => (
                        <article
                          className="comparison-candidate"
                          key={item.id}
                        >
                          <h3>
                            <button
                              className="candidate-name"
                              onClick={() => openCandidate(item.id)}
                            >
                              {item.name}
                            </button>
                          </h3>
                          <p className="party-label">
                            <span>所属</span>
                            {item.party.status === "recorded"
                              ? item.party.value
                              : "未収録"}
                          </p>
                          {compareButton(item)}
                        </article>
                      ))}
                    </div>
                    <div className="comparison-actions">
                      <button
                        className="text-button"
                        onClick={() => navigate("candidates")}
                      >
                        候補者一覧・検索を見る →
                      </button>
                      {selected.length > 0 && (
                        <button
                          className="text-button"
                          onClick={() => setSelected([])}
                        >
                          全候補者の比較に戻す
                        </button>
                      )}
                    </div>
                  </section>
                )}
              </>
            )}
            {!electionCandidates.length && !preview && (
              <section className="panel">
                <Empty title="候補者情報は未収録です">
                  この選挙の候補者・公約は、公式資料を確認してから掲載します。
                </Empty>
                <div className="center-actions">
                  <button
                    className="button primary"
                    onClick={() => navigate(activeElection ? "region" : "home")}
                  >
                    {activeElection ? "選挙一覧へ戻る" : "地域を選ぶ"}
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
            {(comparisonCandidates.length > 0 || preview) && (
              <>
                {!preview && (
                  <div className="comparison-mobile-actions">
                    <button
                      className="text-button"
                      onClick={() => navigate("candidates")}
                    >
                      候補者一覧・検索を見る →
                    </button>
                    {selected.length > 0 && (
                      <button
                        className="text-button"
                        onClick={() => setSelected([])}
                      >
                        全候補者の比較に戻す
                      </button>
                    )}
                  </div>
                )}
                <div className="comparison-mobile-list">
                  {preview
                    ? slots.map((slot) => (
                        <article className="comparison-mobile-card" key={slot}>
                          <h2>未入力の表示枠 {slot}</h2>
                          <div className="comparison-mobile-fields">
                            {comparisonLabels.map((label) => (
                              <section key={label}>
                                <h3>{label}</h3>
                                <RecordText entry={missing<string>()} />
                              </section>
                            ))}
                          </div>
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
                        </article>
                      ))
                    : comparisonCandidates.map((item) => (
                        <article className="comparison-mobile-card" key={item.id}>
                          <header>
                            <h2>
                              <button
                                className="candidate-name"
                                onClick={() => openCandidate(item.id)}
                              >
                                {item.name}
                              </button>
                            </h2>
                            <p className="small">
                              {
                                elections.find(
                                  (election) => election.id === item.electionId,
                                )?.name
                              }
                            </p>
                            {compareButton(item)}
                          </header>
                          <div className="comparison-mobile-fields">
                            <section>
                              <h3>所属政党</h3>
                              <RecordText entry={item.party} />
                            </section>
                            <section>
                              <h3>公約</h3>
                              {item.pledges.length ? (
                                item.pledges.map((pledge) => (
                                  <article
                                    className="comparison-mobile-pledge"
                                    key={pledge.id}
                                  >
                                    <RecordText entry={pledge.text} />
                                    <dl>
                                      {checkLabels.map((label) => (
                                        <div key={label}>
                                          <dt>{label}</dt>
                                          <dd>
                                            <RecordText
                                              entry={pledge.checks[label]}
                                            />
                                          </dd>
                                        </div>
                                      ))}
                                    </dl>
                                  </article>
                                ))
                              ) : (
                                <RecordText entry={missing<string>()} />
                              )}
                            </section>
                          </div>
                        </article>
                      ))}
                </div>
                <p className="small comparison-desktop-instruction">
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
                          : comparisonCandidates.map((item) => (
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
                                <div className="party-label">
                                  <span>所属</span>
                                  {item.party.status === "recorded"
                                    ? item.party.value
                                    : "未収録"}
                                </div>
                                {compareButton(item)}
                              </th>
                            ))}
                      </tr>
                    </thead>
                    <tbody>
                      {comparisonLabels.map((label) => (
                        <tr key={label}>
                          <th scope="row">{label}</th>
                          {preview
                            ? slots.map((slot) => (
                                <td key={slot}>
                                  <RecordText entry={missing<string>()} />
                                </td>
                              ))
                            : comparisonCandidates.map((item) => (
                                <td key={item.id}>
                                  {comparisonCell(item, label)}
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
          <section className="glossary-page" aria-labelledby="glossary-title">
            <div className="glossary-search">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="10.8" cy="10.8" r="6.8" />
                <path d="m16 16 4.5 4.5" />
              </svg>
              <input
                id="glossary-search"
                type="search"
                aria-label="用語を検索"
                value={glossaryQuery}
                onChange={(event) => setGlossaryQuery(event.target.value)}
                placeholder="用語を検索"
              />
            </div>
            <p className="glossary-results" role="status">
              {visibleGlossary.length}件の用語
            </p>
            {visibleGlossary.length ? (
              <div className="glossary-list">
                {visibleGlossary.map((item) => (
                  <article className="glossary-entry" key={item.term}>
                    <h3>
                      <ruby>
                        {item.term}
                        <rt>{glossaryReadings[item.term]}</rt>
                      </ruby>
                    </h3>
                    <p>{item.definition}</p>
                    <Sources sources={item.sources} />
                  </article>
                ))}
              </div>
            ) : (
              <p className="glossary-no-results">
                該当する用語はありません。別の言葉で検索してください。
              </p>
            )}
          </section>
        )}
        <footer className="footer">
          <span>選挙情報（仮称）</span>
          <p>情報を知る。根拠を読む。自分で考える。</p>
          {page !== "guide" && (
            <button className="text-button" onClick={() => navigate("guide")}>
              用語解説 →
            </button>
          )}
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
    </div>
  );
}
export default App;
