var app = require("../買い物リスト/js/app.js");

beforeEach(function () {
  localStorage.clear();
});

test("addItemは前後の空白を除去して追加する", function () {
  app.addItem("  牛乳  ", "2");
  var items = app.loadItems();
  expect(items.length).toBe(1);
  expect(items[0].name).toBe("牛乳");
  expect(items[0].quantity).toBe(2);
});

test("addItemは空文字を追加しない", function () {
  app.addItem("   ", "1");
  expect(app.loadItems().length).toBe(0);
});

test("addItemは数量が不正なら1にする", function () {
  app.addItem("パン", "abc");
  expect(app.loadItems()[0].quantity).toBe(1);
});

test("toggleHeldで保留にすると購入は自動解除される", function () {
  app.addItem("卵", "1");
  var id = app.loadItems()[0].id;
  app.toggleItem(id);
  expect(app.loadItems()[0].purchased).toBe(true);

  app.toggleHeld(id);
  var item = app.loadItems()[0];
  expect(item.held).toBe(true);
  expect(item.purchased).toBe(false);
});

test("decreaseQuantityで数量1のときに押すと削除される", function () {
  app.addItem("水", "1");
  var id = app.loadItems()[0].id;
  app.decreaseQuantity(id);
  expect(app.loadItems().length).toBe(0);
});

test("deleteStoreで店舗を消すと商品は未設定に戻る", function () {
  app.addStore("スーパー");
  app.addItem("牛乳", "1");

  var items = app.loadItems();
  items[0].store = "スーパー";
  app.saveItems(items);

  app.deleteStore("スーパー");

  expect(app.loadStores()).toEqual([]);
  expect(app.loadItems()[0].store).toBe("");
});

test("clearAllItemsで商品と店舗が両方消える", function () {
  app.addStore("ドラッグストア");
  app.addItem("シャンプー", "1");
  app.clearAllItems();
  expect(app.loadItems()).toEqual([]);
  expect(app.loadStores()).toEqual([]);
});

test("loadFilterStateは未設定時にfalseを返す", function () {
  expect(app.loadFilterState()).toBe(false);
});

test("saveFilterStateで保存した値をloadFilterStateで取得できる", function () {
  app.saveFilterState(true);
  expect(app.loadFilterState()).toBe(true);
  app.saveFilterState(false);
  expect(app.loadFilterState()).toBe(false);
});
