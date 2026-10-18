import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

const compact = value => String(value || '').normalize('NFKC').replace(/[\s\u3000]+/g, '').toLocaleLowerCase('ja-JP');
const decode = value => String(value || '').replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
const textOnly = html => decode(String(html || '').replace(/<script\b[\s\S]*?<\/script>|<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')).trim();
const blockedHandles = new Set(['home','search','share','intent','hashtag','explore','login','signup','settings','messages','notifications','i','compose','privacy','tos']);

export function normalizeXUrl(raw) {
  try {
    const url = new URL(String(raw || '').trim().replace(/[）、。.,;]+$/u, ''));
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.port) return null;
    if (!['x.com','www.x.com','twitter.com','www.twitter.com','mobile.twitter.com'].includes(url.hostname.toLowerCase())) return null;
    const parts = url.pathname.split('/').filter(Boolean);
    if (parts.length !== 1) return null;
    const handle = parts[0];
    if (!/^[A-Za-z0-9_]{1,15}$/.test(handle) || blockedHandles.has(handle.toLowerCase())) return null;
    return `https://${url.hostname.toLowerCase().includes('twitter.com') ? 'twitter.com' : 'x.com'}/${handle}`;
  } catch { return null; }
}

export function parsePageLinks(html, baseUrl) {
  const result = [];
  for (const match of String(html || '').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const href = match[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!href) continue;
    try {
      const url = new URL(decode(href[1] ?? href[2] ?? href[3]), baseUrl);
      result.push({url:url.href,label:textOnly(match[2]),context:textOnly(html.slice(Math.max(0,match.index-180),match.index+match[0].length+70)),raw:match[0]});
    } catch {}
  }
  return result;
}

export async function candidateWebsitesFromPdf(pdfBytes, roster) {
  const result = new Map();
  const pdf = await pdfjs.getDocument({data:new Uint8Array(pdfBytes),useSystemFonts:true}).promise;
  for (let n=1;n<=pdf.numPages;n++) {
    const page=await pdf.getPage(n);
    const content=await page.getTextContent();
    const items=content.items.filter(item=>item.str?.trim()).map(item=>({text:item.str.trim(),x:item.transform[4],y:item.transform[5]}));
    const lines=[];
    for (const item of items) {
      let line=lines.find(line=>Math.abs(line.y-item.y)<2);
      if (!line) { line={y:item.y,items:[]}; lines.push(line); }
      line.items.push(item);
    }
    for (const line of lines) line.items.sort((a,b)=>a.x-b.x);
    const personLines=roster.map(candidate=>({candidate,line:lines.find(line=>compact(line.items.map(item=>item.text).join('')).includes(compact(candidate.name)))})).filter(item=>item.line);
    for (const line of lines) for (const item of line.items) {
      for (const match of item.text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
        let url;
        try { url=new URL(match[0].replace(/[）、。.,;]+$/u,'')); } catch { continue; }
        if (url.protocol!=='https:' || url.username || url.password || url.port) continue;
        const nearest=personLines.map(entry=>({...entry,distance:Math.abs(entry.line.y-line.y)})).sort((a,b)=>a.distance-b.distance)[0];
        if (!nearest || nearest.distance>8 || result.has(nearest.candidate.name)) continue;
        result.set(nearest.candidate.name,{url:url.href,sourcePage:n});
      }
    }
  }
  return result;
}

export function candidateSiteIdentity(html, name) {
  const title=textOnly(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const headings=[...html.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi)].map(match=>textOnly(match[1])).join(' ');
  return (compact(title).includes(compact(name)) && /公式|official/i.test(title)) ||
    (compact(headings).includes(compact(name)) && /公式|official/i.test(headings));
}

export function verifiedXLinksOnPage(html, pageUrl, candidateName, candidateSite) {
  const page=textOnly(html);
  const name=compact(candidateName);
  const links=parsePageLinks(html,pageUrl);
  const results=[];
  for (const link of links) {
    const xUrl=normalizeXUrl(link.url);
    if (!xUrl) continue;
    const context=link.context;
    const socialLabel=/\bX\b|Twitter|ツイッター|SNS|公式アカウント/iu.test(`${link.label} ${context} ${link.raw}`);
    const namedOfficial=compact(context).includes(name) && /公式|本人/iu.test(context);
    const explicitlyOwned=compact(page).includes(name) && /公式アカウントの運営主体|本人.*(?:管理|運営)|公式アカウント一覧/iu.test(page);
    const thirdParty=/(?:後援会|事務所|政党|支部|応援|サポーター|[\p{L}]{1,12}党)(?:.{0,5})(?:公式)?(?:X|Twitter|アカウント)/iu.test(context);
    if (socialLabel && !thirdParty && (candidateSite ? (namedOfficial || explicitlyOwned) : namedOfficial)) results.push({url:xUrl,sourceUrl:pageUrl,excerpt:context.slice(0,300)});
  }
  return [...new Map(results.map(item=>[item.url,item])).values()];
}

export function relevantSameSitePages(html, baseUrl, max=5) {
  const base=new URL(baseUrl);
  return [...new Set(parsePageLinks(html,baseUrl).filter(link=>{
    const target=new URL(link.url);
    return target.protocol==='https:' && target.hostname===base.hostname &&
      !/\.(?:pdf|jpe?g|png|gif|svg|webp|zip|docx?)(?:$|\?)/i.test(target.pathname) &&
      /SNS|ソーシャル|アカウント|X\b|Twitter|ガイドライン|プロフィール|候補者/iu.test(`${link.label} ${target.pathname}`);
  }).map(link=>{const url=new URL(link.url);url.hash='';return url.href;}))].filter(url=>url!==base.href).slice(0,max);
}
