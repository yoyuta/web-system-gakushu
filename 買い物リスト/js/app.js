var STORAGE_KEY = "shoppingList";
var STORE_KEY = "shoppingStores";
var UNASSIGNED_STORE = "";

function loadItems() {
  var raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }
  return JSON.parse(raw);
}

function saveItems(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function loadStores() {
  var raw = localStorage.getItem(STORE_KEY);
  if (!raw) {
    return [];
  }
  return JSON.parse(raw);
}

function saveStores(stores) {
  localStorage.setItem(STORE_KEY, JSON.stringify(stores));
}

function addStore(name) {
  var trimmedName = name.replace(/^\s+|\s+$/g, "");
  if (trimmedName === "") {
    return;
  }

  var stores = loadStores();
  for (var i = 0; i < stores.length; i++) {
    if (stores[i] === trimmedName) {
      return;
    }
  }
  stores.push(trimmedName);
  saveStores(stores);
  renderList(loadItems());
}

function deleteStore(storeName) {
  var stores = loadStores();
  var newStores = [];
  for (var i = 0; i < stores.length; i++) {
    if (stores[i] !== storeName) {
      newStores.push(stores[i]);
    }
  }
  saveStores(newStores);

  var items = loadItems();
  for (var j = 0; j < items.length; j++) {
    if (items[j].store === storeName) {
      items[j].store = UNASSIGNED_STORE;
    }
  }
  saveItems(items);
  renderList(items);
}

function renderList(items) {
  var $groups = $("#itemGroups");
  $groups.empty();

  var purchasedCount = 0;
  var heldCount = 0;
  var remainingCount = 0;
  var i;
  for (i = 0; i < items.length; i++) {
    if (items[i].purchased) {
      purchasedCount++;
    } else if (items[i].held) {
      heldCount++;
    } else {
      remainingCount++;
    }
  }
  $("#remainingCount").text("購入: " + purchasedCount + "件　未購入: " + remainingCount + "件　保留: " + heldCount + "件");

  var stores = loadStores();
  var storeNames = stores.concat([UNASSIGNED_STORE]);

  for (var s = 0; s < storeNames.length; s++) {
    var storeName = storeNames[s];
    var $storeHeaderText = $("<span></span>").addClass("storeHeaderText")
      .text(storeName === UNASSIGNED_STORE ? "未設定" : storeName);
    var $header = $("<div></div>").addClass("storeHeader");
    if (storeName !== UNASSIGNED_STORE) {
      var $storeDragHandle = $("<span></span>").addClass("storeDragHandle").text("⠿");
      $header.append($storeDragHandle);
    }
    $header.append($storeHeaderText);
    if (storeName !== UNASSIGNED_STORE) {
      var $deleteStoreButton = $("<button></button>").attr("type", "button")
        .addClass("deleteStoreButton").attr("data-store", storeName).text("×");
      $header.append($deleteStoreButton);
    }
    var $itemUl = $("<ul></ul>").addClass("storeItemList").attr("data-store", storeName);

    for (i = 0; i < items.length; i++) {
      var item = items[i];
      if ((item.store || UNASSIGNED_STORE) !== storeName) {
        continue;
      }

      var $li = $("<li></li>").attr("data-id", item.id);
      if (item.purchased) {
        $li.addClass("purchased");
      }
      if (item.held) {
        $li.addClass("held");
      }

      var $dragHandle = $("<span></span>").addClass("dragHandle").text("⠿");

      var $checkbox = $("<input>").attr("type", "checkbox").addClass("purchaseCheckbox");
      if (item.purchased) {
        $checkbox.prop("checked", true);
      }
      if (item.held) {
        $checkbox.prop("disabled", true);
      }

      var $name = $("<span></span>").addClass("itemName").text(item.name);

      var $decreaseButton = $("<button></button>").attr("type", "button").addClass("decreaseButton").text("－");
      var $quantity = $("<span></span>").addClass("itemQuantity").text(item.quantity || 1);
      var $increaseButton = $("<button></button>").attr("type", "button").addClass("increaseButton").text("＋");
      if (item.held) {
        $decreaseButton.prop("disabled", true);
        $increaseButton.prop("disabled", true);
      }
      var $quantityControls = $("<span></span>").addClass("quantityControls")
        .append($decreaseButton).append($quantity).append($increaseButton);

      var $holdButton = $("<button></button>").attr("type", "button").addClass("holdButton").text(item.held ? "解除" : "保留");
      var $editButton = $("<button></button>").attr("type", "button").addClass("editButton").text("✎");
      var $deleteButton = $("<button></button>").attr("type", "button").addClass("deleteButton").text("×");

      var $itemButtons = $("<div></div>").addClass("itemButtons")
        .append($holdButton).append($editButton).append($deleteButton);

      var $itemMain = $("<div></div>").addClass("itemMain")
        .append($checkbox).append($name).append($quantityControls).append($itemButtons);

      $li.append($dragHandle).append($itemMain);
      $itemUl.append($li);
    }

    var $group = $("<div></div>").addClass("storeGroup").attr("data-store", storeName)
      .append($header).append($itemUl);
    $groups.append($group);

    Sortable.create($itemUl.get(0), {
      group: "storeItems",
      handle: ".dragHandle",
      animation: 150,
      onEnd: function () {
        reorderItems();
      }
    });
  }
}

function addItem(name, quantity) {
  var trimmedName = name.replace(/^\s+|\s+$/g, "");
  if (trimmedName === "") {
    return;
  }

  var parsedQuantity = parseInt(quantity, 10);
  if (isNaN(parsedQuantity) || parsedQuantity < 1) {
    parsedQuantity = 1;
  }

  var items = loadItems();
  items.push({
    id: Date.now(),
    name: trimmedName,
    quantity: parsedQuantity,
    purchased: false,
    store: UNASSIGNED_STORE
  });
  saveItems(items);
  renderList(items);
}

function editItemName(id) {
  var items = loadItems();
  for (var i = 0; i < items.length; i++) {
    if (items[i].id === id) {
      var newName = window.prompt("アイテム名を編集", items[i].name);
      if (newName === null) {
        return;
      }
      var trimmedName = newName.replace(/^\s+|\s+$/g, "");
      if (trimmedName === "") {
        return;
      }
      items[i].name = trimmedName;
      break;
    }
  }
  saveItems(items);
  renderList(items);
}

function toggleItem(id) {
  var items = loadItems();
  for (var i = 0; i < items.length; i++) {
    if (items[i].id === id) {
      items[i].purchased = !items[i].purchased;
      break;
    }
  }
  saveItems(items);
  renderList(items);
}

function toggleHeld(id) {
  var items = loadItems();
  for (var i = 0; i < items.length; i++) {
    if (items[i].id === id) {
      items[i].held = !items[i].held;
      items[i].purchased = false;
      break;
    }
  }
  saveItems(items);
  renderList(items);
}

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

function reorderStores() {
  var newStores = [];
  $("#itemGroups > .storeGroup").each(function () {
    var storeName = $(this).attr("data-store");
    if (storeName !== UNASSIGNED_STORE) {
      newStores.push(storeName);
    }
  });
  saveStores(newStores);
  renderList(loadItems());
}

function increaseQuantity(id) {
  var items = loadItems();
  for (var i = 0; i < items.length; i++) {
    if (items[i].id === id) {
      items[i].quantity = (items[i].quantity || 1) + 1;
      break;
    }
  }
  saveItems(items);
  renderList(items);
}

function decreaseQuantity(id) {
  var items = loadItems();
  for (var i = 0; i < items.length; i++) {
    if (items[i].id === id) {
      if ((items[i].quantity || 1) <= 1) {
        deleteItem(id);
        return;
      }
      items[i].quantity = items[i].quantity - 1;
      break;
    }
  }
  saveItems(items);
  renderList(items);
}

function deleteItem(id) {
  var items = loadItems();
  var filteredItems = [];
  for (var i = 0; i < items.length; i++) {
    if (items[i].id !== id) {
      filteredItems.push(items[i]);
    }
  }
  saveItems(filteredItems);
  renderList(filteredItems);
}

function clearAllItems() {
  saveItems([]);
  saveStores([]);
  renderList([]);
}

$(document).ready(function () {
  renderList(loadItems());

  Sortable.create(document.getElementById("itemGroups"), {
    handle: ".storeDragHandle",
    animation: 150,
    onEnd: function () {
      reorderStores();
    }
  });

  $("#addButton").on("click", function () {
    addItem($("#itemInput").val(), $("#quantityInput").val());
    $("#itemInput").val("").focus();
    $("#quantityInput").val("1");
  });

  $("#itemInput").on("keydown", function (event) {
    if (event.which === 13) {
      addItem($("#itemInput").val(), $("#quantityInput").val());
      $("#itemInput").val("").focus();
      $("#quantityInput").val("1");
    }
  });

  $("#quantityInput").on("keydown", function (event) {
    if (event.which === 13) {
      addItem($("#itemInput").val(), $("#quantityInput").val());
      $("#itemInput").val("").focus();
      $("#quantityInput").val("1");
    }
  });

  $("#addStoreButton").on("click", function () {
    addStore($("#storeInput").val());
    $("#storeInput").val("").focus();
  });

  $("#storeInput").on("keydown", function (event) {
    if (event.which === 13) {
      addStore($("#storeInput").val());
      $("#storeInput").val("").focus();
    }
  });

  $("#itemGroups").on("click", ".deleteStoreButton", function () {
    var storeName = $(this).attr("data-store");
    if (window.confirm("「" + storeName + "」を削除します。商品は「未設定」に移動します。よろしいですか？")) {
      deleteStore(storeName);
    }
  });

  $("#itemGroups").on("click", ".purchaseCheckbox", function () {
    var id = Number($(this).closest("li").attr("data-id"));
    toggleItem(id);
  });

  $("#itemGroups").on("click", ".editButton", function () {
    var id = Number($(this).closest("li").attr("data-id"));
    editItemName(id);
  });

  $("#itemGroups").on("click", ".holdButton", function () {
    var id = Number($(this).closest("li").attr("data-id"));
    toggleHeld(id);
  });

  $("#itemGroups").on("click", ".increaseButton", function () {
    var id = Number($(this).closest("li").attr("data-id"));
    increaseQuantity(id);
  });

  $("#itemGroups").on("click", ".decreaseButton", function () {
    var id = Number($(this).closest("li").attr("data-id"));
    decreaseQuantity(id);
  });

  $("#itemGroups").on("click", ".deleteButton", function () {
    var id = Number($(this).closest("li").attr("data-id"));
    deleteItem(id);
  });

  $("#clearAllButton").on("click", function () {
    if (window.confirm("リストを全件削除します。よろしいですか？")) {
      clearAllItems();
    }
  });
});
