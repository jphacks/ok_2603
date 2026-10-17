# データファイルの編集と確認

登録先: `src/election/data.ts`。型定義: `src/election/model.ts`。

## 登録手順

1. 担当者が公式資料の本文を確認する。AIの推測や検索結果の要約を確認済みの根拠として登録しない。
2. 作業ブランチで選挙、候補者、必要な用語を追加する。選挙IDと候補者IDは一意にする。
3. 公式HTTPSリンク・発行元・実際に確認した日（YYYY-MM-DD）を各項目に付ける。公式サイトかどうか、引用が適切かは人が確認する。URL形式チェックは公式性を保証しない。
4. `npm run validate:data`、`npm test`、`npm run build` を実行する。
5. PRで資料と記載内容をレビューする。今後の本格的な公開承認フローを定めるものではない。

公開データは現在空配列。テスト専用の氏名・本文はtestsとUIテストに隔離され、公開ファイルには含まれない。

## 状態

- `recorded`: `value` と1件以上の `sources` が必須。5項目チェックのvalueは資料中の根拠文章を登録する。
- `unrecorded`: 未登録。valueや出典を捏造しない。
- `not-confirmed`: 確認した資料で確認できなかった。`note` に確認範囲・理由、`sources` に確認した資料を登録する。
- `no-record`: 公式資料の指定範囲に該当する記録がないことを確認した。`note` と `sources` が必須。「検索で見つからない」をこの状態にしない。

出典型: `{ url, publisher, checkedAt }`。画像も出典を付け、許諾を確認する。

選挙: `id`, `name`, `prefectureIds`（対象の都道府県名の配列）, 任意の `municipality`, `level`（national/local）, `period`（current/past）, `date`（投票日）, `sources`, `turnout`。

国政選挙も対象の都道府県を明示する。複数地域にまたがる選挙には複数を登録できる。全国投票や自治体データを自動収集・推測する機能はない。

投票率は `Entry<{ age: string; rate: number }[]>`。rateは0～100、未収録を0%で表現しない。年代や標本抽出の範囲は公式資料に合わせ、必要な説明を出典とともに登録する。

候補者: `id`, `electionId`, `name`, `party`, `photo`, `pledges`, `profile`, `speeches`, `votes`, `history`, `sources`。

候補者名を使い回して別選挙のデータを混在させない。同じ人物でも選挙ごとのレコードを明示する。比較表は選挙名も表示する。

公約: `id`, `text`, `checks`。checksのキーは型定義の5項目と一致させる。すべて未収録の場合は `emptyChecks()` を利用できる。

用語: `term`, `definition`, `sources`。最長の一致語から認識し、用語名をHTMLとして解釈しない。

管理画面は未実装。認証方式、保存先、公開承認、ファイルとの連携方式を決めてから、この型に沿った入力・検証機能を実装する。
