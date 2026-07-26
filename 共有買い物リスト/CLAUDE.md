# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## このフォルダの性質

`買い物リスト/`（localStorage完結）とは別の題材として作った、サーバー連携版の買い物リスト。`Webシステム学習/CLAUDE.md`の方針（「共有が必要になった場合は既存を拡張せず別題材として扱う」）に従い、独立したNode.jsプロジェクトとして構成している。要件整理の経緯は`ロードマップ.md`を参照。

## 実行方法

初回のみ:
```
cd 共有買い物リスト
npm install
```

起動:
```
node server.js
```
（または `npm start`）

停止: `Ctrl+C`

- PCブラウザ: `http://localhost:3000/`
- スマホ実機（同一Wi-Fi）: `ipconfig`で確認したPCのIPv4アドレスを使い `http://<PCのIPアドレス>:3000/`
- ポート番号を変えたい場合は環境変数`PORT`で指定（例: PowerShellなら`$env:PORT=8080; node server.js`）

## アーキテクチャ

```
server.js       Express本体。/api/items 系のAPIと public/ の静的配信
data/items.json 永続化データ（サーバー初回起動時に自動生成、[]で初期化。gitには含めない）
public/         買い物リスト/ のHTML/CSS/JSを土台にした簡略版フロントエンド
```

- データの単一の真実源は`data/items.json`。`{ id, name, purchased }`の配列をJSON文字列で保持する
- サーバー側は`fs.readFileSync`/`writeFileSync`による同期I/Oで読み書きする（`readItems()`/`writeItems()`）。家族内・低頻度アクセスの前提のため、非同期キューやDBは導入しない
- フロントエンドは`loadItems()`（起動時のGET）、追加/チェック切替/削除それぞれの`$.ajax`呼び出しで通信し、応答の`items`配列で`renderList()`を呼び直す「サーバー応答→全再描画」の流れに統一する
- リスト項目（チェックボックス・削除ボタン）は動的に追加されるため、クリックイベントは`#itemList`への委譲イベント（`$("#itemList").on("click", ".purchaseCheckbox", ...)`）で束ねている

## コーディング規約（重要・独自ルール）

`~/.claude/CLAUDE.md`のグローバル規約を継承しつつ、このプロジェクトでは**サーバー側コード（server.js）もECMAScript5準拠**とする独自ルールを追加する。

- JavaScript（フロント・サーバー共通）: `var`宣言、無名関数`function(){}`のみを使い、キャメルケースで統一する。アロー関数や`let`/`const`は使わない
- HTML: HTML5準拠

## 前提条件・セキュリティ

- 認証なし。URLを知っていれば誰でも読み書きできる
- 自宅Wi-Fi内のみでの利用を前提とする。インターネットへの公開・ポート開放は行わない
- データはJSONファイル（`data/items.json`）に保存する。DBは使わない
- 常時起動はしない。使うときに手動で起動し、使い終わったら`Ctrl+C`で止める

## 機能範囲

追加・チェック（購入済み切替）・削除の3操作のみ。店舗グルーピング・数量・保留・編集・ドラッグ&ドロップ・件数表示は対象外（詳細は`ロードマップ.md`の発展課題を参照）。

## CI

対象外。ルートの`.github/workflows/ci.yml`はこのプロジェクトを対象にしない。
