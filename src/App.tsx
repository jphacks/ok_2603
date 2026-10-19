import { useEffect, useRef, useState } from "react";
import { PollingSearch } from "./polling/PollingSearch";
import { PollingAdmin } from "./polling/PollingAdmin";
import {
  candidates,
  elections as knownElections,
  glossary,
  glossaryReadings,
} from "./election/data";
import { CouncilPage } from "./election/CouncilPage";
import { ThemeComparison } from "./election/ThemeComparison";
import { IslandDecoration, FlowerDecoration } from "./election/HomeDecor";
import "./home.css";
import {
  checkLabels,
  districtSource,
  electionAppliesToMunicipality,
  isGovernorElection,
  matchingElectionId,
  missing,
  municipalities,
  municipalityReadings,
  normalizeRegion,
  prefecturalDistrictFor,
  recentUniqueElections,
  searchCandidates,
  searchMunicipalities,
  searchGlossary,
  toggleSelection,
  type Candidate,
  type Election,
  type Pledge,
  type Source,
} from "./election/model";
import {
  mapSearchUrl,
} from "./election/mapSearch";
import {
  Empty,
  Icon,
  Photo,
  RecordText,
  Sources,
  RubyName,
} from "./election/components";

type Page = "home" | "region" | "candidates" | "detail" | "compare" | "themes" | "guide" | "council" | "polling" | "polling-admin";
type ApiElection = {
  id: string;
  name: string;
  kind?: Election["kind"];
  district?: string | null;
  municipality: string | null;
  voting_on: string | null;
  sources: { url: string; publisher: string; checkedAt: string }[];
};
type ElectionResponse = {
  data: ApiElection[];
  collectionStatus: string;
};
type MunicipalVotingPlace = {
  id: string;
  municipality_id: string;
  voting_type: "early" | "election_day";
  name: string;
  address: string;
  election_date: string;
  source_title: string;
  source_publisher: string;
  source_checked_at: string | null;
  source_reference: string;
  verification_status: "official_historical" | "user_provided_unverified";
};
type MunicipalVotingPlaceResponse = { data: MunicipalVotingPlace[] };
type ApiElectionCandidate = {
  id: string;
  name: string;
  party: string | null;
  ballot_number: number | null;
  age: number | null;
  affiliation: string | null;
  photo_available: boolean;
  sources: Source[];
  pledges: {
    id: string;
    title: string | null;
    summary: string;
    originalText: string;
    sourcePage: number | null;
    source: Source;
  }[];
};
type ApiElectionCandidatesResponse = {
  data: ApiElectionCandidate[];
  complete: boolean;
};
function isSource(value: unknown): value is Source {
  if (!value || typeof value !== "object") return false;
  const source = value as Record<string, unknown>;
  return (
    typeof source.url === "string" &&
    typeof source.publisher === "string" &&
    typeof source.checkedAt === "string"
  );
}
function isApiElectionCandidatesResponse(
  value: unknown,
): value is ApiElectionCandidatesResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  return (
    typeof response.complete === "boolean" &&
    Array.isArray(response.data) &&
    response.data.every((entry: unknown) => {
      if (!entry || typeof entry !== "object") return false;
      const candidate = entry as Record<string, unknown>;
      return (
        typeof candidate.id === "string" &&
        typeof candidate.name === "string" &&
        (candidate.party === null || typeof candidate.party === "string") &&
        (candidate.age === null || typeof candidate.age === "number") &&
        (candidate.affiliation === null ||
          typeof candidate.affiliation === "string") &&
        typeof candidate.photo_available === "boolean" &&
        Array.isArray(candidate.sources) &&
        candidate.sources.every(isSource) &&
        Array.isArray(candidate.pledges) &&
        candidate.pledges.every((pledge: unknown) => {
          if (!pledge || typeof pledge !== "object") return false;
          const item = pledge as Record<string, unknown>;
          return (
            typeof item.id === "string" &&
            (item.title === null || typeof item.title === "string") &&
            typeof item.summary === "string" &&
            typeof item.originalText === "string" &&
            (item.sourcePage === null || typeof item.sourcePage === "number") &&
            isSource(item.source)
          );
        })
      );
    })
  );
}
function mapApiCandidate(
  item: ApiElectionCandidate,
  electionId: string,
): Candidate {
  const sources = [
    ...new Map<string, Source>(
      [
        ...item.sources,
        ...item.pledges.map((pledge) => pledge.source),
      ].map((source) => [source.url, source]),
    ).values(),
  ];
  return {
    id: item.id,
    electionId,
    name: item.name,
    party:
      item.party && sources.length
        ? { status: "recorded", value: item.party, sources }
        : missing<string>(),
    photo: item.photo_available
      ? {
          status: "recorded",
          value: `/api/candidates/${encodeURIComponent(item.id)}/photo`,
          sources,
        }
      : missing<string>(),
    pledges: item.pledges.map((pledge) => ({
      id: pledge.id,
      text: {
        status: "recorded",
        value: pledge.originalText,
        sources: [pledge.source],
      },
      summary: pledge.summary,
      checks: {
        "何をするか": missing<string>(),
        "誰を対象にするか": missing<string>(),
        "いつまでに行うか": missing<string>(),
        "財源・実施方法": missing<string>(),
        "成果の確認方法": missing<string>(),
      },
    })),
    profile:
      item.age || item.affiliation
        ? {
            status: "recorded",
            value: [
              ...(item.age ? [`${item.age}歳`] : []),
              ...(item.affiliation ? [item.affiliation] : []),
            ],
            sources,
          }
        : missing<string[]>(),
    speeches: missing<string[]>(),
    votes: missing<string[]>(),
    history: missing<string[]>(),
    sources,
  };
}
function mapApiElection(item: ApiElection): Election {
  const today = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Tokyo",
  }).format(new Date());
  return {
    id:
      matchingElectionId(knownElections, {
        name: item.name,
        date: item.voting_on ?? "未確認",
        municipality: item.municipality ?? undefined,
      }) ?? item.id,
    name: item.name,
    kind: item.kind,
    district: item.district ?? undefined,
    prefectureIds: ["沖縄県"],
    municipality: item.municipality ?? undefined,
    level: item.kind === "national" ? "national" : "local",
    period: item.voting_on && item.voting_on < today ? "past" : "current",
    date: item.voting_on ?? "未確認",
    sources: item.sources,
    turnout: { status: "unrecorded" },
  };
}
const tutorialKey = "election-prototype:tutorial:v1";
const tabs = ["公約", "経歴"];
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
  const adminTapTimes = useRef<number[]>([]);
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
  const [elections, setElections] = useState<Election[]>([]);
  const [apiElectionCandidates, setApiElectionCandidates] = useState<
    ApiElectionCandidate[]
  >([]);
  const [apiElectionCandidatesElectionId, setApiElectionCandidatesElectionId] =
    useState<string | null>(null);
  const [apiElectionCandidatesLoading, setApiElectionCandidatesLoading] =
    useState(false);
  const [apiElectionCandidatesError, setApiElectionCandidatesError] = useState<
    string | null
  >(null);
  const [apiElectionCandidatesComplete, setApiElectionCandidatesComplete] =
    useState(false);
  const [electionLoading, setElectionLoading] = useState(false);
  const [electionError, setElectionError] = useState<string | null>(null);
  const [collectionStatus, setCollectionStatus] = useState("idle");
  const [municipalVotingPlaces, setMunicipalVotingPlaces] = useState<
    MunicipalVotingPlace[]
  >([]);
  const [municipalVotingPlacesLoading, setMunicipalVotingPlacesLoading] =
    useState(false);
  const [municipalVotingPlacesError, setMunicipalVotingPlacesError] = useState<
    string | null
  >(null);
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
  const handleVersionTap = () => {
    const current = Date.now();
    adminTapTimes.current = [...adminTapTimes.current.filter((time) => current - time <= 5000), current];
    if (adminTapTimes.current.length >= 7) {
      adminTapTimes.current = [];
      window.location.assign("/admin");
    }
  };
  const [tour, setTour] = useState<number | null>(() => {
    try {
      return localStorage.getItem(tutorialKey) === "done" ? null : 0;
    } catch {
      return 0;
    }
  });
  const [storageWarning, setStorageWarning] = useState(false);
  const [remoteElections, setRemoteElections] = useState<Election[]>([]);
  const [nahaPublished, setNahaPublished] = useState<
    Record<string, Pick<Candidate, "pledges" | "photo">>
  >({});
  const heading = useRef<HTMLHeadingElement>(null);
  const tourRef = useRef<HTMLDivElement>(null);
  const allElections = [...elections, ...remoteElections.filter(remote => !elections.some(local => local.id === remote.id || (local.name === remote.name && local.date === remote.date)))];
  const activeElection = allElections.find((item) => item.id === electionId);
  const loadedApiCandidates =
    apiElectionCandidatesElectionId === electionId && electionId
      ? apiElectionCandidates.map((item) => mapApiCandidate(item, electionId))
      : [];
  const allCandidates = [
    ...candidates.map((item) => {
      const published = nahaPublished[item.name.replace(/\s/gu, "")];
      if (item.electionId !== "naha-mayor-2026" || !published) return item;
      return {
        ...item,
        pledges: published.pledges.length ? published.pledges : item.pledges,
        photo:
          published.photo.status === "recorded" ? published.photo : item.photo,
      };
    }),
    ...loadedApiCandidates,
  ];
  const candidate = allCandidates.find((item) => item.id === candidateId);
  const compared = selected
    .map((id) => allCandidates.find((item) => item.id === id))
    .filter((item): item is Candidate => !!item);
  const electionCandidates = allCandidates.filter(
    (item) => item.electionId === electionId,
  );
  const pledgesAwaitingOfficialBulletin =
    activeElection?.id === "naha-mayor-2026" &&
    electionCandidates.length > 0 &&
    electionCandidates.every((item) => item.pledges.length === 0);
  const pledgePublicationNotice = pledgesAwaitingOfficialBulletin ? (
    <aside className="notice pledge-publication-notice" role="status">
      <strong>公約公開前</strong>
      <p>
        那覇市選挙管理委員会の選挙公報は現在準備中です。公開後、公式資料を確認してから公約のAI要約を掲載します。
      </p>
      <a
        href="https://www.city.naha.okinawa.jp/admin/senkan/1008237/1012245.html"
        target="_blank"
        rel="noreferrer"
      >
        那覇市選挙管理委員会で公開状況を確認 ↗
      </a>
    </aside>
  ) : null;
  const historicalPledgeNotice =
    activeElection?.id === "naha-mayor-2022" ? (
      <p className="notice">
        2022年の報道で確認できる重点政策を短く言い換えています。公約全体や実現状況を示すものではありません。
      </p>
    ) : null;
  useEffect(() => {
    if (page !== "region") return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    setElections([]);
    const loadElections = async () => {
      setElectionLoading(true);
      setElectionError(null);
      try {
        const params = new URLSearchParams();
        if (municipality) params.set("municipality", municipality);
        const response = await fetch(`/api/elections?${params.toString()}`);
        if (!response.ok) throw new Error(`API request failed (${response.status})`);
        const result = (await response.json()) as ElectionResponse;
        if (cancelled) return;
        setElections(result.data.map(mapApiElection));
        setCollectionStatus(result.collectionStatus);
        setElectionLoading(false);
        if (result.collectionStatus === "running")
          timer = setTimeout(loadElections, 3000);
      } catch (error) {
        if (cancelled) return;
        setElectionError(
          error instanceof Error ? error.message : "選挙情報を取得できませんでした。",
        );
        setElectionLoading(false);
      }
    };
    void loadElections();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [page, region, municipality]);
  useEffect(() => {
    if (page === "compare" || page === "themes") return;
    if (
      page !== "candidates" ||
      !electionId ||
      candidates.some((item) => item.electionId === electionId)
    ) {
      setApiElectionCandidates([]);
      setApiElectionCandidatesElectionId(null);
      setApiElectionCandidatesLoading(false);
      setApiElectionCandidatesError(null);
      setApiElectionCandidatesComplete(false);
      return;
    }
    let cancelled = false;
    const loadCandidates = async () => {
      setApiElectionCandidates([]);
      setApiElectionCandidatesElectionId(electionId);
      setApiElectionCandidatesLoading(true);
      setApiElectionCandidatesError(null);
      try {
        const response = await fetch(
          `/api/elections/${encodeURIComponent(electionId)}/candidates`,
        );
        if (response.status === 404) {
          if (cancelled) return;
          setApiElectionCandidates([]);
          setApiElectionCandidatesComplete(false);
          setApiElectionCandidatesLoading(false);
          return;
        }
        if (!response.ok)
          throw new Error(`候補者一覧を取得できませんでした（${response.status}）。`);
        const result: unknown = await response.json();
        if (!isApiElectionCandidatesResponse(result))
          throw new Error("候補者一覧データの形式が正しくありません。");
        if (cancelled) return;
        setApiElectionCandidates(result.data);
        setApiElectionCandidatesComplete(result.complete);
        setApiElectionCandidatesLoading(false);
      } catch (error) {
        if (cancelled) return;
        setApiElectionCandidatesError(
          error instanceof Error
            ? error.message
            : "候補者一覧を取得できませんでした。",
        );
        setApiElectionCandidatesLoading(false);
      }
    };
    void loadCandidates();
    return () => {
      cancelled = true;
    };
  }, [page, electionId]);
  useEffect(() => {
    if (electionId !== "naha-mayor-2026") return;
    if (page !== "candidates" && page !== "compare" && page !== "themes") return;
    let cancelled = false;
    const loadPublishedPledges = async () => {
      try {
        const response = await fetch(
          "/api/elections/naha-mayor-2026/candidates",
        );
        if (!response.ok) return;
        const result: unknown = await response.json();
        if (!isApiElectionCandidatesResponse(result) || cancelled) return;
        const byName: Record<string, Pick<Candidate, "pledges" | "photo">> = {};
        for (const item of result.data) {
          const mapped = mapApiCandidate(item, "naha-mayor-2026");
          byName[item.name.replace(/\s/gu, "")] = {
            pledges: mapped.pledges,
            photo: mapped.photo,
          };
        }
        setNahaPublished(byName);
      } catch {
        // 取得できない場合は公約公開前の表示のままにする
      }
    };
    void loadPublishedPledges();
    return () => {
      cancelled = true;
    };
  }, [page, electionId]);
  useEffect(() => {
    if (page !== "region" || !municipality) {
      setMunicipalVotingPlaces([]);
      setMunicipalVotingPlacesLoading(false);
      setMunicipalVotingPlacesError(null);
      return;
    }
    let cancelled = false;
    const loadMunicipalVotingPlaces = async () => {
      setMunicipalVotingPlaces([]);
      setMunicipalVotingPlacesLoading(true);
      setMunicipalVotingPlacesError(null);
      try {
        const params = new URLSearchParams({ municipality_id: municipality });
        const response = await fetch(
          `/api/polling/municipality-places?${params.toString()}`,
        );
        if (!response.ok)
          throw new Error(`投票場所を取得できませんでした（${response.status}）。`);
        const result =
          (await response.json()) as MunicipalVotingPlaceResponse;
        if (!Array.isArray(result.data))
          throw new Error("投票場所データの形式が正しくありません。");
        if (cancelled) return;
        setMunicipalVotingPlaces(result.data);
        setMunicipalVotingPlacesLoading(false);
      } catch (error) {
        if (cancelled) return;
        setMunicipalVotingPlacesError(
          error instanceof Error
            ? error.message
            : "投票場所データを取得できませんでした。",
        );
        setMunicipalVotingPlacesLoading(false);
      }
    };
    void loadMunicipalVotingPlaces();
    return () => {
      cancelled = true;
    };
  }, [page, municipality]);
  const comparisonCandidates = compared.length ? compared : electionCandidates;
  const visibleGlossary = searchGlossary(
    glossary,
    glossaryQuery,
    glossaryReadings,
  );
  const regionalElections = allElections.filter((item) =>
    item.prefectureIds.includes(region) &&
    (governorOnly
      ? isGovernorElection(item)
      : !isGovernorElection(item)) &&
    (!municipality || electionAppliesToMunicipality(item, municipality)),
  );
  const filteredElections = regionalElections.filter(
    (item) =>
      (level === "all" || item.level === level) && item.period === period,
  );
  const visibleElections =
    period === "past"
      ? recentUniqueElections(filteredElections)
      : filteredElections;
  const earlyMunicipalVotingPlaces = municipalVotingPlaces.filter(
    (place) => place.voting_type === "early",
  );
  const electionDayMunicipalVotingPlaces = municipalVotingPlaces.filter(
    (place) => place.voting_type === "election_day",
  );
  const regionalCandidates = allCandidates.filter(
    (item) =>
      regionalElections.some((election) => election.id === item.electionId) &&
      (!electionId || item.electionId === electionId),
  );
  const results = searchCandidates(regionalCandidates, query);
  const pickerCandidates = searchCandidates(electionCandidates, query);
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
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/public/elections', { signal: controller.signal }).then(async response => { if (!response.ok) throw Error(`HTTP ${response.status}`); return response.json() as Promise<{ data: Array<{ id: string; name: string; municipality: string | null; voting_on: string; official_url: string }> }>; }).then(({ data }) => setRemoteElections(data.map(item => ({ id: item.id, name: item.name, prefectureIds: ['沖縄県'], ...(item.municipality && item.municipality !== '沖縄県' ? { municipality: item.municipality } : {}), level: 'local', period: new Date(`${item.voting_on}T23:59:59+09:00`).getTime() >= Date.now() ? 'current' : 'past', date: item.voting_on, sources: [{ url: item.official_url, publisher: item.municipality || '沖縄県選挙管理委員会', checkedAt: new Date().toISOString().slice(0, 10) }], turnout: missing() })))).catch(error => { if (!(error instanceof DOMException && error.name === 'AbortError')) console.error('Election reload failed', error) });
    return () => controller.abort();
  }, []);
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
  function openComparisonPreview(id: string | null = null) {
    setElectionId(id);
    setSelected([]);
    setSlots([1, 2]);
    navigate("compare");
    setPreview(true);
  }
  function sourcesFor(item: Candidate): Source[] {
    const pledgeSources = item.pledges.flatMap((pledge) =>
      pledge.text.status === "recorded" ? pledge.text.sources : [],
    );
    return [
      ...new Map(
        (pledgeSources.length ? pledgeSources : item.sources).map((source) => [
          source.url,
          source,
        ]),
      ).values(),
    ];
  }
  function pledgeSummary(pledge: Pledge) {
    return (
      <li className="comparison-pledge" key={pledge.id}>
        {pledge.summary ? (
          pledge.summary
        ) : (
          <RecordText entry={pledge.text} />
        )}
      </li>
    );
  }
  function pledgeList(item: Candidate) {
    return (
      <ul className="pledge-bullets">
        {item.pledges.map((pledge) => pledgeSummary(pledge))}
      </ul>
    );
  }
  function pledgeText(item?: Candidate, withHeading = true) {
    return item?.pledges.length ? (
      <div>
        {withHeading && item.pledges.some((pledge) => pledge.summary) && (
          <strong>公約のかんたん要約</strong>
        )}
        {pledgeList(item)}
      </div>
    ) : (
      <RecordText entry={missing<string>()} />
    );
  }
  function comparisonCell(item: Candidate, label: ComparisonLabel) {
    if (label === "所属政党") return <RecordText entry={item.party} />;
    if (label === "公約") {
      return (
        <>
          {pledgeText(item)}
          {item.pledges.length > 0 && <Sources sources={sourcesFor(item)} />}
        </>
      );
    }
    const recordedChecks = item.pledges.filter(
      (pledge) => pledge.checks[label].status === "recorded",
    );
    return recordedChecks.length ? (
      recordedChecks.map((pledge) => (
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
        ? activeElection?.period === "past"
          ? "候補者一覧"
          : "候補者と公約"
        : page === "detail"
          ? candidate?.name || "候補者情報：未収録"
          : page === "compare"
            ? "候補者と公約を見る"
            : page === "themes"
              ? "テーマ別に比べる"
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
              <img className="home-brand-logo" src="/images/logo.png" alt="" width="54" height="54" />
            </span>
            <span>選挙情報</span>
          </button>
          <nav className="navigation" aria-label="メインナビゲーション">
            {(
              [
                ["home", "home", "ホーム"],
                ["polling", "region", "投票所を探す"],
                ["compare", "compare", "候補者・公約"],
                ["guide", "book", "用語"],
              ] as const
            )
              .filter(([target]) => {
                if (page === "home")
                  return target === "home" || target === "guide";
                if (
                  target === "polling" &&
                  (page === "guide" ||
                    (page === "region" && (municipality || governorOnly)))
                )
                  return false;
                return (
                  target === "home" ||
                  target === "polling" ||
                  target === "guide"
                );
              })
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
                    <span>{label}</span>
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
                <button onClick={() => navigate("guide")}>用語</button>
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
              {!["guide", "council", "compare", "themes", "polling", "polling-admin"].includes(page) && (
                <>
                  <button onClick={() => navigate("region")}>{region}</button>
                  {!(page === "region" && !municipality) && <span>/</span>}
                </>
              )}
              <span>{title}</span>
            </div>
            <div
              className={`page-heading${page === "guide" ? " glossary-page-heading" : ""}${page === "region" ? " region-page-heading" : ""}`}
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
                      : page === "themes"
                        ? "公約を内容ごとに分けて、候補者どうしの違いを確認できます。"
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
            <section className="panel">
              <div className="section-heading">
                <h2>
                  {municipality
                    ? `${municipality}に関連する選挙`
                    : governorOnly ? "沖縄県知事選挙" : "関連する選挙"}
                </h2>
                <span className="badge">
                  {electionLoading || collectionStatus === "running"
                    ? "取得中"
                    : period === "past" && visibleElections.length > 0
                      ? `${visibleElections.length}件表示（最新6件）`
                      : regionalElections.length > 0
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
              {period === "past" && (
                <p className="small">過去の選挙は新しいものから最大6件を表示します。</p>
              )}
              <div className="election-list">
                {visibleElections.map((item) => {
                  const hasCandidateData = candidates.some(
                    (candidate) => candidate.electionId === item.id,
                  );
                  return (
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
                          setCandidateId(null);
                          setQuery("");
                          if (item.period === "past" && !hasCandidateData) {
                            setElectionId(item.id);
                            setSelected([]);
                            setPreview(false);
                            navigate("candidates");
                            return;
                          }
                          if (hasCandidateData) {
                            setElectionId(item.id);
                            setSelected([]);
                            setPreview(false);
                            navigate("compare");
                          } else {
                            openComparisonPreview(item.id);
                          }
                        }}
                      >
                        {item.period === "past" && !hasCandidateData
                          ? "候補者一覧を見る →"
                          : hasCandidateData
                          ? "この選挙の候補者と公約を見る →"
                          : "未収録の比較画面を見る →"}
                      </button>
                      {!hasCandidateData && (
                        <p className="small">
                          候補者・公約情報は未収録のため、表示枠の例を確認できます。
                        </p>
                      )}
                    </article>
                  );
                })}
              </div>
              {!visibleElections.length && (
                <>
                  <Empty
                    className="election-empty-state"
                    title={
                      electionError
                        ? "選挙情報を取得できません"
                        : electionLoading
                          ? "公式情報を読み込んでいます"
                          : collectionStatus === "running"
                            ? "公式情報を収集中です"
                            : collectionStatus === "partial"
                              ? "一部の公式情報を取得できませんでした"
                              : collectionStatus === "failed"
                                ? "前回の公式情報収集に失敗しました"
                                : "選挙情報は未収録です"
                    }
                  >
                    {electionError
                      ? electionError
                      : collectionStatus === "running"
                        ? "収集が完了すると、この地域で確認できた選挙が表示されます。"
                        : collectionStatus === "partial"
                          ? "一部の公式ページを取得できなかったため、確認できた情報だけを表示しています。"
                          : collectionStatus === "failed"
                            ? "APIの収集ジョブが失敗しました。管理者が収集ログを確認する必要があります。"
                            : `${governorOnly ? "沖縄県知事選挙" : municipality || region}の${period === "past" ? "過去" : "現在"}の選挙情報は、公式資料の確認・登録後に掲載します。`}
                  </Empty>
                  <div className="center-actions">
                    <button
                      className="button primary"
                      onClick={() => openComparisonPreview()}
                    >
                      公約比較画面の表示を確認する
                    </button>
                  </div>
                </>
              )}
              {collectionStatus === "partial" && !!visibleElections.length && (
                <p className="small" role="status">
                  一部の公式ページを取得できませんでした。表示中の選挙は確認済みの出典に基づきます。
                </p>
              )}
            </section>
            {municipality && (
              <section className="panel" aria-labelledby="map-search-title">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">VOTING PLACES</p>
                    <h2 id="map-search-title">投票場所</h2>
                  </div>
                </div>
                <div
                  className="segmented"
                  role="group"
                  aria-label="投票場所の種類"
                >
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
                {municipalVotingPlacesLoading ? (
                  <p className="small" role="status">
                    データベースから投票場所を取得しています。
                  </p>
                ) : municipalVotingPlacesError ? (
                  <p className="notice" role="alert">
                    {municipalVotingPlacesError}
                  </p>
                ) : votingPlaceType === "early" ? (
                  earlyMunicipalVotingPlaces.length ? (
                    <>
                      <p className="small">
                        {earlyMunicipalVotingPlaces[0].election_date}
                        執行の選挙における期日前投票所です。
                        {earlyMunicipalVotingPlaces[0].source_publisher}による
                        {earlyMunicipalVotingPlaces[0].source_checked_at
                          ? `${earlyMunicipalVotingPlaces[0].source_checked_at}時点`
                          : "登録情報"}を掲載しています。
                        この選挙は終了しており、現在の投票所や施設の営業状況を示すものではありません。
                      </p>
                      <p className="small">
                        地図リンクを開くと施設名でGoogle Mapsを検索します。
                      </p>
                      <ul className="place-list">
                        {earlyMunicipalVotingPlaces.map((place) => (
                          <li key={place.id}>
                            <span>
                              <strong>{place.name}</strong>
                              {place.address && (
                                <span className="place-address">
                                  所在地：{place.address}
                                </span>
                              )}
                            </span>
                            <a
                              className="button secondary"
                              href={mapSearchUrl(
                                municipality,
                                `${place.name} ${place.address}`.trim(),
                              )}
                              aria-label={`${municipality}の${place.name}をGoogle Mapsで検索（新しいタブで開く）`}
                              target="_blank"
                              rel="noreferrer"
                            >
                              地図で検索
                            </a>
                          </li>
                        ))}
                      </ul>
                      <p className="small place-source">
                        出典: {earlyMunicipalVotingPlaces[0].source_reference}
                      </p>
                    </>
                  ) : (
                    <Empty title="掲載場所はありません">
                      この市町村の期日前投票所はデータベースに登録されていません。
                    </Empty>
                  )
                ) : electionDayMunicipalVotingPlaces.length ? (
                  <>
                    <p className="small">
                      {electionDayMunicipalVotingPlaces[0]
                        .verification_status === "user_provided_unverified"
                        ? "以下は提供された情報です。対象となる選挙・年度と最新性は未確認のため、投票前に市町村選挙管理委員会の公式情報をご確認ください。"
                        : `${electionDayMunicipalVotingPlaces[0].election_date}執行の選挙における当日投票所です。現在の投票所情報ではありません。`}
                    </p>
                    <ul className="place-list">
                      {electionDayMunicipalVotingPlaces.map((place) => (
                        <li key={place.id}>
                          <span>
                            <strong>{place.name}</strong>
                            {place.address && (
                              <span className="place-address">
                                所在地：{place.address}
                              </span>
                            )}
                          </span>
                          <a
                            className="button secondary"
                            href={mapSearchUrl(
                              municipality,
                              `${place.name} ${place.address}`.trim(),
                            )}
                            aria-label={`${municipality}の${place.name}をGoogle Mapsで検索（新しいタブで開く）`}
                            target="_blank"
                            rel="noreferrer"
                          >
                            地図で検索
                          </a>
                        </li>
                      ))}
                    </ul>
                    <p className="small place-source">
                      出典: {electionDayMunicipalVotingPlaces[0].source_reference}
                    </p>
                  </>
                ) : (
                  <Empty title="当日投票所は未収録です">
                    当日投票所は、公式情報を確認後に掲載します。
                  </Empty>
                )}
              </section>
            )}
          </>
        )}
        {page === "candidates" && (
          <>
            {activeElection && <Sources sources={activeElection.sources} />}
            {pledgePublicationNotice}
            {historicalPledgeNotice}
            {electionCandidates.length === 0 ? (
              <section className="panel">
                <div className="section-heading">
                  <h2>公式資料で確認した候補者一覧</h2>
                  <span className="badge">
                    {apiElectionCandidatesLoading
                      ? "取得中"
                      : `${apiElectionCandidates.length}人`}
                  </span>
                </div>
                {apiElectionCandidatesLoading ? (
                  <Empty title="候補者一覧を読み込んでいます">
                    公式資料で確認した候補者情報を取得しています。
                  </Empty>
                ) : apiElectionCandidatesError ? (
                  <Empty title="候補者一覧を取得できません">
                    {apiElectionCandidatesError}
                  </Empty>
                ) : apiElectionCandidates.length ? (
                  <>
                    <p className="small">
                      {apiElectionCandidatesComplete
                        ? "公式資料で確認した候補者一覧です。"
                        : "公式資料から確認できた候補者を表示しています。"}
                    </p>
                    <ol className="candidate-grid">
                      {apiElectionCandidates.map((item) => (
                        <li className="candidate-card" key={item.id}>
                          <h3>
                            {item.ballot_number
                              ? `${item.ballot_number}. `
                              : ""}
                            {item.name}
                          </h3>
                          <p>
                            {item.party || "所属政党：未収録"}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </>
                ) : (
                  <Empty title="候補者一覧は未収録です">
                    候補者名は推測せず、公式資料で確認できた後に掲載します。
                    {activeElection?.sources[0] && (
                      <>
                        {" "}
                        <a
                          href={activeElection.sources[0].url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          公式資料を確認 ↗
                        </a>
                      </>
                    )}
                  </Empty>
                )}
              </section>
            ) : (
              <>
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
                    <RecordText entry={item.profile} />
                    <h3>公約のかんたん要約</h3>
                    {pledgeText(item, false)}
                    <Sources sources={sourcesFor(item)} />
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
                詳細を見る →
              </button>
            </section>
              </>
            )}
          </>
        )}
        {page === "detail" && (
          <>
            <button
              className="text-button back"
              onClick={() => navigate(electionCandidates.length ? "compare" : "candidates")}
            >
              ← {electionCandidates.length ? "候補者と公約に戻る" : "候補者一覧へ"}
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
            {candidate && <Sources sources={sourcesFor(candidate)} />}
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
                  {candidate?.pledges.length ? (
                    <>
                      <h3>公約の原文</h3>
                      {candidate.pledges.map((pledge) => (
                        <article className="pledge" key={pledge.id}>
                          <RecordText
                            entry={
                              pledge.text.status === "recorded"
                                ? { ...pledge.text, sources: [] }
                                : pledge.text
                            }
                          />
                        </article>
                      ))}
                      <Sources sources={sourcesFor(candidate)} />
                    </>
                  ) : null}
                </>
              ) : (
                <RecordText
                  entry={
                    candidate ? candidate.profile : missing<string[]>()
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
                <div className="compare-top-row">
                  <button
                    className="text-button back"
                    onClick={() => navigate("region")}
                  >
                    ← 選挙一覧に戻る
                  </button>
                  {electionCandidates.length > 0 && !preview && (
                    <button
                      className="theme-link"
                      onClick={() => navigate("themes")}
                    >
                      テーマ別に比べる →
                    </button>
                  )}
                </div>
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
                  {pledgePublicationNotice}
                  {historicalPledgeNotice}
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
                          初期表示では全候補者を表示します。候補者の「比較から外す」を押すと、選んだ人だけに絞り込めます。
                        </p>
                      </div>
                      <span className="badge">
                        {selected.length
                          ? `${selected.length}人を選択中`
                          : `${electionCandidates.length}人全員を表示`}
                      </span>
                    </div>
                    <Sources sources={electionCandidates[0]?.sources ?? []} />
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
                      {pickerCandidates.length}人の候補者
                      {query && ` · 「${query}」の検索結果`}
                    </p>
                    <div className="comparison-candidate-list">
                      {pickerCandidates.map((item) => (
                        <article
                          className="comparison-candidate"
                          key={item.id}
                        >
                          <div className="candidate-intro picker-intro">
                            <Photo key={item.id} entry={item.photo} name={item.name} />
                            <h3>
                              <button
                                className="candidate-name"
                                onClick={() => openCandidate(item.id)}
                              >
                                <RubyName name={item.name} />
                              </button>
                            </h3>
                          </div>
                          <p className="party-label">
                            <span>所属</span>
                            {item.party.status === "recorded"
                              ? item.party.value
                              : "未収録"}
                          </p>
                          <RecordText entry={item.profile} />
                        </article>
                      ))}
                    </div>
                    {query && !pickerCandidates.length && (
                      <Empty title="条件に一致する候補者がいません">
                        キーワードを変更して検索してください。
                      </Empty>
                    )}
                    <div className="comparison-actions">
                      {query && (
                        <button className="text-button" onClick={() => setQuery("")}>
                          検索をクリア
                        </button>
                      )}
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
                            <div className="candidate-intro picker-intro">
                              <Photo
                                key={item.id}
                                entry={item.photo}
                                name={item.name}
                              />
                              <h2>
                                <button
                                  className="candidate-name"
                                  onClick={() => openCandidate(item.id)}
                                >
                                  <RubyName name={item.name} />
                                </button>
                              </h2>
                            </div>
                            <p className="small">
                              {
                                allElections.find(
                                  (election) => election.id === item.electionId,
                                )?.name
                              }
                            </p>
                          </header>
                          <div className="comparison-mobile-fields">
                            <section className="party-row">
                              <h3>所属政党</h3>
                              {item.party.status === "recorded" ? (
                                <p>{item.party.value}</p>
                              ) : (
                                <RecordText entry={item.party} />
                              )}
                            </section>
                            <section>
                              <h3>公約のかんたん要約</h3>
                              {item.pledges.length ? (
                                pledgeList(item)
                              ) : pledgesAwaitingOfficialBulletin ? (
                                <p className="pledge-not-published">
                                  公式の選挙公報が公開される前です。公約はまだ比較できません。
                                </p>
                              ) : (
                                <RecordText entry={missing<string>()} />
                              )}
                              {item.pledges.length > 0 && (
                                <Sources sources={sourcesFor(item)} />
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
                              <Photo
                                key={item.id}
                                entry={item.photo}
                                name={item.name}
                              />
                              <button
                                className="candidate-name"
                                onClick={() => openCandidate(item.id)}
                              >
                                {item.name}
                              </button>
                              <p className="small">
                                {
                                  allElections.find(
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
        {page === "themes" && (
          <>
            <button
              className="text-button back"
              onClick={() => navigate("compare")}
            >
              ← 候補者一覧に戻る
            </button>
            {activeElection && (
              <section className="comparison-heading panel">
                <span className="badge">
                  {activeElection.level === "national" ? "国政選挙" : "地方選挙"}
                </span>
                <h2>{activeElection.name}</h2>
                <p>
                  {activeElection.municipality || region} · 投票日{" "}
                  {activeElection.date}
                </p>
                {pledgePublicationNotice}
              </section>
            )}
            <ThemeComparison
              candidates={comparisonCandidates}
              sourcesFor={sourcesFor}
            />
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
          <span>選挙情報</span>
          <p>情報を知る。根拠を読む。自分で考える。</p>
          <button className="version-trigger" onClick={handleVersionTap} aria-label="バージョン 0.1.0">
            v0.1.0
          </button>
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
