# 買い物リスト: 保留アイテム絞り込み表示 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 買い物リスト画面に「保留を隠す/表示」ボタンを追加し、押下で保留中アイテムのみを非表示にできるようにする（データは削除しない、状態はlocalStorageに永続化）。

**Architecture:** 既存の `買い物リスト/js/app.js` は `localStorage` を単一の真実源とし、状態変更のたびに `renderList()` で全再描画する素のjQueryアプリ。今回もこのパターンを踏襲し、新しいlocalStorageキーでフィルタ状態を保持する関数を追加、`renderList()` と `reorderItems()` にフィルタを反映させ、`index.html` にトグルボタンを追加する。

**Tech Stack:** jQuery 1.11 (ES5) / localStorage / Jest + jsdom（`npm test`、リポジトリルートは `Webシステム学習/`）

## Global Constraints

- JavaScript は jQuery 1.11 / ECMAScript 5 準拠（`var`・無名関数・キャメルケース。アロー関数や `let`/`const` は使わない）
- HTML は HTML5 準拠
- 状態変更は必ず「更新 → `saveItems()`/`saveStores()`等で保存 → `renderList()` で全再描画」の流れに従う（差分更新はしない）
- 動的に追加される要素へのイベントは `#itemGroups` への委譲イベントで束ねる（既存パターンを踏襲）
- テストは `Webシステム学習/` ディレクトリで `npm test` を実行して確認する

---

## 対象ファイル

- Modify: `買い物リスト/js/app.js` — フィルタ状態管理・`renderList`/`reorderItems`修正・イベント配線
- Modify: `買い物リスト/index.html` — トグルボタン追加
- Modify: `買い物リスト/css/style.css` — トグルボタンのスタイル追加
- Modify: `tests/app.test.js` — 新規関数のテスト追加

---

### Task 1: フィルタ状態の永続化関数を追加する

**Files:**
- Modify: `買い物リスト/js/app.js:1-3`（キー定義）, `買い物リスト/js/app.js:26-27`（関数追加位置）, `買い物リスト/js/app.js:408-425`（module.exports）
- Test: `tests/app.test.js`

**Interfaces:**
- Produces: `loadFilterState()` → `boolean`（未設定時は`false`）、`saveFilterState(hideHeld: boolean)` → `void`

- [ ] **Step 1: 失敗するテストを書く**

`tests/app.test.js` の末尾（64行目の後）に追記:

```js
test("loadFilterStateは未設定時にfalseを返す", function () {
  expect(app.loadFilterState()).toBe(false);
});

test("saveFilterStateで保存した値をloadFilterStateで取得できる", function () {
  app.saveFilterState(true);
  expect(app.loadFilterState()).toBe(true);
  app.saveFilterState(false);
  expect(app.loadFilterState()).toBe(false);
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test`
Expected: FAIL — `app.loadFilterState is not a function`

- [ ] **Step 3: 最小限の実装を追加する**

`買い物リスト/js/app.js:1-3` を以下に置き換える:

```js
var STORAGE_KEY = "shoppingList";
var STORE_KEY = "shoppingStores";
var FILTER_KEY = "shoppingFilterHideHeld";
var UNASSIGNED_STORE = "";
```

`買い物リスト/js/app.js:26-27`（`saveStores`関数の直後、`addStore`関数の直前）に以下を挿入:

```js
function loadFilterState() {
  return localStorage.getItem(FILTER_KEY) === "1";
}

function saveFilterState(hideHeld) {
  localStorage.setItem(FILTER_KEY, hideHeld ? "1" : "0");
}

```

`買い物リスト/js/app.js:408-425` の `module.exports` オブジェクトに以下のエントリを追加する（`saveStores: saveStores,` の後、`addStore: addStore,` の前などに追加）:

```js
    loadFilterState: loadFilterState,
    saveFilterState: saveFilterState,
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: コミットする**

```bash
git add 買い物リスト/js/app.js tests/app.test.js
git commit -m "feat: 保留絞り込み状態の永続化関数を追加"
```

---

### Task 2: `renderList` にフィルタ表示ロジックを組み込む

**Files:**
- Modify: `買い物リスト/js/app.js:66-168`（`renderList`関数）, `買い物リスト/js/app.js:408-425`（module.exports）
- Test: `tests/app.test.js`

**Interfaces:**
- Consumes: `loadFilterState()`（Task 1で追加）
- Produces: `renderList(items)` を `module.exports` 経由でテストから呼べるようにする（既存のシグネチャは変更しない）

- [ ] **Step 1: 失敗するテストを書く**

`tests/app.test.js` の末尾に追記:

```js
test("renderListはフィルタONのとき保留アイテムを描画しない", function () {
  document.body.innerHTML = '<div id="itemGroups"></div><p id="remainingCount"></p>';
  app.addItem("卵", "1");
  var id = app.loadItems()[0].id;
  app.toggleHeld(id);

  app.saveFilterState(false);
  app.renderList(app.loadItems());
  expect($("li[data-id='" + id + "']").length).toBe(1);

  app.saveFilterState(true);
  app.renderList(app.loadItems());
  expect($("li[data-id='" + id + "']").length).toBe(0);
});

test("renderListの件数表示はフィルタ状態に関わらず全件ベースで集計する", function () {
  document.body.innerHTML = '<div id="itemGroups"></div><p id="remainingCount"></p>';
  app.addItem("卵", "1");
  var id = app.loadItems()[0].id;
  app.toggleHeld(id);

  app.saveFilterState(true);
  app.renderList(app.loadItems());
  expect($("#remainingCount").text()).toContain("保留: 1件");
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test`
Expected: FAIL — `app.renderList is not a function`（`renderList`未export、かつフィルタ未反映）

- [ ] **Step 3: 最小限の実装を追加する**

`買い物リスト/js/app.js:66-67` の関数冒頭を以下に置き換える:

```js
function renderList(items) {
  var $groups = $("#itemGroups");
  $groups.empty();
  var hideHeld = loadFilterState();
```

`買い物リスト/js/app.js:105-109` 付近のアイテムループ内、既存の

```js
    for (i = 0; i < items.length; i++) {
      var item = items[i];
      if ((item.store || UNASSIGNED_STORE) !== storeName) {
        continue;
      }
```

を以下に置き換える（`held`かつフィルタONならスキップする行を追加）:

```js
    for (i = 0; i < items.length; i++) {
      var item = items[i];
      if ((item.store || UNASSIGNED_STORE) !== storeName) {
        continue;
      }
      if (item.held && hideHeld) {
        continue;
      }
```

`買い物リスト/js/app.js:408-425` の `module.exports` に以下を追加（`clearAllItems: clearAllItems,` の後などに追加）:

```js
    renderList: renderList,
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: コミットする**

```bash
git add 買い物リスト/js/app.js tests/app.test.js
git commit -m "feat: renderListで保留アイテムの絞り込み表示に対応"
```

---

### Task 3: `reorderItems` が非表示中の保留アイテムを消さないようにする

**Files:**
- Modify: `買い物リスト/js/app.js:238-259`（`reorderItems`関数）
- Test: `tests/app.test.js`

**Interfaces:**
- Consumes: `loadFilterState()`（Task 1）, `renderList()`（Task 2、DOM構築用）
- Produces: `reorderItems()` の既存シグネチャは変わらない（挙動のみ修正）

- [ ] **Step 1: 失敗するテストを書く**

`tests/app.test.js` の末尾に追記:

```js
test("reorderItemsはフィルタで非表示中の保留アイテムを消さない", function () {
  document.body.innerHTML = '<div id="itemGroups"></div><p id="remainingCount"></p>';
  app.addItem("卵", "1");
  var id = app.loadItems()[0].id;
  app.toggleHeld(id);

  app.saveFilterState(true);
  app.renderList(app.loadItems());
  expect($("li[data-id='" + id + "']").length).toBe(0);

  app.reorderItems();

  var items = app.loadItems();
  expect(items.length).toBe(1);
  expect(items[0].id).toBe(id);
  expect(items[0].held).toBe(true);
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test`
Expected: FAIL — `items.length` が `0`（保留アイテムが消える）

- [ ] **Step 3: 最小限の実装を追加する**

`買い物リスト/js/app.js` 内の既存の `reorderItems` 関数（元は238-259行目付近、以下の内容）を探して置き換える。置き換え対象の元コード:

```js
function reorderItems() {
  var items = loadItems();
  var itemsById = {};
  var i;
  for (i = 0; i < items.length; i++) {
    itemsById[items[i].id] = items[i];
  }

  var newOrder = [];
  $(".storeItemList").each(function () {
    var store = $(this).attr("data-store");
    $(this).find("li").each(function () {
      var id = Number($(this).attr("data-id"));
      var item = itemsById[id];
      if (item) {
        item.store = store;
        newOrder.push(item);
      }
    });
  });
  saveItems(newOrder);
}
```

置き換え後のコード:

```js
function reorderItems() {
  var items = loadItems();
  var itemsById = {};
  var i;
  for (i = 0; i < items.length; i++) {
    itemsById[items[i].id] = items[i];
  }

  var includedIds = {};
  var newOrder = [];
  var storeOrder = [];
  $(".storeItemList").each(function () {
    var store = $(this).attr("data-store");
    storeOrder.push(store);
    $(this).find("li").each(function () {
      var id = Number($(this).attr("data-id"));
      var item = itemsById[id];
      if (item) {
        item.store = store;
        newOrder.push(item);
        includedIds[id] = true;
      }
    });
  });

  if (loadFilterState()) {
    for (var s = 0; s < storeOrder.length; s++) {
      var store = storeOrder[s];
      for (i = 0; i < items.length; i++) {
        var item = items[i];
        if (item.held && !includedIds[item.id] && (item.store || UNASSIGNED_STORE) === store) {
          newOrder.push(item);
          includedIds[item.id] = true;
        }
      }
    }
  }

  saveItems(newOrder);
}
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: コミットする**

```bash
git add 買い物リスト/js/app.js tests/app.test.js
git commit -m "fix: フィルタ非表示中の保留アイテムがreorderItemsで消えないようにする"
```

---

### Task 4: フィルタのトグル操作関数とボタン文言更新関数を追加する

**Files:**
- Modify: `買い物リスト/js/app.js:271-272`（`reorderStores`関数の後に追加）, `買い物リスト/js/app.js:408-425`（module.exports）
- Test: `tests/app.test.js`

**Interfaces:**
- Consumes: `loadFilterState()` / `saveFilterState()`（Task 1）, `renderList()` / `loadItems()`（既存・Task 2）
- Produces: `toggleHeldFilter()` → `boolean`（トグル後の`hideHeld`状態を返す）、`updateToggleButtonLabel(hideHeld: boolean)` → `void`（`#toggleHeldButton`のテキストを更新）

- [ ] **Step 1: 失敗するテストを書く**

`tests/app.test.js` の末尾に追記:

```js
test("toggleHeldFilterは状態を反転して保存し再描画する", function () {
  document.body.innerHTML = '<div id="itemGroups"></div><p id="remainingCount"></p>';
  expect(app.loadFilterState()).toBe(false);

  var result1 = app.toggleHeldFilter();
  expect(result1).toBe(true);
  expect(app.loadFilterState()).toBe(true);

  var result2 = app.toggleHeldFilter();
  expect(result2).toBe(false);
  expect(app.loadFilterState()).toBe(false);
});

test("updateToggleButtonLabelはフィルタ状態に応じてボタン文言を切り替える", function () {
  document.body.innerHTML = '<button type="button" id="toggleHeldButton"></button>';
  app.updateToggleButtonLabel(false);
  expect($("#toggleHeldButton").text()).toBe("保留を隠す");

  app.updateToggleButtonLabel(true);
  expect($("#toggleHeldButton").text()).toBe("保留を表示");
});
```

- [ ] **Step 2: テストを実行して失敗を確認する**

Run: `npm test`
Expected: FAIL — `app.toggleHeldFilter is not a function`

- [ ] **Step 3: 最小限の実装を追加する**

`買い物リスト/js/app.js:271-272`（`reorderStores`関数の直後、`increaseQuantity`関数の直前）に以下を挿入:

```js
function toggleHeldFilter() {
  var hideHeld = !loadFilterState();
  saveFilterState(hideHeld);
  renderList(loadItems());
  return hideHeld;
}

function updateToggleButtonLabel(hideHeld) {
  $("#toggleHeldButton").text(hideHeld ? "保留を表示" : "保留を隠す");
}

```

`買い物リスト/js/app.js:408-425` の `module.exports` に以下を追加:

```js
    toggleHeldFilter: toggleHeldFilter,
    updateToggleButtonLabel: updateToggleButtonLabel,
```

- [ ] **Step 4: テストを実行して成功を確認する**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: コミットする**

```bash
git add 買い物リスト/js/app.js tests/app.test.js
git commit -m "feat: 保留絞り込みのトグル関数とボタン文言更新関数を追加"
```

---

### Task 5: UIにボタンを追加しイベント配線する（ブラウザ手動確認）

**Files:**
- Modify: `買い物リスト/index.html:12`
- Modify: `買い物リスト/css/style.css`（末尾に追加）
- Modify: `買い物リスト/js/app.js:319-330`（`$(document).ready` 内）

**Interfaces:**
- Consumes: `toggleHeldFilter()` / `updateToggleButtonLabel()` / `loadFilterState()`（Task 1・4）

このタスクはDOMのイベント配線のみで、既存のクリックハンドラ群と同様に自動テスト対象外（既存パターンに合わせる）。ステップ末尾でブラウザによる手動確認を行う。

- [ ] **Step 1: ボタンをHTMLに追加する**

`買い物リスト/index.html:12` を以下に置き換える:

```html
  <p id="remainingCount"></p>
  <button type="button" id="toggleHeldButton">保留を隠す</button>
```

- [ ] **Step 2: ボタンのスタイルを追加する**

`買い物リスト/css/style.css` の末尾に追記:

```css
#toggleHeldButton {
  display: block;
  margin: 0 auto 16px;
  padding: 6px 14px;
  font-size: 0.85rem;
  color: #4a90d9;
  background-color: #fff;
  border: 1px solid #4a90d9;
  border-radius: 8px;
  cursor: pointer;
}

#toggleHeldButton:active {
  background-color: #eaf2fb;
}
```

- [ ] **Step 3: イベントハンドラと初期化処理を追加する**

`買い物リスト/js/app.js:319-321` の

```js
$(document).ready(function () {
  renderList(loadItems());
```

を以下に置き換える:

```js
$(document).ready(function () {
  renderList(loadItems());
  updateToggleButtonLabel(loadFilterState());
```

`買い物リスト/js/app.js` の `$("#clearAllButton").on("click", ...)`（401-405行目付近）の直前に以下を挿入:

```js
  $("#toggleHeldButton").on("click", function () {
    var hideHeld = toggleHeldFilter();
    updateToggleButtonLabel(hideHeld);
  });

```

- [ ] **Step 4: 自動テストを実行し、既存テストを含め全て通ることを確認する**

Run: `npm test`
Expected: PASS（全テストグリーン）

- [ ] **Step 5: ブラウザで手動確認する**

`買い物リスト/index.html` をブラウザで開き、以下を確認する:
1. アイテムを追加し、いずれかを「保留」にする
2. 「保留を隠す」ボタンを押すと保留中のアイテムが非表示になり、ボタン文言が「保留を表示」に変わる
3. ページをリロードしてもフィルタ状態（非表示のまま）が維持される
4. 「保留を表示」ボタンを押すと保留中のアイテムが再表示され、文言が「保留を隠す」に戻る
5. フィルタONの状態でアイテムをドラッグ&ドロップして並び替えても、非表示だった保留アイテムが消えず、フィルタを解除すると残っていることを確認する

- [ ] **Step 6: コミットする**

```bash
git add 買い物リスト/index.html 買い物リスト/css/style.css 買い物リスト/js/app.js
git commit -m "feat: 保留絞り込みボタンをUIに追加"
```
