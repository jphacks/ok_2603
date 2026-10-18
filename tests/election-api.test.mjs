import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { countOfficialCandidateRows, parseOfficialCandidateRows, parseOfficialLinks, OFFICIAL_EXPLORATION_ROOTS, electionKindFromLabel, electionIdFromSource } from '../server/official-parser.mjs';
import { normalizeXUrl, candidateSiteIdentity, verifiedXLinksOnPage, relevantSameSitePages } from '../server/x-discovery.mjs';

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
  assert.equal(electionKindFromLabel('市議会議員選挙'),'municipal-assembly');
  assert.notEqual(electionIdFromSource('沖縄県議会議員補欠選挙（うるま市選挙区）','https://www.pref.okinawa.lg.jp/a.pdf',2026,'prefectural-assembly').id,electionIdFromSource('沖縄県議会議員補欠選挙（島尻・南城市選挙区）','https://www.pref.okinawa.lg.jp/b.pdf',2026,'prefectural-assembly').id);
  const links=parseOfficialLinks('<a href="/kensei/senkyo/feature.html">特設ページ</a><a href="https://example.com">外部</a>','https://www.pref.okinawa.lg.jp/index.html');
  assert.equal(links.length,1);
  assert.match(links[0].url,/pref.okinawa.lg.jp/);
});

async function freePort() {
  const server=createServer();
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const port=server.address().port;
  await new Promise(resolve=>server.close(resolve));
  return port;
}
async function startApi(port, db, fixture) {
  const env={...process.env,API_PORT:String(port),API_HOST:'127.0.0.1',DATABASE_PATH:db,ADMIN_API_TOKEN:'test-token-not-for-production',GEMINI_API_KEY:'',NODE_ENV:fixture?'test':'development'};
  if(fixture) env.COLLECTION_FIXTURE='okinawa-governor-2026'; else delete env.COLLECTION_FIXTURE;
  // The failure-recovery test must not crawl a real website or depend on its latency.
  const failureImport = 'data:text/javascript,' + encodeURIComponent("globalThis.fetch = async () => { throw new Error('test-only injected network failure'); };");
  const child=spawn(process.execPath,[...(!fixture ? ['--import',failureImport] : []),'server/index.mjs'],{cwd:process.cwd(),env,stdio:['ignore','ignore','pipe']});
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
    const elections=await (await fetch(`${api.base}/api/elections?kind=governor`)).json();
    assert.equal(elections.data.length,1);
    const electionId=elections.data[0].id;
    const listing=await (await fetch(`${api.base}/api/elections/${electionId}/candidates`)).json();
    assert.equal(listing.complete,true);
    assert.equal(listing.data.length,6);
    assert.ok(listing.data.some(candidate=>candidate.name.includes('カネシマ')&&candidate.party==='無所属'));
    assert.ok(listing.data.every(candidate=>candidate.age===null));
    assert.ok(listing.data.every(candidate=>candidate.x_url===null&&candidate.x_source_url===null));
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
