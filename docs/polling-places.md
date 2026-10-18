# Supabase 投票所管理

## 調査結果と構成

- 画面はReact 18 / TypeScript / Vite。`src/` の既存ナビに「投票所を探す」を追加。
- `server/` はNode.js APIとSQLite。既存の選挙・候補者・公約データを継続利用する。
- 既存 `elections.id` は文字列。Supabaseにも同じIDを同期する。
- 市町村テーブルはなかった。既存41市町村リストを `shared/municipalities.json` に共通化し、市町村名を文字列IDとして利用する。
- Supabase接続、管理画面、Supabase Auth連携、地図は未実装だった。既存収集APIの `ADMIN_API_TOKEN` 認証を管理画面にも再利用する。地図は[Leaflet](https://leafletjs.com/reference)とOpenStreetMap標準タイルを採用。
- この作業環境にはSupabaseの接続設定がないため、クラウドへのSQL適用・データ投入は未実行。

## データベース

`supabase/migrations/202610180001_polling_places.sql` に定義する。

| テーブル | 役割 |
| --- | --- |
| `municipalities` | 市町村カタログ。文字列ID |
| `elections` | 既存APIから同期する選挙カタログ。文字列ID、名称、対象市町村、投票日、公式URL |
| `polling_places` | 施設マスタ。UUID、住所、座標、バリアフリー、備考 |
| `election_polling_places` | 選挙・施設・種別。UUID、運用状態、公開設定、出典、確認日時 |
| `polling_place_schedules` | 選挙別設定ごとの期間と時刻。UUID |
| `polling_districts` | 市町村内の投票区番号・名称。UUID |
| `election_polling_districts` | 選挙・投票区に対する当日投票所。UUID |

SQLiteとPostgreSQLをまたぐ外部キーは作れないため、Supabaseの `elections` は投票所の参照に必要なカタログ項目を保持する。管理画面の「既存APIから選挙・市町村を同期」で、確認済みの出典を持つ選挙を同じIDでUPSERTする。同期は手動で、過去の選挙を削除しない。既存SQLiteの選挙・候補者・公約は保持される。静的な候補者画面と収集APIの接続は従来どおり別の実装範囲。

県全域の選挙は `elections.municipality = NULL` の1件として扱い、施設の市町村で絞り込む。市町村の選挙は `elections.municipality` に市町村マスタと同じ名称を持ち、異なる市町村の施設登録をDBで拒否する。

DBで整合性を強制するため、関連テーブルに `municipality_id`、指定先に `voting_type` を追加している。選挙ID・市町村・当日種別を含む複合外部キーにより、参照先の編集後も整合性を保つ。同じ選挙・投票区の割り当てはUNIQUE制約で1件に制限する。

日時は `timestamptz`、期間・時刻は日本時間の `date` / `time`。開始日≦終了日、開始時間＜終了時間、期間重複なし、期日前は投票日前まで、当日は投票日のみ。公開には公式HTTPS URL・確認日時・1件以上の期間が必要。施設・設定の更新日時は自動更新。

`save_polling_configuration` RPCで設定・期間・投票区割り当てを1トランザクションで保存する。失敗時は全変更をロールバックする。管理操作はアドバイザリロックで直列化し、選挙日の変更と期間登録などの競合を防ぐ。管理者の同時書き込みは少数を想定する。

## 認証と公開

ブラウザー → 同一オリジンのNode.js API → Supabase REST APIの経路を使う。

- 公開APIは `SUPABASE_ANON_KEY` を使用。RLSにより `is_published = true AND status = 'active'` の設定と、その施設・期間・投票区のみを返す。
- `anon` / `authenticated` はSELECTのみ。書き込みと保存RPCの実行は拒否する。
- 管理APIは全経路で既存 `ADMIN_API_TOKEN` を確認してから `SUPABASE_SERVICE_ROLE_KEY` を使う。誤トークンの要求はSupabaseに到達しない。
- service roleはRLSを迂回する特権なので、サーバー内でだけ使用する。[Supabase公式資料](https://supabase.com/docs/guides/database/postgres/row-level-security)を参照。
- フロントエンドにSupabaseキーは渡さない。環境変数に `VITE_` を付けない。管理者トークンは管理画面のメモリーにだけ保持し、ログアウト・画面移動・再読み込みで破棄する。
- Supabase Authの登録・ロール設定は不要。個人単位の管理者権限・監査ログは未実装。

終了日を理由に情報を削除・非表示にしない。現在と過去3回を含む全履歴を保持できる。施設マスタの編集は過去の表示にも反映されるため、別施設への移転は新施設を登録する。参照中の施設は削除不可。選挙別設定の削除では期間・割り当てを連動削除する。履歴を残す場合は非公開／中止で管理する。

## Supabaseのセットアップ（手動）

1. 対象プロジェクトのSQL Editorで、既存テーブルを確認する。

```sql
select table_name, column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name in ('elections', 'municipalities', 'polling_places', 'election_polling_places',
                    'polling_place_schedules', 'polling_districts', 'election_polling_districts')
order by table_name, ordinal_position;
```

2. 未設定のプロジェクトでは `supabase/migrations/202610180001_polling_places.sql` の全文をSQL Editorで一度実行する。既存の `elections` / `municipalities` は同名で再作成しない。ただし今回のカタログとカラム・型が一致することが必要。IDがUUID等なら既存型に合わせて外部キー・同期処理を調整してから適用する。既存RLSポリシー・トリガー・データも確認する。適合しないスキーマは自動変換しない。投票所5テーブルは新規追加を想定し、同名テーブルがあればトランザクションが失敗する。
3. Project Settings → APIでURL、公開キー（publishable / legacy anon）、サーバー専用キー（secret / legacy service_role）を取得し、Node.jsサーバーの `.env` に設定する。
4. Data APIに `public` スキーマを公開し、全7テーブルのRLS有効化を確認する。Realtimeは不要。

```dotenv
ADMIN_API_TOKEN=<既存の管理者トークン>
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<publishableまたはanonキー>
SUPABASE_SERVICE_ROLE_KEY=<secretまたはservice_roleキー>
```

初回だけ `.env.example` を `.env` にコピーする。既存 `.env` がある場合は上書きせず追記する。新形式のAPIキーを使う場合も環境変数名は上記のままでよい。

```sh
npm ci
npm run dev:api
```

別ターミナルで:

```sh
npm run dev
```

「投票所を探す」→「投票所管理（管理者用）」で管理者トークンを入力し、「既存APIから選挙・市町村を同期」を実行する。選挙が未収録の場合は[既存収集API](election-api.md)で公式情報を収集・確認してから同期する。

施設と投票区を登録し、選挙別設定に期間・公式URL・確認日時を入力して公開する。投票所の推測登録・実データの初期投入は行わない。住所からの自動ジオコーディングは未実装。

本番ではNode.js APIも配置し、同一オリジンの `/api` をAPIへ転送する。管理者トークンの送信はHTTPSを使う。Viteの開発プロキシは本番ビルドに含まれない。

## 画面

- 利用者: 選挙・市町村・期日前／当日で検索。期日前は一覧・地図、当日は投票区選択後に指定施設を表示。期間・時間・住所・確認日時・バリアフリー情報・公式URL・経路リンクを表示。
- 当日の入場券確認を案内する。距離による投票資格の推測はしない。
- 地図: 緯度経度でマーカーを表示し、選択で名称・住所・期間・時間を表示。OpenStreetMapへのタイル通信が発生する。タイルが使えなくても文字情報・経路リンクは参照可能。
- 管理者: 施設・投票区・選挙別設定の新規登録・編集・削除、複数期間、投票区の複数割り当て、公開／非公開、有効／中止を管理。
- 未設定・通信エラー・未収録を明示し、架空の施設を代わりに表示しない。

## 検証コマンドと適用範囲

```sh
npm test
npm run test:api
npm run test:polling
npm run test:polling:db
npm run build
```

`test:polling:db` は一時PostgreSQLクラスタにマイグレーションを実際に適用し、管理CRUD・RLS・外部キー・公開条件・日程・過去3回の保持を確認する。既存DB／Supabaseには接続しない。PostgreSQL 16の `initdb` / `pg_ctl` / `psql` が必要。Windowsの既定は `C:/Program Files/PostgreSQL/16/bin`、別の場所は `PG_BIN` を指定する。データはすべて架空で、テスト後にロールバックしクラスタを削除する。

開発サーバーを起動してから、PowerShellで:

```powershell
$env:TEST_ORIGIN = 'http://localhost:5173'
node scripts/browser-smoke.mjs
npm run test:polling:ui
```

Headless Edge/Chromeで操作する。`TEST_BROWSER` / `TEST_ORIGIN` で実行ファイル・接続先を指定可能。投票所UIテストはブラウザー内のモックAPIを使用し、クラウド保存確認とは区別する。モバイル幅、マーカー・ポップアップ、管理CRUD、種別切替、指定投票所、ログアウトを確認し、スクリーンショットをOS一時ディレクトリへ出力する。

実SupabaseのData API接続・管理操作・公開閲覧と、公式データの正確性は接続設定・マイグレーション適用後に確認が必要。

2026-10-18 のローカル検証結果: 既存モデル7件、既存API4件、投票所検証7件が成功。PostgreSQL 16で39件の正常系・拒否系の検証が成功し、マイグレーションを適用できた。既存UIと投票所UIのブラウザーテスト、本番ビルドも成功。OpenStreetMapタイルの取得、マーカーとポップアップ、施設・投票区・設定の管理操作と当日投票区の割り当てを確認した。クラウドSupabaseでの動作確認は未実施。

## 主な追加・変更ファイル

- `supabase/migrations/202610180001_polling_places.sql`: スキーマ、RLS、制約、トリガー、保存RPC
- `server/polling-api.mjs`, `server/polling-validation.mjs`, `server/admin-auth.mjs`: API、入力検証、認証
- `src/polling/`: 検索、管理画面、地図、型、スタイル
- `shared/municipalities.json`: 既存市町村リストの共用
- `tests/polling.test.mjs`, `tests/polling-db.sql`, `tests/fixtures/polling-browser.js`: 検証と架空データ
- `scripts/test-polling-db.mjs`, `scripts/polling-browser-smoke.mjs`, `scripts/browser-test-support.mjs`: 検証実行用
- `src/App.tsx`, `server/index.mjs`, `src/election/model.ts`, `.env.example`, `package.json`, `package-lock.json`, `README.md`: 既存アプリとの接続・説明
- `scripts/load-typescript.mjs`: 共通JSONを既存のデータ検証・テストで読むための対応
- `tests/election-api.test.mjs`: 外部通信に依存しない収集失敗・データ保持テスト
