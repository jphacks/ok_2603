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

// Naha mayoral election bulletin (2026), checked on the 1151 x 1548 render of each page.
const NAHA_2026_BULLETIN_HASH='3f608ab475a685b57b8b91b9ee47cdcaf200b5c4f9e724f939ea381f2ab51777';
const NAHA_WIDTH=1151, NAHA_HEIGHT=1548;
const nahaBoxes=new Map([
  ['知念さとる',[1,955,165,112,175]],
  ['ヨシミネリョウ',[1,940,607,126,178]],
  ['久手堅さちこ',[1,945,1060,122,175]],
  ['矢島ケント',[2,940,58,127,179]],
]);

export function verifiedPortraitBox(pdfHash,candidateName) {
  if(pdfHash===NAHA_2026_BULLETIN_HASH) {
    const box=nahaBoxes.get(candidateName.replace(/\s/gu,''));
    if(!box) return null;
    const [page,x,y,width,height]=box;
    return {page,x:x/NAHA_WIDTH,y:y/NAHA_HEIGHT,width:width/NAHA_WIDTH,height:height/NAHA_HEIGHT};
  }
  if(pdfHash!==GOVERNOR_2026_BULLETIN_HASH) return null;
  const box=boxes.get(candidateName);
  if(!box) return null;
  const [page,x,y,width,height]=box;
  return {page,x:x/WIDTH,y:y/HEIGHT,width:width/WIDTH,height:height/HEIGHT};
}
