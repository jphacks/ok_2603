# ホーム画面のデザイン更新（2026-10-18）

作業ブランチ：`feat/okinawa-home-search`。ユーザー添付画像を配置・配色・余白の参考にし、操作部分をReactで実装。ホームのスタイルは `src/home.css` の `.home-shell` 内に限定し、他の画面には適用しない。

ホーム以外の最小変更は、市町村選択後の県議会議員選挙区の表示と、収録済み選挙の該当選挙区による絞り込み。41市町村と13選挙区の対応は[沖縄県議会「県議会の組織」](https://www.pref.okinawa.lg.jp/kensei/gikai/1016969/1016972.html)で確認（2026-10-18）。`Election.district` に選挙区の正式名称を登録できる。従来のデータは、選挙名中の正式選挙区名、または市町村名でも照合できる。判定根拠のない県議会議員選挙を全市町村に表示しない。

## 素材

内蔵 `image_gen` ツールで今回新規に生成。既存の写真の転載はしていない。風景は特定地点の実写記録ではなく装飾イメージ。花は透明背景の別素材。地図シルエットと花の線画は `HomeDecor.tsx` の装飾SVGであり、公式の地図・選挙区を表さない。

- `public/images/okinawa-coast.webp`：風景背景、約279KB。
- `public/images/hibiscus.webp`：花・葉の透明背景素材、約322KB。
- 生成PNG原本：`handoff.local/home-redesign/source-assets/`（Git対象外）。WebPはPNGの内容を保った形式変換。

見出し・ボタン・説明文・検索・市町村の候補・ナビゲーションは画像に焼き込まず、HTMLとして表示する。明朝体は端末内の日本語フォントを使用するため、端末により多少見え方が変わる。

## 生成に使用した最終プロンプト

### 風景

Create ONE production website background asset, not a website screenshot. Photorealistic-natural Okinawan coastal scenery, landscape aspect 3:2, high resolution. Composition inspired by the user's attached reference: blue turquoise ocean and a sweeping coastal bridge across the lower left, a distant coastal city and green hills on the horizon, rich luminous blue summer sky with soft white cumulus clouds occupying the top and left two thirds. On the right edge a traditional Okinawan red terracotta tiled roof and a low coral limestone wall with green tropical leaves, with large fresh vivid scarlet red hibiscus flowers in the lower right foreground. Elegant natural travel photography, calm and welcoming, believable sunlight. The upper left is mostly pale open sky suitable for a large navy Japanese headline overlaid in HTML. No text, no letters, no logo, no border, no UI, no map. This is an original decorative illustration of Okinawan scenery, not documentary proof of a specific location. Save the generated asset for use in the current React project.

### ハイビスカス

Create one isolated photorealistic botanical cutout asset for an Okinawan election information website. Transparent background. An elegant vivid red hibiscus blossom facing the viewer, yellow-tipped long stamen, a second small red flower and dark glossy tropical hibiscus leaves on branching stems, arranged as a vertical decorative spray along the RIGHT EDGE of a banner. Full spray contained in frame, rich natural detail and sunlight, natural believable photographic texture. Flowers fill the upper right and foliage cascades to bottom right, left half mostly transparent negative space to avoid interfering with HTML text. NO text, no logo, no UI, no shadows on a background, no backdrop, no map. Standalone asset not a website screenshot.

## 確認

`npm run build`、`npm test`（11件）、`node scripts/browser-smoke.mjs` を実行。PC（1440px）、スマートフォン（390px、320px）の表示・はみ出し・検索・全市町村展開・メニュー・知事選挙への遷移を確認。既存の候補者検索・詳細・比較・出典表示のブラウザー検証も通過。

参考画像と比較し、明朝体の2行見出し、海と赤瓦の風景、背景に重ねたネイビーの知事選挙カード、クリーム色の検索カード、地域ボタン、下部ナビを再現。スクリーンショットは `handoff.local/home-redesign/` に保存。

実在候補者・公約・選挙のデータ追加やDB接続は行っていない。
