import type { Candidate, CouncilMember, Election, GlossaryTerm } from "./model";

// 人が公式資料を確認した後に登録する。未収録は選挙・候補者が存在しないという意味ではない。
const nahaMayorSource = {
  url: "https://www.city.naha.okinawa.jp/_res/projects/default_project/_page_/001/012/245/r8sityou_riltukouhosyaitiran_0930.pdf",
  publisher: "那覇市選挙管理委員会",
  checkedAt: "2026-10-18",
};
export const elections: Election[] = [
  {
    id: "naha-mayor-2026",
    name: "第24回那覇市長選挙",
    kind: "municipal-mayor",
    prefectureIds: ["沖縄県"],
    municipality: "那覇市",
    level: "local",
    period: "current",
    date: "2026-10-25",
    sources: [
      {
        url: "https://www.city.naha.okinawa.jp/admin/senkan/1008237/1012245.html",
        publisher: "那覇市選挙管理委員会",
        checkedAt: "2026-10-18",
      },
    ],
    turnout: { status: "unrecorded" },
  },
];
const unrecorded = () => ({ status: "unrecorded" as const });
const nahaMayorCandidates = [
  {
    id: "naha-mayor-2026-kudeken-sachiko",
    name: "久手堅 さちこ",
    profile: ["74歳", "新日本婦人の会沖縄県本部 会長"],
  },
  {
    id: "naha-mayor-2026-yajima-kento",
    name: "矢島 ケント",
    profile: ["35歳", "Hope&futureサービス株式会社 代表取締役社長"],
  },
  {
    id: "naha-mayor-2026-chinen-satoru",
    name: "知念 さとる",
    profile: ["63歳", "那覇市長"],
  },
  {
    id: "naha-mayor-2026-yoshimine-ryo",
    name: "ヨシミネ リョウ",
    profile: ["25歳", "IT会社員"],
  },
] satisfies (Pick<Candidate, "id" | "name"> & { profile: string[] })[];
export const candidates: Candidate[] = nahaMayorCandidates.map(
  ({ id, name, profile }) => ({
    id,
    electionId: "naha-mayor-2026",
    name,
    party: { status: "recorded", value: "無所属", sources: [nahaMayorSource] },
    photo: unrecorded(),
    pledges: [],
    profile: {
      status: "recorded",
      value: profile,
      sources: [nahaMayorSource],
    },
    speeches: unrecorded(),
    votes: unrecorded(),
    history: unrecorded(),
    sources: [nahaMayorSource],
  }),
);
const glossaryCheckedAt = "2026-10-18";
const ministrySource = (url: string) => ({
  url,
  publisher: "総務省",
  checkedAt: glossaryCheckedAt,
});
const constitutionSource = {
  url: "https://laws.e-gov.go.jp/law/321CONSTITUTION",
  publisher: "e-Gov法令検索（日本国憲法）",
  checkedAt: glossaryCheckedAt,
};
const electionLawSource = {
  url: "https://laws.e-gov.go.jp/law/325AC1000000100",
  publisher: "e-Gov法令検索（公職選挙法）",
  checkedAt: glossaryCheckedAt,
};

export const glossaryReadings: Record<string, string> = {
  選挙: "せんきょ",
  選挙権: "せんきょけん",
  被選挙権: "ひせんきょけん",
  国政選挙: "こくせいせんきょ",
  衆議院: "しゅうぎいん",
  参議院: "さんぎいん",
  小選挙区選挙: "しょうせんきょくせんきょ",
  比例代表選挙: "ひれいだいひょうせんきょ",
  選挙区: "せんきょく",
  投票日: "とうひょうび",
  任期: "にんき",
  通常選挙: "つうじょうせんきょ",
  補欠選挙: "ほけつせんきょ",
  再選挙: "さいせんきょ",
  期日前投票: "きじつぜんとうひょう",
  不在者投票: "ふざいしゃとうひょう",
  選挙管理委員会: "せんきょかんりいいんかい",
  定数: "ていすう",
  選挙運動: "せんきょうんどう",
  選挙運動期間: "せんきょうんどうきかん",
  選挙公報: "せんきょこうほう",
  投票所入場券: "とうひょうじょにゅうじょうけん",
  投票用紙: "とうひょうようし",
  代理投票: "だいりとうひょう",
  点字投票: "てんじとうひょう",
  在外投票: "ざいがいとうひょう",
  選挙人名簿: "せんきょにんめいぼ",
  衆議院議員総選挙: "しゅうぎいんぎいんそうせんきょ",
  解散: "かいさん",
  繰上補充: "くりあげほじゅう",
  "公示と告示": "こうじとこくじ",
  "与党と野党": "よとうとやとう",
  政党: "せいとう",
  連立政権: "れんりつせいけん",
  内閣: "ないかく",
  国会: "こっかい",
  法律案: "ほうりつあん",
  予算: "よさん",
  投票率: "とうひょうりつ",
  開票: "かいひょう",
  当選: "とうせん",
  無効票: "むこうひょう",
  白票: "はくひょう",
  政見放送: "せいけんほうそう",
  供託金: "きょうたくきん",
  国民審査: "こくみんしんさ",
  "一票の格差": "いっぴょうのかくさ",
  政治資金: "せいじしきん",
  有権者: "ゆうけんしゃ",
  国民主権: "こくみんしゅけん",
  三権分立: "さんけんぶんりつ",
  立法: "りっぽう",
  行政: "ぎょうせい",
  司法: "しほう",
  内閣総理大臣: "ないかくそうりだいじん",
  国務大臣: "こくむだいじん",
  衆議院議長: "しゅうぎいんぎちょう",
  参議院議長: "さんぎいんぎちょう",
  国会議員: "こっかいぎいん",
  議席: "ぎせき",
  地方自治: "ちほうじち",
  地方議会: "ちほうぎかい",
  首長: "しゅちょう",
  条例: "じょうれい",
  普通選挙: "ふつうせんきょ",
  平等選挙: "びょうどうせんきょ",
  秘密投票: "ひみつとうひょう",
  直接選挙: "ちょくせつせんきょ",
  投票立会人: "とうひょうたちあいにん",
  開票立会人: "かいひょうたちあいにん",
  有効票: "ゆうこうひょう",
  按分票: "あんぶんひょう",
  法定得票数: "ほうていとくひょうすう",
  比例名簿: "ひれいめいぼ",
  重複立候補: "ちょうふくりっこうほ",
  小選挙区比例代表並立制: "しょうせんきょくひれいだいひょうへいりつせい",
  国政調査権: "こくせいちょうさけん",
  内閣不信任決議: "ないかくふしんにんけつぎ",
  国会召集: "こっかいしょうしゅう",
  国民投票: "こくみんとうひょう",
  憲法改正: "けんぽうかいせい",
};

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
  {
    term: "公示と告示",
    definition:
      "どちらも選挙について公式に知らせることです。国政選挙では「公示」、地方選挙では「告示」という呼び方が使われます。",
    sources: [electionLawSource],
  },
  {
    term: "与党と野党",
    definition:
      "与党は内閣を組織し政権を担う政党、野党はその内閣に参加していない政党を指します。政策ごとに賛否が異なることもあります。",
    sources: [constitutionSource],
  },
  {
    term: "政党",
    definition:
      "共通する政策や政治上の考えをもとに活動する人々の団体です。選挙や国会などを通じて政治に関わります。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo01.html",
      ),
    ],
  },
  {
    term: "連立政権",
    definition:
      "複数の政党が協力して内閣を組織し、政権を担う形です。",
    sources: [constitutionSource],
  },
  {
    term: "内閣",
    definition:
      "内閣総理大臣と国務大臣で構成され、行政を担当する機関です。",
    sources: [constitutionSource],
  },
  {
    term: "国会",
    definition:
      "国の唯一の立法機関で、衆議院と参議院で構成されます。",
    sources: [constitutionSource],
  },
  {
    term: "法律案",
    definition:
      "法律を新たに作ったり改めたりするため、国会に提出され審議される案です。",
    sources: [constitutionSource],
  },
  {
    term: "予算",
    definition:
      "国や自治体が、一定期間に得る収入と使う支出の見込みをまとめた計画です。",
    sources: [constitutionSource],
  },
  {
    term: "投票率",
    definition:
      "有権者のうち投票した人の割合です。対象となる選挙や集計の範囲とあわせて確認します。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/news/sonota/nendaibetu/",
      ),
    ],
  },
  {
    term: "開票",
    definition:
      "投票が終わった後に投票用紙を数え、候補者や政党などへの票数を集計する手続です。",
    sources: [electionLawSource],
  },
  {
    term: "当選",
    definition:
      "選挙の方式や法律で定められた要件に基づき、選ばれた候補者などが当選人となることです。",
    sources: [electionLawSource],
  },
  {
    term: "無効票",
    definition:
      "記載方法などが法律上の要件を満たさず、有効な票として扱われない投票です。",
    sources: [electionLawSource],
  },
  {
    term: "白票",
    definition:
      "候補者名などを書かずに投じられた票です。有効票には含まれず、無効票として集計されます。",
    sources: [electionLawSource],
  },
  {
    term: "政見放送",
    definition:
      "選挙期間中に、候補者などが政見を伝えるために行う放送です。選挙の種類に応じて制度が定められています。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo05.html",
      ),
    ],
  },
  {
    term: "供託金",
    definition:
      "立候補の届出時に法務局へ預ける金銭です。選挙の種類ごとに額が定められ、得票など一定の条件により返還または没収されます。",
    sources: [electionLawSource],
  },
  {
    term: "国民審査",
    definition:
      "最高裁判所の裁判官について、辞めさせるべきかどうかを有権者が投票で示す制度です。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo04.html",
      ),
    ],
  },
  {
    term: "一票の格差",
    definition:
      "選挙区ごとの有権者数と議員定数の違いにより、一人の議員を選ぶために必要な有権者数に差が生じることです。",
    sources: [constitutionSource, electionLawSource],
  },
  {
    term: "政治資金",
    definition:
      "政党や政治団体などが政治活動に使う資金です。収支の報告や公開について法律上のルールがあります。",
    sources: [
      ministrySource("https://www.soumu.go.jp/senkyo/seiji_s/seijishikin/"),
    ],
  },
  {
    term: "有権者",
    definition:
      "選挙で投票する資格を持つ人です。選挙ごとに年齢や住所などの要件があります。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo02.html",
      ),
    ],
  },
  {
    term: "国民主権",
    definition:
      "国の政治のあり方を最終的に決める力が国民にあるという考え方です。日本国憲法の基本原理の一つです。",
    sources: [constitutionSource],
  },
  {
    term: "三権分立",
    definition:
      "国の権力を立法・行政・司法に分け、それぞれ別の機関が担うことで、権力が一か所に集中しないようにするしくみです。",
    sources: [constitutionSource],
  },
  {
    term: "立法",
    definition:
      "社会のルールとなる法律をつくることです。日本では国会が国の唯一の立法機関です。",
    sources: [constitutionSource],
  },
  {
    term: "行政",
    definition:
      "法律や予算に基づいて、国の仕事を実施することです。国では内閣が行政権を担います。",
    sources: [constitutionSource],
  },
  {
    term: "司法",
    definition:
      "法律に基づいて争いを解決し、裁判を行うことです。裁判所が司法権を担います。",
    sources: [constitutionSource],
  },
  {
    term: "内閣総理大臣",
    definition:
      "国会議員の中から国会が指名し、内閣の長となる人です。国務大臣を任命します。",
    sources: [constitutionSource],
  },
  {
    term: "国務大臣",
    definition:
      "内閣を構成し、行政を担当する大臣です。内閣総理大臣が任命します。",
    sources: [constitutionSource],
  },
  {
    term: "衆議院議長",
    definition:
      "衆議院を代表し、議事を進行する役職です。衆議院議員の中から選ばれます。",
    sources: [constitutionSource],
  },
  {
    term: "参議院議長",
    definition:
      "参議院を代表し、議事を進行する役職です。参議院議員の中から選ばれます。",
    sources: [constitutionSource],
  },
  {
    term: "国会議員",
    definition:
      "選挙で選ばれ、衆議院または参議院を構成する議員です。法律や予算などを審議します。",
    sources: [constitutionSource],
  },
  {
    term: "議席",
    definition:
      "議会で議員が占める席、または政党などが持つ議員の数を指す言葉です。",
    sources: [constitutionSource],
  },
  {
    term: "地方自治",
    definition:
      "地域の行政を、住民の意思に基づいて地方公共団体が行うしくみです。",
    sources: [
      {
        url: "https://laws.e-gov.go.jp/law/322AC0000000067",
        publisher: "e-Gov法令検索（地方自治法）",
        checkedAt: glossaryCheckedAt,
      },
    ],
  },
  {
    term: "地方議会",
    definition:
      "都道府県や市区町村に置かれ、条例や予算など地域の重要事項を審議・決定する議会です。",
    sources: [
      {
        url: "https://laws.e-gov.go.jp/law/322AC0000000067",
        publisher: "e-Gov法令検索（地方自治法）",
        checkedAt: glossaryCheckedAt,
      },
    ],
  },
  {
    term: "首長",
    definition:
      "都道府県知事や市区町村長など、地方公共団体を代表し、その行政を担う人です。",
    sources: [
      {
        url: "https://laws.e-gov.go.jp/law/322AC0000000067",
        publisher: "e-Gov法令検索（地方自治法）",
        checkedAt: glossaryCheckedAt,
      },
    ],
  },
  {
    term: "条例",
    definition:
      "地方公共団体が、法律の範囲内で議会の議決により定める地域のルールです。",
    sources: [
      {
        url: "https://laws.e-gov.go.jp/law/322AC0000000067",
        publisher: "e-Gov法令検索（地方自治法）",
        checkedAt: glossaryCheckedAt,
      },
    ],
  },
  {
    term: "普通選挙",
    definition:
      "財産や納税額などによって投票資格を制限せず、法律で定める年齢などの要件を満たす人に選挙権を認める考え方です。",
    sources: [constitutionSource],
  },
  {
    term: "平等選挙",
    definition:
      "有権者が平等に選挙へ参加できるという原則です。投票の価値の平等も重要な考え方です。",
    sources: [constitutionSource],
  },
  {
    term: "秘密投票",
    definition:
      "誰に投票したかを他人に知られず、投票先を明かすよう強制されない原則です。",
    sources: [constitutionSource],
  },
  {
    term: "直接選挙",
    definition:
      "有権者が、議員など選ぶ対象を直接投票で選ぶ方法です。",
    sources: [constitutionSource],
  },
  {
    term: "投票立会人",
    definition:
      "投票所で投票の手続に立ち会い、公正に行われているかを確認する人です。",
    sources: [electionLawSource],
  },
  {
    term: "開票立会人",
    definition:
      "開票所で開票の手続に立ち会い、公正に行われているかを確認する人です。",
    sources: [electionLawSource],
  },
  {
    term: "有効票",
    definition:
      "法律で定められた記載方法などの要件を満たし、候補者や政党などの得票として数えられる票です。",
    sources: [electionLawSource],
  },
  {
    term: "按分票",
    definition:
      "候補者名などの記載が複数の候補者に当てはまる場合に、法律で定められた方法で分けて計算される票です。",
    sources: [electionLawSource],
  },
  {
    term: "法定得票数",
    definition:
      "選挙で当選するために法律が定める最低限の得票数です。選挙の種類によって要件が異なります。",
    sources: [electionLawSource],
  },
  {
    term: "比例名簿",
    definition:
      "比例代表選挙で、政党などが候補者を届け出る名簿です。名簿の扱いは選挙の種類によって定められています。",
    sources: [electionLawSource],
  },
  {
    term: "重複立候補",
    definition:
      "同じ候補者が、衆議院議員選挙の小選挙区と比例代表の両方に立候補することです。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo04.html",
      ),
    ],
  },
  {
    term: "小選挙区比例代表並立制",
    definition:
      "衆議院議員選挙で、小選挙区選挙と比例代表選挙を別々に行い、両方の結果から議員を選ぶ制度です。",
    sources: [
      ministrySource(
        "https://www.soumu.go.jp/senkyo/senkyo_s/naruhodo/naruhodo04.html",
      ),
    ],
  },
  {
    term: "国政調査権",
    definition:
      "国会が、国の政治や行政について調査し、証人の出頭や記録の提出を求めることができる権限です。",
    sources: [constitutionSource],
  },
  {
    term: "内閣不信任決議",
    definition:
      "衆議院が、内閣を信任しない意思を示す決議です。可決された場合、内閣は一定期間内に総辞職するか衆議院を解散します。",
    sources: [constitutionSource],
  },
  {
    term: "国会召集",
    definition:
      "国会を開くために招集することです。憲法に定められた場合などに行われます。",
    sources: [constitutionSource],
  },
  {
    term: "国民投票",
    definition:
      "特定の事項について、有権者が投票によって意思を示す制度です。憲法改正の国民投票は法律で手続が定められています。",
    sources: [
      constitutionSource,
      {
        url: "https://laws.e-gov.go.jp/law/419AC0000000051",
        publisher: "e-Gov法令検索（日本国憲法の改正手続に関する法律）",
        checkedAt: glossaryCheckedAt,
      },
    ],
  },
  {
    term: "憲法改正",
    definition:
      "憲法の条文を改めることです。日本国憲法では、国会の発議と国民投票による承認が必要です。",
    sources: [constitutionSource],
  },
];

// 現職・会派・選挙区を公式資料で確認してから登録する。
export const councilMembers: CouncilMember[] = [];
