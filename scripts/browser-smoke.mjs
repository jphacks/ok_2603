import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, writeFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

// ローカルEdge/Chromeを使うUI検証。テストデータはブラウザーのメモリーだけに追加する。
const origin = process.env.TEST_ORIGIN || "http://127.0.0.1:5173";
const browserPaths = [
  process.env.TEST_BROWSER,
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
].filter(Boolean);
let browserPath;
for (const path of browserPaths) {
  try {
    await access(path);
    browserPath = path;
    break;
  } catch {}
}
if (!browserPath)
  throw new Error(
    "TEST_BROWSER にEdge/Chromeの実行ファイルを指定してください。",
  );
const profile = await mkdtemp(join(tmpdir(), "election-ui-"));
const browser = spawn(
  browserPath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    "--no-default-browser-check",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
let socket;
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const errors = [];
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try {
      port = Number(
        (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split(
          "\n",
        )[0],
      );
      break;
    } catch {
      await pause(100);
    }
  }
  if (!port) throw new Error("Browser debugging endpoint unavailable");
  const targets = await (
    await fetch(`http://127.0.0.1:${port}/json/list`)
  ).json();
  socket = new WebSocket(
    targets.find((target) => target.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const promise = pending.get(message.id);
      pending.delete(message.id);
      message.error
        ? promise.reject(message.error)
        : promise.resolve(message.result);
    } else if (message.method === "Runtime.exceptionThrown")
      errors.push(
        message.params.exceptionDetails.text +
          ": " +
          (message.params.exceptionDetails.exception?.description || ""),
      );
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails)
      throw new Error(
        result.exceptionDetails.exception?.description ||
          result.exceptionDetails.text,
      );
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let i = 0; i < 80; i++) {
      if (await evaluate(expression)) return;
      await pause(50);
    }
    throw new Error(`Timeout: ${expression}`);
  };
  const click = async (text) => {
    await evaluate(
      `(() => { const el = [...document.querySelectorAll('button')].find(el => el.textContent.trim() === ${JSON.stringify(text)}); if (!el) throw new Error('Button missing: ' + ${JSON.stringify(text)}); el.click() })()`,
    );
    await pause(70);
  };
  const input = async (id, value) => {
    await evaluate(
      `(() => { const el = document.getElementById(${JSON.stringify(id)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', {bubbles:true})); })()`,
    );
    await pause(70);
  };
  const text = () => evaluate("document.body.innerText");
  const verifyHeadlineMotion = async () => {
    const frames = await evaluate(`(async () => {
      const title = document.querySelector('.home-catchphrase');
      const animation = title.getAnimations().find(a => a.animationName === 'home-headline-enter');
      if (!animation) throw new Error('Headline animation is missing');
      animation.pause();
      const frames = [];
      for (const time of [0, 620, 1300]) {
        animation.currentTime = time;
        await new Promise(resolve => requestAnimationFrame(resolve));
        const style = getComputedStyle(title);
        frames.push({opacity:Number(style.opacity), y:new DOMMatrixReadOnly(style.transform).m42});
      }
      animation.play();
      return frames;
    })()`);
    assert.equal(frames[0].opacity, 0);
    assert.equal(frames[0].y, -24);
    assert.ok(frames[1].opacity > 0 && frames[1].opacity < 1);
    assert.ok(frames[1].y > -24 && frames[1].y < 0);
    assert.equal(frames[2].opacity, 1);
    assert.equal(frames[2].y, 0);
  };
  const screenshot = async (name) => {
    await evaluate(`Promise.all([...document.querySelectorAll('.home-catchphrase')].flatMap(title => title.getAnimations().map(animation => animation.finished.catch(() => {}))))`);
    const { data } = await send("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: false,
    });
    await writeFile(join(tmpdir(), name), Buffer.from(data, "base64"));
    console.log(`Screenshot: ${join(tmpdir(), name)}`);
  };
  await send("Runtime.enable");
  await send("Page.enable");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: `
    window.__testElections = [];
    const originalFetch = window.fetch.bind(window);
    window.fetch = (input, options) => typeof input === 'string' && /^\\/api\\/elections(?:\\?|$)/.test(input)
      ? Promise.resolve(new Response(JSON.stringify({data:window.__testElections,collectionStatus:'idle'}), {headers:{'content-type':'application/json'}}))
      : originalFetch(input, options);
  ` });
  await send("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1100,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await send("Page.navigate", { url: origin });
  await waitFor('document.querySelector("[role=dialog]") !== null');
  await click("次へ →");
  await click("次へ →");
  await click("はじめる");
  assert.equal(
    await evaluate('localStorage.getItem("election-prototype:tutorial:v1")'),
    "done",
  );
  await evaluate('document.documentElement.dataset.testReload = "pending"');
  await send("Page.reload");
  await waitFor('!document.documentElement.dataset.testReload && document.querySelector("#region-search") !== null');
  await verifyHeadlineMotion();
  assert.equal(await evaluate('document.querySelector(".prototype-note")'), null);
  assert.equal(await evaluate('document.querySelector("#prefecture-list")'), null);
  assert.equal(await evaluate('document.querySelector(".mobile-start")'), null);
  assert.equal(
    await evaluate('document.querySelector("[role=dialog]") === null'),
    true,
  );
  assert.equal(
    await evaluate('document.querySelector(".navigation .nav-region") !== null'),
    false,
  );
  assert.equal(
    await evaluate('document.querySelectorAll("#region-suggestions button").length'),
    0,
  );
  await screenshot("election-desktop.png");
  assert.equal(await evaluate('window.scrollY'), 0);
  assert.equal(await evaluate('getComputedStyle(document.querySelector(".home-visual")).backgroundImage.includes("okinawa-coast.webp")'), true);
  await evaluate('document.querySelector(".home-menu-toggle").click()');
  await waitFor('document.querySelector("#home-menu-links") !== null');
  await evaluate('document.querySelector(".home-menu-toggle").click()');
  assert.equal(await evaluate('document.querySelector("#home-menu-links")'), null);
  await evaluate(`document.querySelector('[aria-label="すべての市町村を表示"]').click()`);
  await waitFor('document.querySelectorAll(".home-city-shortcuts button").length === 42');
  await evaluate(`document.querySelector('[aria-label="市町村一覧を閉じる"]').click()`);
  assert.ok(!(await text()).includes("沖縄の選挙を探す"));
  assert.equal(await evaluate('document.querySelector(".hero-art, .hero-description, .principles")'), null);
  await evaluate('document.querySelector(".governor-entry").click()');
  await waitFor('document.querySelector("h1")?.textContent === "沖縄県知事選挙"');
  assert.ok((await text()).includes("選挙情報は未収録です"));
  await click("ホーム");
  await verifyHeadlineMotion();
  await evaluate('void (window.__previousHeadline = document.querySelector(".home-catchphrase"))');
  await click("ホーム");
  assert.equal(await evaluate('window.__previousHeadline === document.querySelector(".home-catchphrase")'), false);
  await verifyHeadlineMotion();
  for (const query of ["な", "ナ", "ﾅ"]) {
    await input("region-query", query);
    const options = await evaluate('document.querySelector("#region-suggestions").innerText');
    assert.ok(options.includes("那覇市") && options.includes("名護市"));
  }
  for (const query of ["なは", "ナハ", "ﾅﾊ", "はし"]) {
    await input("region-query", query);
    assert.equal(await evaluate('document.querySelectorAll("#region-suggestions button").length'), 1);
    assert.ok((await text()).includes("那覇市"));
  }
  await input("region-query", "なご");
  await click("名護市 なごし");
  await waitFor('document.querySelector("h1")?.textContent === "名護市"');
  assert.ok((await text()).includes("県議会議員選挙区：名護市選挙区"));
  await click("ホーム");
  await input("region-query", "なは");
  await evaluate(`(() => { const input = document.getElementById('region-query'); input.focus(); input.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowDown',bubbles:true})); })()`);
  await waitFor('document.getElementById("region-query").getAttribute("aria-activedescendant") === "region-option-0"');
  await evaluate(`document.getElementById('region-query').dispatchEvent(new KeyboardEvent('keydown', {key:'Enter',bubbles:true}))`);
  await waitFor('document.querySelector("h1")?.textContent === "那覇市"');
  await click("ホーム");
  await input("region-query", "存在しない市町村");
  assert.equal(
    await evaluate('document.querySelector("#region-query").getAttribute("aria-invalid")'),
    "true",
  );
  assert.ok((await text()).includes("存在しない市町村名です"));
  assert.equal(
    await evaluate('document.querySelector("#region-search button[type=submit]").disabled'),
    true,
  );
  await input("region-query", "那覇");
  assert.equal(
    await evaluate('document.querySelectorAll("#region-suggestions button").length'),
    1,
  );
  assert.ok((await text()).includes("市町村名の候補を選択するか、正式名称を入力してください。"));
  assert.equal(
    await evaluate('document.querySelector("#region-search button[type=submit]").disabled'),
    true,
  );
  await input("region-query", "那覇市");
  assert.equal(
    await evaluate('document.querySelector("#region-search button[type=submit]").disabled'),
    false,
  );
  assert.equal(
    await evaluate('document.querySelector("#region-query-error")'),
    null,
  );
  await click("検索");
  await waitFor('document.querySelector("h1")?.textContent === "那覇市"');
  assert.equal((await text()).includes("直近の選挙"), false);
  assert.equal((await text()).includes("年代別投票率"), false);
  assert.ok((await text()).includes("投票場所"));
  assert.equal(await evaluate('document.querySelectorAll(".place-list li").length'), 5);
  assert.ok((await text()).includes("首里支所1階会議室"));
  assert.equal(
    await evaluate('document.querySelector(".place-list a")?.href.startsWith("https://www.google.com/maps/search/")'),
    true,
  );
  await click("当日投票");
  assert.ok((await text()).includes("当日投票所は未収録です"));
  assert.equal(await evaluate('document.querySelectorAll(".place-list li").length'), 0);
  assert.equal(
    await evaluate("document.querySelector('[aria-label=\"投票場所の種類\"] button[aria-pressed=\"true\"]')?.textContent.trim()"),
    "当日投票",
  );
  await click("期日前投票");
  assert.equal(await evaluate('document.querySelectorAll(".place-list li").length'), 5);
  await click("ホーム");
  await waitFor('document.querySelector("#region-search") !== null');
  await input("region-query", "宜野湾市");
  await click("検索");
  await waitFor('document.querySelector("h1")?.textContent === "宜野湾市"');
  await click("当日投票");
  assert.equal(await evaluate('document.querySelectorAll(".place-list li").length'), 4);
  assert.ok((await text()).includes("野嵩一区自治会事務所"));
  assert.ok((await text()).includes("所在地：野嵩2－21－1"));
  assert.ok((await text()).includes("普天間第二小学校クラブハウス"));
  assert.ok((await text()).includes("普天間中学校体育館"));
  assert.equal(
    await evaluate('document.querySelector(".place-list a")?.href.startsWith("https://www.google.com/maps/search/")'),
    true,
  );
  await click("ホーム");
  await waitFor('document.querySelector("#region-search") !== null');
  await input("region-query", "沖縄");
  assert.equal(
    await evaluate('document.querySelectorAll("#region-suggestions button").length'),
    1,
  );
  await click("沖縄市 おきなわし");
  await waitFor('document.querySelector("h1")?.textContent === "沖縄市"');
  assert.equal(await evaluate('!!document.querySelector("#comparison-link")'), false);
  await click("過去の選挙");
  assert.equal(await evaluate('!!document.querySelector("#comparison-link")'), false);
  // 実データの代わりに隔離されたブラウザー内だけで登録後の経路を確認する。
  await evaluate(`(async () => {
    const appSource = await (await fetch('/src/App.tsx')).text();
    const dataPath = appSource.match(new RegExp('from "([^"]*election/data[.]ts[^"]*)"'))?.[1];
    if (!dataPath) throw new Error('Cannot locate the active Vite data module');
    const d = await import(dataPath); const m = await import('/src/election/model.ts');
    const source = {url:'https://example.invalid/test-only', publisher:'UIテスト専用', checkedAt:'2026-10-17'};
    const recorded = value => ({status:'recorded', value, sources:[source]});
    d.elections.push({id:'ui-election',name:'UI処理検証専用',prefectureIds:['沖縄県'],level:'local',period:'current',date:'2026-10-17',sources:[source],turnout:recorded([{age:'テスト年代',rate:50}])});
    d.glossary.push({term:'テスト用語',definition:'UI動作の確認専用です。政治用語の解説ではありません。',sources:[source]});
    d.elections.push({id:'ui-governor',name:'UIテスト専用知事選挙',kind:'governor',prefectureIds:['沖縄県'],level:'local',period:'current',date:'2026-10-17',sources:[source],turnout:m.missing()});
    window.__testElections = d.elections.map(election => ({...election, municipality:null, voting_on:'2099-10-17'}));
  })()`);
  await click("ホーム");
  await evaluate('document.querySelector(".governor-entry").click()');
  await waitFor('document.querySelector("h1")?.textContent === "沖縄県知事選挙"');
  assert.ok((await text()).includes("UIテスト専用知事選挙"));
  assert.ok(!(await text()).includes("UI処理検証専用"));
  await click("ホーム");
  await input("region-query", "沖縄");
  await click("沖縄市 おきなわし");
  assert.equal((await text()).includes("年代別投票率"), false);
  assert.ok(!(await text()).includes("UIテスト専用知事選挙"));
  assert.equal(await evaluate('!!document.querySelector("#comparison-link")'), false);
  assert.ok(!(await text()).includes("この選挙の公約を比較する →"));
  assert.ok((await text()).includes("候補者・公約情報は、公式資料を確認後に掲載します。"));
  await evaluate(`(async () => {
    const appSource = await (await fetch('/src/App.tsx')).text();
    const dataPath = appSource.match(new RegExp('from "([^"]*election/data[.]ts[^"]*)"'))?.[1];
    if (!dataPath) throw new Error('Cannot locate the active Vite data module');
    const d = await import(dataPath); const m = await import('/src/election/model.ts');
    const source = {url:'https://example.invalid/test-only', publisher:'UIテスト専用', checkedAt:'2026-10-17'};
    const recorded = value => ({status:'recorded', value, sources:[source]});
    for (const id of ['one','two']) d.candidates.push({id,electionId:'ui-election',name:'テスト専用氏名 '+id,party:recorded('テスト専用所属'),photo:m.missing(),pledges:[{id:'p',text:recorded('テスト用語 検索確認ABC'),checks:m.emptyChecks()}],profile:{status:'not-confirmed',note:'テスト対象範囲',sources:[source]},speeches:{status:'no-record',note:'テスト対象範囲',sources:[source]},votes:m.missing(),history:m.missing(),sources:[source]});
  })()`);
  await click("ホーム");
  await input("region-query", "沖縄");
  await click("沖縄市 おきなわし");
  await click("この選挙の公約を比較する →");
  assert.equal(
    await evaluate('document.querySelectorAll(".comparison-candidate").length'),
    2,
  );
  assert.equal(
    await evaluate(
      'document.querySelectorAll(".comparison-table thead th").length',
    ),
    3,
  );
  assert.equal(
    await evaluate(
      'document.querySelectorAll(".comparison-table tbody tr").length',
    ),
    7,
  );
  assert.equal(await evaluate('!!document.querySelector(".issue-filter-panel")'), false);
  await screenshot("election-comparison.png");
  await click("＋ 比較に追加");
  assert.equal(
    await evaluate('document.querySelectorAll(".comparison-table thead th").length'),
    2,
  );
  await click("＋ 比較に追加");
  assert.equal(
    await evaluate('document.querySelectorAll(".comparison-table thead th").length'),
    3,
  );
  await click("全候補者の比較に戻す");
  await click("候補者一覧・検索を見る →");
  assert.equal(
    await evaluate('document.querySelectorAll(".candidate-card").length'),
    2,
  );
  await input("candidate-query", "所属");
  assert.equal(
    await evaluate('document.querySelectorAll(".candidate-card").length'),
    2,
  );
  await input("candidate-query", "abc");
  assert.equal(
    await evaluate('document.querySelectorAll(".candidate-card").length'),
    2,
  );
  await input("candidate-query", "one");
  assert.equal(
    await evaluate('document.querySelectorAll(".candidate-card").length'),
    1,
  );
  await click("＋ 比較に追加");
  await input("candidate-query", "two");
  await click("＋ 比較に追加");
  await click("詳細を見る →");
  await click("テスト用語");
  assert.ok((await text()).includes("政治用語の解説ではありません"));
  await click("閉じる");
  await click("経歴");
  assert.ok((await text()).includes("確認できず"));
  await click("議会での発言");
  assert.ok((await text()).includes("該当記録なし"));
  await click("公約比較2");
  assert.equal(
    await evaluate(
      'document.querySelectorAll(".comparison-table thead th").length',
    ),
    3,
  );
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(
    await evaluate('getComputedStyle(document.querySelector(".comparison-mobile-list")).display !== "none"'),
    true,
  );
  assert.equal(
    await evaluate('document.querySelectorAll(".comparison-mobile-card").length'),
    2,
  );
  assert.equal(
    await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
    true,
  );
  await screenshot("election-mobile-comparison.png");
  await click("✓ 比較から外す");
  assert.equal(
    await evaluate(
      'document.querySelectorAll(".comparison-table thead th").length',
    ),
    2,
  );
  await click("全候補者の比較に戻す");
  assert.equal(
    await evaluate(
      'document.querySelectorAll(".comparison-table thead th").length',
    ),
    3,
  );
  // 再読み込みでテストデータを破棄し、一般公開状態を撮影。
  await evaluate('document.documentElement.dataset.testReload = "pending"');
  await send("Page.reload");
  await waitFor('!document.documentElement.dataset.testReload && document.querySelector("#region-search") !== null');
  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  assert.equal(
    await evaluate('document.querySelectorAll(".navigation button").length'),
    2,
  );
  assert.equal(
    await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
    true,
  );
  await screenshot("election-mobile.png");
  assert.ok(await evaluate('document.querySelector(".governor-entry").getBoundingClientRect().bottom < window.innerHeight - 84'));
  assert.ok(await evaluate('document.querySelector("#region-query").getBoundingClientRect().bottom < window.innerHeight - 84'));
  await evaluate('document.querySelector(".governor-entry").click()');
  await waitFor('document.querySelector("h1")?.textContent === "沖縄県知事選挙"');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  assert.ok((await text()).includes("選挙情報は未収録です"));
  await screenshot("election-mobile-governor.png");
  await click("ホーム");
  await input("region-query", "な");
  assert.ok(await evaluate('[...document.querySelectorAll("#region-suggestions button")].every(button => button.getBoundingClientRect().height >= 44)'));
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  await click("名護市 なごし");
  await waitFor('document.querySelector("h1")?.textContent === "名護市"');
  await click("ホーム");
  assert.equal(await evaluate('!!document.querySelector("#comparison-link")'), false);
  await input("region-query", "沖縄");
  await click("沖縄市 おきなわし");
  assert.equal(await evaluate('!!document.querySelector("#comparison-link")'), false);
  assert.equal(
    await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
    true,
  );
  await screenshot("election-mobile-detail.png");
  await click("ホーム");
  await send("Emulation.setDeviceMetricsOverride", {width:320,height:740,deviceScaleFactor:1,mobile:true});
  assert.equal(await evaluate('document.documentElement.scrollWidth <= window.innerWidth'), true);
  await input("region-query", "な");
  assert.ok((await text()).includes("那覇市") && (await text()).includes("名護市"));
  await screenshot("election-mobile-search-320.png");
  await click("データについて");
  const glossaryText = await text();
  assert.ok(glossaryText.includes("政治・選挙の用語"));
  assert.equal(glossaryText.includes("用語一覧"), false);
  assert.equal(
    await evaluate('getComputedStyle(document.querySelector(".glossary-page-heading")).textAlign'),
    "center",
  );
  assert.ok(glossaryText.includes("最終確認 2026-10-18"));
  assert.equal(await evaluate('document.querySelectorAll(".glossary-entry").length'), 81);
  assert.equal(
    await evaluate('document.querySelectorAll(".glossary-entry rt").length'),
    81,
  );
  assert.equal(
    await evaluate('[...document.querySelectorAll("footer button")].some(button => button.textContent.includes("用語解説"))'),
    false,
  );
  await input("glossary-search", "議員1人");
  assert.ok((await text()).includes("小選挙区選挙"));
  assert.ok((await text()).includes("1件の用語"));
  await input("glossary-search", "ないかくふしんにん");
  assert.ok((await text()).includes("内閣不信任決議"));
  assert.ok((await text()).includes("1件の用語"));
  await input("glossary-search", "該当しない検索語");
  assert.ok((await text()).includes("該当する用語はありません"));
  assert.equal(
    await evaluate("document.documentElement.scrollWidth <= window.innerWidth"),
    true,
  );
  assert.deepEqual(errors, []);
  console.log(
    "UI PASS: tutorial persistence, Okinawa-only region selection, search, filters, comparison, detail and glossary source/search states, mobile overflow, no JS exceptions",
  );
} finally {
  socket?.close();
  browser.kill();
  await pause(600);
  // 作成した一時ブラウザープロファイルのみ削除。
  if (profile.startsWith(join(tmpdir(), "election-ui-")))
    await rm(profile, { recursive: true, force: true }).catch(() => {});
}
