import { createHash } from 'node:crypto';

export function countOfficialCandidateRows(text) {
  const parties=['無所属','自由民主党','自民党','公明党','日本共産党','共産党','立憲民主党','国民民主党','日本維新の会','社会民主党','社民党','れいわ新選組','参政党','沖縄社会大衆党','琉球独立党'];
  const partyPattern=parties.map(party=>party.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const rowPattern=new RegExp(`^\\s*\\d{1,2}\\s*[\\p{L}々〆ヵヶー・　 ]{2,24}?\\s*(?:${partyPattern})(?=\\s|$)`,'mu');
  return text.split(/\r?\n/).filter(line=>rowPattern.test(line)).length;
}

export function parseOfficialCandidateRows(text) {
  const rows=[];
  const knownParties=['無所属','自由民主党','自民党','公明党','日本共産党','共産党','立憲民主党','国民民主党','日本維新の会','社会民主党','社民党','れいわ新選組','参政党','沖縄社会大衆党','琉球独立党'];
  const partyPattern=knownParties.map(party=>party.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const rowPattern=new RegExp(`(?:^|\\n)\\s*(\\d{1,2})\\s*([\\p{L}々〆ヵヶー・　 ]{2,24}?)\\s*(${partyPattern})(?=\\s|$)`,'gmu');
  for(const match of text.matchAll(rowPattern)) {
    const name=match[2].replace(/[\t 　]+/g,' ').trim();
    if(name) rows.push({number:Number(match[1]),name,party:match[3]});
  }
  return rows;
}

export const OFFICIAL_EXPLORATION_ROOTS = Object.freeze([
  'https://www.pref.okinawa.lg.jp/kensei/senkyo/1023172/1005019.html',
  'https://www.pref.okinawa.lg.jp/kensei/senkyo/1005009/index.html',
]);

export function parseOfficialLinks(html, baseUrl) {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)].map(match=>({
    url:new URL(match[1].replaceAll('&amp;','&'),baseUrl).href,
    label:match[2].replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim(),
  })).filter(link=>{
    const host=new URL(link.url).hostname;
    return /^https:$/.test(new URL(link.url).protocol) && (host==='www.pref.okinawa.lg.jp'||host==='pref.okinawa.lg.jp');
  });
}

export function reiwaYear(text) {
  const match=text.match(/令和\s*([元0-9０-９]+)年/u);
  if(!match) return null;
  const n=match[1]==='元'?1:Number(match[1].replace(/[０-９]/g,d=>String.fromCharCode(d.charCodeAt(0)-0xfee0)));
  return Number.isFinite(n)?2018+n:null;
}

export function yearFromLabel(text) {
  return text.match(/20\d{2}/)?.[0] ? Number(text.match(/20\d{2}/)[0]) : reiwaYear(text);
}

export function parseJapaneseDateNear(text,label) {
  const escaped=label.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match=text.match(new RegExp(`${escaped}[^\\n。]{0,60}?(令和\\s*[元0-9０-９]+年\\s*[0-9０-９]+月\\s*[0-9０-９]+日|平成\\s*[0-9０-９]+年\\s*[0-9０-９]+月\\s*[0-9０-９]+日|20[0-9]{2}年\\s*[0-9]{1,2}月\\s*[0-9]{1,2}日)`,'u'));
  if(!match) return null;
  const date=match[1].replace(/[０-９]/g,d=>String.fromCharCode(d.charCodeAt(0)-0xfee0));
  const normalized=date.replace(/令和\s*元年/,'令和1年').replace(/令和\s*(\d+)年/,(all,n)=>`${2018+Number(n)}年`).replace(/平成\s*(\d+)年/,(all,n)=>`${1988+Number(n)}年`).replace(/年\s*/,'-').replace(/月\s*/,'-').replace(/日/,'').replace(/\s/g,'');
  const parts=normalized.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  return parts?`${parts[1]}-${parts[2].padStart(2,'0')}-${parts[3].padStart(2,'0')}`:null;
}

export function electionKindFromLabel(label) {
  if(/衆議院|参議院/u.test(label)) return 'national';
  if(/知事選挙/u.test(label)) return 'governor';
  if(/県議会議員.*(?:一般|補欠)選挙|県議会議員選挙/u.test(label)) return 'prefectural-assembly';
  if(/市長選挙|町長選挙|村長選挙/u.test(label)) return 'municipal-mayor';
  if(/市議会議員.*選挙|町議会議員.*選挙|村議会議員.*選挙/u.test(label)) return 'municipal-assembly';
  return null;
}

export function electionIdFromSource(label,url,year,kind) {
  const district=label.match(/[（(]([^）)]+選挙区)[）)]/u)?.[1]||'';
  const digest=createHash('sha256').update(`${year}:${kind}:${district||'prefecturewide'}`).digest('hex').slice(0,18);
  return {id:`okinawa-${kind}-${year}-${digest}`,district};
}
