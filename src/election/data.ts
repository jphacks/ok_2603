import type { Candidate, Election, GlossaryTerm } from "./model";

// 人が公式資料を確認した後に登録する。未収録は選挙・候補者が存在しないという意味ではない。
export const elections: Election[] = [];
export const candidates: Candidate[] = [];
const glossaryCheckedAt = "2026-10-18";
const ministrySource = (url: string) => ({
  url,
  publisher: "総務省",
  checkedAt: glossaryCheckedAt,
});

export const glossary: GlossaryTerm[] = [
  {
    term: "選挙",
    definition:
      "有権者が投票で代表者を選ぶしくみです。選ばれた代表者は、議会などで意思決定に参加します。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo01.html",
      ),
    ],
  },
  {
    term: "選挙権",
    definition:
      "選挙で投票できる資格です。年齢や住所などの要件は、選挙の種類によって定められています。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo02.html",
      ),
    ],
  },
  {
    term: "被選挙権",
    definition:
      "選挙に立候補できる資格です。必要な年齢などの要件は、選挙の種類によって異なります。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo02.html",
      ),
    ],
  },
  {
    term: "国政選挙",
    definition:
      "国会議員を選ぶ選挙です。衆議院議員総選挙と参議院議員通常選挙があります。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo03.html",
      ),
    ],
  },
  {
    term: "衆議院",
    definition:
      "国会を構成する議院の一つです。議員は小選挙区選挙と比例代表選挙で選ばれます。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo04.html",
      ),
    ],
  },
  {
    term: "参議院",
    definition:
      "国会を構成する議院の一つです。議員の任期は6年で、3年ごとに半数を選び直す通常選挙があります。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo03.html",
      ),
    ],
  },
  {
    term: "小選挙区選挙",
    definition: "選挙区ごとに投票し、その選挙区から議員1人を選ぶ方式です。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo04.html",
      ),
    ],
  },
  {
    term: "比例代表選挙",
    definition:
      "政党などへの投票数に応じて、議席を配分する方式です。参議院では候補者個人名でも投票できます。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo04.html",
      ),
    ],
  },
  {
    term: "選挙区",
    definition:
      "議員を選ぶために区切られた区域です。選挙の種類によって区域や選ぶ人数が異なります。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo04.html",
      ),
    ],
  },
  {
    term: "投票日",
    definition: "有権者が投票を行う日です。選挙ごとに定められます。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo05.html",
      ),
    ],
  },
  {
    term: "任期",
    definition:
      "議員などがその職に就く期間です。衆議院と参議院では任期が異なります。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo03.html",
      ),
    ],
  },
  {
    term: "通常選挙",
    definition:
      "参議院議員の任期満了に伴って行われる選挙です。3年ごとに議員の半数を選びます。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo03.html",
      ),
    ],
  },
  {
    term: "補欠選挙",
    definition:
      "議員に欠員が生じた場合などに、欠けた議員を補うために行われる選挙です。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo03.html",
      ),
    ],
  },
  {
    term: "再選挙",
    definition:
      "当選人がいない場合など、法律で定められた場合に改めて行われる選挙です。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo03.html",
      ),
    ],
  },
  {
    term: "期日前投票",
    definition:
      "投票日に投票所へ行けない場合などに、定められた期間中、投票日前に投票する制度です。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo05.html",
      ),
    ],
  },
  {
    term: "不在者投票",
    definition:
      "仕事や旅行などで登録先の市区町村以外に滞在している場合などに、所定の手続で投票する制度です。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo05.html",
      ),
    ],
  },
  {
    term: "選挙管理委員会",
    definition:
      "選挙に関する事務を管理する機関です。都道府県や市区町村などに設置されています。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo06.html",
      ),
    ],
  },
  {
    term: "定数",
    definition: "議会や選挙で選ぶ議員の定められた人数です。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo03.html",
      ),
    ],
  },
  {
    term: "選挙運動",
    definition:
      "特定の選挙で、候補者の当選を目的として投票を呼びかける活動です。行える方法や期間には法律上のルールがあります。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo05.html",
      ),
    ],
  },
  {
    term: "選挙運動期間",
    definition:
      "選挙運動ができる期間です。選挙の種類によって異なり、立候補の届出後から投票日前日までとされています。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo05.html",
      ),
    ],
  },
  {
    term: "選挙公報",
    definition:
      "候補者の氏名や経歴、政見などを掲載し、有権者に知らせるために選挙管理委員会が発行する資料です。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo05.html",
      ),
    ],
  },
  {
    term: "投票所入場券",
    definition:
      "選挙や投票所を知らせるために送られる案内です。届かない場合や紛失した場合の扱いは、地域の選挙管理委員会に確認できます。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo05.html",
      ),
    ],
  },
  {
    term: "投票用紙",
    definition:
      "投票内容を記入する用紙です。選挙の種類によって、候補者名や政党名などを記入します。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo04.html",
      ),
    ],
  },
  {
    term: "代理投票",
    definition:
      "自分で投票用紙に記入することが難しい人が、投票所の係員に意思を伝え、代わりに記入してもらう制度です。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo05.html",
      ),
    ],
  },
  {
    term: "点字投票",
    definition:
      "点字で投票用紙に記入して投票する方法です。投票所で申し出て利用できます。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo05.html",
      ),
    ],
  },
  {
    term: "在外投票",
    definition:
      "海外に住む有権者が、在外選挙人名簿への登録など所定の要件を満たしたうえで、国政選挙に投票する制度です。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo05.html",
      ),
    ],
  },
  {
    term: "選挙人名簿",
    definition:
      "投票できる人を登録した名簿です。投票するには、原則として名簿に登録されている必要があります。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo07.html",
      ),
    ],
  },
  {
    term: "衆議院議員総選挙",
    definition:
      "衆議院議員を選ぶ選挙です。任期満了または衆議院の解散に伴って行われます。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo03.html",
      ),
    ],
  },
  {
    term: "解散",
    definition:
      "衆議院の議員全員が任期途中で議員の地位を失うことです。解散後、衆議院議員総選挙が行われます。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo03.html",
      ),
    ],
  },
  {
    term: "繰上補充",
    definition:
      "当選人が当選できなくなった場合などに、法律で定められた手続により、次点の候補者などを当選人とすることです。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo03.html",
      ),
    ],
  },
];
