import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { countOfficialCandidateRows, parseOfficialCandidateRows, parseOfficialLinks, OFFICIAL_EXPLORATION_ROOTS, electionKindFromLabel, electionIdFromSource } from '../server/official-parser.mjs';
import { normalizeXUrl, candidateSiteIdentity, verifiedXLinksOnPage, relevantSameSitePages } from '../server/x-discovery.mjs';
import { parseIssueOfficialRoots, parseApprovedLinks, extractMunicipalElection } from '../server/issue-election-discovery.mjs';

test('X verification requires an identified candidate site and an explicit official account link',()=>{
  assert.equal(normalizeXUrl('https://twitter.com/TamakiDenny/'),'https://twitter.com/TamakiDenny');
  assert.equal(normalizeXUrl('https://twitter.com/TamakiDenny/status/123456'),null);
  assert.equal(normalizeXUrl('https://x.com/intent/tweet?text=hello'),null);
  assert.equal(normalizeXUrl('https://x.com.evil.example/TamakiDenny'),null);
  const home='<title>玉城デニー OFFICIAL WEBSITE</title><a href="/sns_guideline/">SNSガイドライン</a>';
  assert.equal(candidateSiteIdentity(home,'玉城 デニー'),true);
  assert.deepEqual(relevantSameSitePages(home,'https://tamakidenny.com/'),['https://tamakidenny.com/sns_guideline/']);
  const guideline='<title>玉城デニー 公式SNSガイドライン</title><h1>玉城デニー 公式SNSガイドライン</h1><p>玉城デニー公式アカウントは、玉城デニー本人および後援会事務所が管理・運営しています。公式アカウント一覧</p><p>X（旧Twitter）：<a href="https://x.com/tamakidenny">https://x.com/tamakidenny</a></p>';
  assert.deepEqual(verifiedXLinksOnPage(guideline,'https://tamakidenny.com/sns_guideline/','玉城 デニー',true).map(item=>item.url),['https://x.com/tamakidenny']);
  assert.deepEqual(verifiedXLinksOnPage('<title>別人のサイト</title><p>玉城デニーを応援</p><a href="https://x.com/other_account">X</a>','https://party.example/','玉城 デニー',false),[]);
});

test('counts every candidate row from the official 2026 Okinawa gubernatorial candidate PDF text',()=>{
  const officialText=['1古謝　げんた無所属','2カネシマ　シュン無所属','3すえよし　まさひろ無所属','4玉城　デニー無所属','5ヒガ　タカシ無所属','6屋良　朝助琉球独立党'].join('\n');
  assert.equal(countOfficialCandidateRows(officialText),6);
  assert.deepEqual(parseOfficialCandidateRows(officialText).at(-1),{number:6,name:'屋良 朝助',party:'琉球独立党'});
});

test('official discovery roots and parser support present and future election types',()=>{
  assert.equal(OFFICIAL_EXPLORATION_ROOTS.length,2);
  assert.ok(OFFICIAL_EXPLORATION_ROOTS.every(url=>url.startsWith('https://www.pref.okinawa.lg.jp/')));
  const rows=parseOfficialCandidateRows('1 古謝 げんた 無所属\n2 屋良 朝助 琉球独立党');
  assert.deepEqual(rows,[{number:1,name:'古謝 げんた',party:'無所属'},{number:2,name:'屋良 朝助',party:'琉球独立党'}]);
  assert.equal(electionKindFromLabel('沖縄県知事選挙'),'governor');
  assert.equal(electionKindFromLabel('那覇市長選挙'),'municipal-mayor');
  assert.equal(electionKindFromLabel('第22回那覇市議会議員一般選挙'),'municipal-assembly');
  assert.equal(electionKindFromLabel('第50回衆議院議員総選挙'),'national');
  assert.notEqual(electionIdFromSource('沖縄県議会議員補欠選挙（うるま市選挙区）','https://www.pref.okinawa.lg.jp/a.pdf',2026,'prefectural-assembly').id,electionIdFromSource('沖縄県議会議員補欠選挙（島尻・南城市選挙区）','https://www.pref.okinawa.lg.jp/b.pdf',2026,'prefectural-assembly').id);
  const links=parseOfficialLinks('<a href="/kensei/senkyo/feature.html">特設ページ</a><a href="https://example.com">外部</a>','https://www.pref.okinawa.lg.jp/index.html');
  assert.equal(links.length,1);
  assert.match(links[0].url,/pref.okinawa.lg.jp/);
});

test('Issue #2 registry accepts only listed municipality URLs and same-host election links',()=>{
  const body=`## 沖縄県・市町村の公式サイト（選挙情報の確認起点）

### 沖縄県
- 沖縄県: https://www.pref.okinawa.lg.jp/
- 沖縄県選挙管理委員会事務局: https://www.pref.okinawa.lg.jp/kensei/kencho/1000011/1024094.html

### 沖縄県の選挙日程・情報ページ
| 対象 | 用途 | URL |
|---|---|---|
| 沖縄県 | 任期満了日と選挙執行予定日 | https://www.pref.okinawa.lg.jp/kensei/senkyo/1023172/1005019.html |
| 沖縄県 | 選挙に関する情報 | https://www.pref.okinawa.lg.jp/kensei/senkyo/1005009/index.html |

### 市
| 市名 | 公式HP |
|---|---|
| 那覇市 | https://www.city.naha.okinawa.jp/ |
| 宜野湾市 | https://www.city.ginowan.lg.jp/ |
| 八重瀬町 | https://www.town.yaese.lg.jp/ |

### 選挙情報ページ
| 市町村 | 選挙 | URL |
|---|---|---|
| 那覇市 | 第24回那覇市長選挙 | https://www.city.naha.okinawa.jp/admin/senkan/1008237/1012245.html |

## 次のセクション
`;
  const roots=parseIssueOfficialRoots(body);
  assert.equal(roots.length,8);
  assert.ok(roots.some(root=>root.municipality==='那覇市'&&root.type==='root'));
  assert.ok(roots.some(root=>root.municipality==='那覇市'&&root.type==='election'));
  assert.ok(roots.some(root=>root.municipality==='沖縄県'&&root.url.endsWith('/1024094.html')));
  assert.ok(roots.some(root=>root.municipality==='八重瀬町'&&root.hostname==='www.town.yaese.lg.jp'));
  const links=parseApprovedLinks(
    '<a href="/admin/senkan/">選挙管理委員会</a><a href="https://evil.example/election">選挙</a>',
    'https://www.city.naha.okinawa.jp/',
    new Set(['www.city.naha.okinawa.jp']),
  );
  assert.deepEqual(links.map(link=>link.url),['https://www.city.naha.okinawa.jp/admin/senkan/']);
  assert.throws(()=>parseIssueOfficialRoots('## unrelated'),/issue_registry_section_missing/);
});

test('municipal election extraction requires an official-title match and a cited election date',()=>{
  const html='<h1>【特設ページ】第24回那覇市長選挙</h1><h3>告示日</h3><p>令和8年10月18日</p><h2>当日投票</h2><p>令和8年10月25日</p>';
  const election=extractMunicipalElection(
    html,
    'https://www.city.naha.okinawa.jp/admin/senkan/1008237/1012245.html',
    '那覇市',
    '2026-10-18',
  );
  assert.equal(election.name,'第24回那覇市長選挙');
  assert.equal(election.kind,'municipal-mayor');
  assert.equal(election.announcedOn,'2026-10-18');
  assert.equal(election.votingOn,'2026-10-25');
  assert.equal(election.status,'告示済み');
  assert.equal(extractMunicipalElection(html,'https://www.city.naha.okinawa.jp/','浦添市','2026-10-18'),null);
  assert.equal(extractMunicipalElection('<h1>那覇市長選挙</h1>','https://www.city.naha.okinawa.jp/','那覇市','2026-10-18'),null);
  assert.equal(extractMunicipalElection('<h1>那覇市長選挙</h1><p>投票日 令和8年2月30日</p>','https://www.city.naha.okinawa.jp/','那覇市','2026-02-01'),null);
});

async function freePort() {
  const server=createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return port;
}
async function startApi(port, db, fixture) {
  const env={...process.env,API_PORT:String(port),API_HOST:'127.0.0.1',DATABASE_PATH:db,ADMIN_API_TOKEN:'test-token-not-for-production',GEMINI_API_KEY:'',NODE_ENV:fixture?'test':'development',SUPABASE_URL:'https://supabase.test',SUPABASE_ANON_KEY:'test-anon-key',SUPABASE_SERVICE_ROLE_KEY:'test-service-key'};
  if(fixture) env.COLLECTION_FIXTURE='okinawa-governor-2026'; else delete env.COLLECTION_FIXTURE;
  const failure=fixture?'false':'true';
  const mockImport = 'data:text/javascript,' + encodeURIComponent(`const elections=new Map();const originalFetch=globalThis.fetch;globalThis.fetch=async(input,options={})=>{const url=new URL(input instanceof URL?input.href:typeof input==='string'?input:input.url);if(url.hostname==='supabase.test'){if(url.pathname==='/rest/v1/elections'&&options.method==='POST'){for(const item of JSON.parse(options.body||'[]'))elections.set(item.id,item);return new Response('[]',{status:201});}if(url.pathname==='/rest/v1/elections'&&(!options.method||options.method==='GET'))return new Response(JSON.stringify([...elections.values()]));if(url.pathname==='/rest/v1/municipalities')return new Response('[]');return new Response('{}',{status:404});}if(${failure})throw new Error('test-only injected network failure');return originalFetch(input,options);};`);
  const child=spawn(process.execPath,['--import',mockImport,'server/index.mjs'],{cwd:process.cwd(),env,stdio:['ignore','ignore','pipe']});
  let errors=''; child.stderr.on('data',chunk=>errors+=chunk);
  const base=`http://127.0.0.1:${port}`;
  for(let i=0;i<60;i++) {
    if(child.exitCode!==null) throw Error(`API exited early: ${errors}`);
    try { if((await fetch(`${base}/api/health`)).ok) return {child,base}; } catch {}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  child.kill(); throw Error(`API did not start: ${errors}`);
}
async function stopApi(child) {
  if(child.exitCode!==null) return;
  child.kill();
  await new Promise(resolve=>child.once('exit',resolve));
}
async function waitJob(base, jobId) {
  for(let i=0;i<80;i++) {
    const response=await fetch(`${base}/api/internal/collection/jobs/${jobId}`,{headers:{Authorization:'Bearer test-token-not-for-production'}});
    const {data}=await response.json();
    if(data.status!=='running') return data;
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  throw Error('collection job did not finish');
}

test('official Okinawa fixture is idempotent, verified-only, authenticated, and preserves data after collector failure', async t=>{
  const directory=await mkdtemp(join(tmpdir(),'okinawa-election-api-'));
  const db=join(directory,'test.sqlite');
  let api;
  try {
    api=await startApi(await freePort(),db,true);
    const unauthorized=await fetch(`${api.base}/api/internal/collection/run`,{method:'POST'});
    assert.equal(unauthorized.status,401);
    const headers={Authorization:'Bearer test-token-not-for-production'};
    for(let repeat=0;repeat<2;repeat++) {
      const accepted=await fetch(`${api.base}/api/internal/collection/run`,{method:'POST',headers});
      assert.equal(accepted.status,202);
      const {jobId}=await accepted.json();
      assert.equal((await waitJob(api.base,jobId)).status,'completed');
    }
    const synced=await fetch(`${api.base}/api/internal/polling/sync-catalog`,{method:'POST',headers});
    assert.equal(synced.status,200);
    const elections=await (await fetch(`${api.base}/api/elections?kind=governor`)).json();
    assert.equal(elections.data.length,1);
    const nahaElections=await (await fetch(`${api.base}/api/elections?municipality=${encodeURIComponent('那覇市')}`)).json();
    assert.deepEqual(nahaElections.data.map(election=>election.municipality).sort(),['沖縄県','那覇市']);
    assert.equal(nahaElections.collectionStatus,'completed');
    const nahaElection=nahaElections.data.find(election=>election.municipality==='那覇市');
    assert.equal(nahaElection.sources[0].url,'https://www.city.naha.okinawa.jp/admin/senkan/1008237/1012245.html');
    assert.equal(nahaElection.sources[0].publisher,'Supabase登録');
    const electionId=elections.data[0].id;
    const listing=await (await fetch(`${api.base}/api/elections/${electionId}/candidates`)).json();
    assert.equal(listing.complete,true);
    assert.equal(listing.data.length,6);
    assert.ok(listing.data.some(candidate=>candidate.name.includes('カネシマ')&&candidate.party==='無所属'));
    assert.ok(listing.data.every(candidate=>candidate.age===null));
    assert.ok(listing.data.every(candidate=>candidate.x_url===null&&candidate.x_source_url===null));
    assert.ok(listing.data.every(candidate=>Array.isArray(candidate.sources)&&Array.isArray(candidate.pledges)));
    assert.ok(listing.data.every(candidate=>candidate.pledges.every(pledge=>
      typeof pledge.summary==='string'&&typeof pledge.originalText==='string'&&
      pledge.source.url.startsWith('https://')&&typeof pledge.source.publisher==='string',
    )));
    const candidate=listing.data[0];
    const sourceResponse=await fetch(`${api.base}/api/candidates/${candidate.id}/sources`);
    assert.equal(sourceResponse.status,200);
    const sources=await sourceResponse.json();
    assert.ok(sources.data.some(source=>source.source_type==='official_pdf'&&source.verification_status==='verified'));
    await new Promise(resolve=>setTimeout(resolve,200));
    await stopApi(api.child); api=null;

    api=await startApi(await freePort(),db,false);
    const failed=await fetch(`${api.base}/api/internal/collection/run`,{method:'POST',headers});
    assert.equal(failed.status,202);
    const failedJob=await failed.json();
    assert.equal((await waitJob(api.base,failedJob.jobId)).status,'failed');
    const retained=await (await fetch(`${api.base}/api/elections/${electionId}/candidates`)).json();
    assert.equal(retained.complete,true);
    assert.equal(retained.data.length,6);
  } finally {
    if(api) await stopApi(api.child);
    await rm(directory,{recursive:true,force:true});
  }
});
