# 沖縄県選挙情報API

Node.js、SQLite（WASM）、公式サイトの無料クロールで構成します。Google検索、Search Groundingなどの検索APIは使用しません。沖縄県の知事・県議会議員選挙に加え、Issue #2に登録された市町村選挙ページから公式日程を収集します。

## 収集方法

Issue [#2](https://github.com/jphacks/ok_2603/issues/2) の「沖縄県・市町村の公式サイト（選挙情報の確認起点）」欄を収集起点の登録簿として読み込みます。沖縄県の既存固定ページも、Issueに登録されたURLとの完全一致を確認してから取得します。登録された自治体の公式サイトと自治体別の選挙情報ページも使用します。自治体トップページからは、同一ホスト上で選挙関連として明示されたリンクだけを1階層たどります。Issueに登録されていない外部検索結果やリンク先ホストは収集しません。URLはHTTPS、公式ドメイン形式、DNS解決後の公開IP、リダイレクト先ホストを検証し、robots.txt、サイズ上限、タイムアウトも適用します。

自治体選挙は、公式ページの見出しに自治体名と選挙種別があり、選挙期日・投票日の根拠を同じページから抽出できた場合だけ登録します。公式ページ本文の抜粋・URL・内容ハッシュ・確認日時を `sources` に保存します。候補者名簿や公約はこの日程確認だけでは作成しません。Issue #2には那覇市の「第24回那覇市長選挙」特設ページを個別の公式選挙情報ページとして登録しています。

固定起点は沖縄県公式サイトの[任期満了日と選挙執行予定日](https://www.pref.okinawa.lg.jp/kensei/senkyo/1023172/1005019.html)および[選挙に関する情報](https://www.pref.okinawa.lg.jp/kensei/senkyo/1005009/index.html)です。予定日ページから最新の予定表PDFを読み、選挙情報ページから対象年の特設ページを見つけ、そこに掲載された候補者名簿と選挙公報PDFへの公式リンクをたどります。

候補者一覧PDFの各行に掲載されたウェブサイトURLを座標で候補者と結び付けます。選挙公報PDFにも本人の公式サイトや公式Xが記載されていれば抽出候補にします。登録サイトと、そこからリンクされた同一サイト内のSNS案内ページを確認します。本人の公式サイトであることと、Xアカウントが本人の公式SNSとして案内されていることを確認できた場合だけ `x_url` と根拠ページの `x_source_url` を保存します。政党公式サイトのように候補者以外も掲載するサイトでは、その候補者本人の公式Xだと明記されたリンクだけ採用します。氏名の一致やAI抽出だけでは確定しません。アカウントを確定できなければ両フィールドはnullです。`x.com` と `twitter.com` に対応し、X APIや有料検索APIは使用しません。

HTMLとPDFは沖縄県の固定公式URL、Issue #2に登録された自治体公式ホスト、または既存の候補者公式サイト探索で許可されたホストからのみ取得します。robots.txt、HTTPS、DNS解決後のプライベートIP拒否、リダイレクト先の再検証、12MB上限、タイムアウト、条件付きGET（ETag/Last-Modified）、リクエスト間隔を適用します。取得内容のハッシュとキャッシュを保存します。候補者名簿PDFの行数と解析結果が一致したときだけ、確認済み一覧を更新します。公報は文字抽出が空でもGeminiのPDF視覚入力に渡します。失敗した場合は高解像度ページ画像に変換して同じモデルへ再送します。候補者ごとに基本情報・経歴・写真領域・政策をJSON抽出し、正式名簿との完全照合、PDFページ範囲、許可済み政策分類を検証します。掲載政策の原文・要約・出典ページを保存し、マニフェスト全文と区別してAPIで返します。

Geminiには公式SDK `@google/genai` を使い、モデルを `gemini-3.1-flash-lite` に固定します。Geminiへ検索ツールやURL取得を依頼しません。`GEMINI_API_KEY` がない場合は `gemini_api_key_missing`、キーがあっても `GEMINI_FREE_TIER_CONFIRMED=true` がなければ `free_tier_not_confirmed` を収集エラーに記録し、APIを呼びません。無料枠超過（429）時は後続のGemini処理を停止し、有料モデルや別サービスへ切り替えません。日次トークン上限は `DAILY_TOKEN_LIMIT` です。

Google公式料金表ではGemini 3.1 Flash-LiteのStandard tierに無料枠が掲載されています。ただしAPIキーから個別プロジェクトの請求・無料枠状態を判定する機能はないため、この設定は運用者がプロジェクトの状態を確認した後だけ有効にします。顔写真はPDFの該当領域をコードでPNGに切り出します。2026年知事選挙公報の現行PDFについては6人の顔写真の切り出し範囲と候補者の対応を確認済みです。別版のPDFでは再確認が必要です。

沖縄県公式サイトは写真の無断転用を許可していないため、顔写真の公開には再掲載条件の確認が必要です。`GET /api/candidates/:id/photo` は `photo_match_status=verified` かつ `photo_reuse_status=approved` の画像だけを公開します。開発中は `.env` に `PHOTO_PREVIEW_ENABLED=true` を設定すると、APIがループバックアドレスで動作し `NODE_ENV` が `production` ではない場合に限って、承認前の確認済み写真をローカルプレビューできます。候補者APIの `photo_preview` と `photo_page` で、利用画面にプレビューと出典ページを明示できます。

## 起動

1. `Copy-Item .env.example .env` を実行し、`.env` の `ADMIN_API_TOKEN` にランダムな管理者トークンを設定します。
2. Google AI StudioのプロジェクトでGemini API無料枠が使えることを確認できた場合だけ、`.env` で `GEMINI_API_KEY` を設定し `GEMINI_FREE_TIER_CONFIRMED=true` にします。確認できなければfalseのままにします。
3. ターミナル1で `npm run dev:api` を起動します。
4. ターミナル2で `npm run dev` を起動します。

`COLLECTION_ON_START=true`（設定例の値）では、自治体公式サイトの確認済みソースがまだDBにない場合に初回収集を自動開始します。`COLLECTION_SCHEDULE_ENABLED=true` を設定すると登録済みURLを定期的に再確認します。管理者は収集エンドポイントからも手動実行できます。地域選択画面は `/api/elections` を読み込み、自治体の選挙と沖縄県全域の選挙を表示します。収集が実行中の場合は完了まで一覧を再読込します。候補者情報がまだ登録されていない選挙では、公約比較へのリンクを表示しません。

Googleキーと管理者トークンはサーバー専用です。`VITE_` 接頭辞は付けません。SQLiteファイルは `data/elections.sqlite` に作られ、Gitには含まれません。

## エンドポイント

- `GET /api/elections?kind=governor&municipality=沖縄県&status=投票終了`（各選挙の確認済み `sources` と `collectionStatus` を含む）
- `GET /api/elections?municipality=那覇市`（那覇市の選挙と沖縄県全域の選挙）
- `GET /api/elections/:id`
- `GET /api/elections/:id/candidates`
  - 候補者ごとの確認済み出典と公約の原文・AI要約を含む。未確認・未収録の公約は返さない。
- `GET /api/candidates/:id`
- `GET /api/candidates/:id/photo`（再掲載承認済み、またはローカルプレビュー中の確認済み顔写真）
- `GET /api/candidates/:id/pledges`
- `GET /api/candidates/:id/sources`
- `POST /api/internal/collection/x/run`（既存候補者のXだけを再探索。管理者認証が必要。Geminiと政策データは更新しません）
- `POST /api/internal/collection/run`（`Authorization: Bearer <ADMIN_API_TOKEN>` が必要。非同期収集を開始）
- `GET /api/internal/collection/jobs/:id`（同じ管理者認証）

収集実行例（PowerShell）:

```powershell
Invoke-RestMethod -Method Post http://127.0.0.1:8787/api/internal/collection/run -Headers @{ Authorization = "Bearer $env:ADMIN_API_TOKEN" }
```

定期実行は `COLLECTION_SCHEDULE_ENABLED=true` と `COLLECTION_INTERVAL_HOURS` で有効化します。初期値は無効です。本番ではNodeサーバーをHTTPSリバースプロキシの `/api` 配下に配置します。

## 拡張方針と検証

選挙種別判定、選挙ID、地区、候補者名簿・公報の関連付けを分離しています。Issue #2に登録した公式ページから市町村長・市町村議会議員選挙の日程を収集します。候補者名簿・公報の解析は引き続き県選挙の既存フローが対象です。

`npm run test:api` はIssue URLの検証、同一ホスト制限、選挙ページ抽出、API認証、重複防止、確認済みソース、公式候補者行の検証を確認します。`npm run build` と `npm test` はフロントエンドと既存データの検証です。
