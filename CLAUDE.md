# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## このフォルダの性質

ルートの`Claude学習/`でClaude Codeの基本操作を学んだ後、実際に小さなWebシステムを1本、要件整理からブラウザ確認まで通しで作ってみるための実践用フォルダ。`要件整理（`/grill-me`）→ Planモード → UI作成 → プログラム作成 → ブラウザ確認`という流れは`買い物リスト/`で1周体験済み。今後、別の題材を作る場合も同じ流れで新しいサブフォルダを切って進める想定（`学習ロードマップ.md`参照）。ビルド・lint・テストの仕組みは存在しない。

## 実行方法

ビルド不要。各アプリの`index.html`をブラウザで直接開くだけで動く（`file://`で完結）。

- `買い物リスト/index.html`をダブルクリック、またはWindowsなら以下で起動可能:
  ```
  start "Webシステム学習/買い物リスト/index.html"
  ```
- スマートフォン実機で試す場合はPCとスマホを同じWi-Fiに繋いだ上で、このフォルダ内で簡易HTTPサーバー（例: `python -m http.server`）を起動し、スマホから`http://<PCのIPアドレス>:<ポート>/買い物リスト/`にアクセスする

## アーキテクチャ（買い物リスト）

`買い物リスト/`は素のjQuery 1.11 + localStorageのみで完結する単一画面アプリ。

```
買い物リスト/
  index.html      画面構造。jQuery(CDN)→js/app.js の順で読み込み
  css/style.css   モバイル優先レイアウト。.purchased クラスで取り消し線表示
  js/app.js       状態管理・DOM描画・イベント処理
```

- **データの単一の真実源はlocalStorage**（キー: `shoppingList`）。`{ id, name, purchased }`の配列をJSON文字列で保持する
- `loadItems()` / `saveItems()`でlocalStorageを読み書きし、追加・チェック切替・削除のどの操作でも必ず`renderList()`で`#itemList`全体を再描画する（差分更新はしない）。状態変更ロジックを追加する際もこの「更新→保存→全再描画」の流れに合わせる
- リスト項目（チェックボックス・削除ボタン）は動的に追加されるため、クリックイベントは`#itemList`への委譲イベント（`$("#itemList").on("click", ".purchaseCheckbox", ...)`）で束ねている。項目に新しい操作を足す場合もこの委譲パターンを踏襲する
- 他アプリとの家族間共有やサーバー連携は行わない（Step1の要件で意図的にスコープ外とした）。共有が必要になった場合は既存の`買い物リスト/`を拡張するのではなく、別題材として扱う

## コーディング規約

`~/.claude/CLAUDE.md`のグローバル規約を継承する。

- JavaScript: jQuery 1.11 / ECMAScript 5準拠（`var`、無名関数、キャメルケース。アロー関数や`let`/`const`は使わない）
- HTML: HTML5準拠
