// Coordinates checked against both pages of the official 2026 Okinawa governor bulletin.
// This override is used only for this exact PDF revision. Other bulletins need review.
const GOVERNOR_2026_BULLETIN_HASH='765e47691b9246a5107c4ad87126a8c63de9e2abdf074452517ca16847bebadf';
// Coordinates below are from the 1356 x 1824 review image of the PDF pages.
const WIDTH=1356, HEIGHT=1824;
const boxes=new Map([
  ['屋良 朝助',[1,1144,177,148,199]],
  ['玉城 デニー',[1,1142,717,151,184]],
  ['すえよし まさひろ',[1,1143,1244,151,192]],
  ['古謝 げんた',[2,1138,179,157,199]],
  ['カネシマ シュン',[2,1139,708,156,198]],
  ['ヒガ タカシ',[2,1140,1231,155,204]],
]);

export function verifiedPortraitBox(pdfHash,candidateName) {
  if(pdfHash!==GOVERNOR_2026_BULLETIN_HASH) return null;
  const box=boxes.get(candidateName);
  if(!box) return null;
  const [page,x,y,width,height]=box;
  return {page,x:x/WIDTH,y:y/HEIGHT,width:width/WIDTH,height:height/HEIGHT};
}
