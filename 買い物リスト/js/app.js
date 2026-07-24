var STORAGE_KEY = "shoppingList";

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

function renderList(items) {
  var $list = $("#itemList");
  $list.empty();

  var purchasedCount = 0;
  var heldCount = 0;
  var remainingCount = 0;
  for (var i = 0; i < items.length; i++) {
    if (items[i].purchased) {
      purchasedCount++;
    } else if (items[i].held) {
      heldCount++;
    } else {
      remainingCount++;
    }
  }
  $("#remainingCount").text("購入: " + purchasedCount + "件　未購入: " + remainingCount + "件　保留: " + heldCount + "件");

  for (i = 0; i < items.length; i++) {
    var item = items[i];
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
    $list.append($li);
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
    purchased: false
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
  var newOrder = [];
  $("#itemList li").each(function () {
    var id = Number($(this).attr("data-id"));
    for (var i = 0; i < items.length; i++) {
      if (items[i].id === id) {
        newOrder.push(items[i]);
        break;
      }
    }
  });
  saveItems(newOrder);
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
  renderList([]);
}

$(document).ready(function () {
  renderList(loadItems());

  Sortable.create(document.getElementById("itemList"), {
    handle: ".dragHandle",
    animation: 150,
    onEnd: function () {
      reorderItems();
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

  $("#itemList").on("click", ".purchaseCheckbox", function () {
    var id = Number($(this).closest("li").attr("data-id"));
    toggleItem(id);
  });

  $("#itemList").on("click", ".editButton", function () {
    var id = Number($(this).closest("li").attr("data-id"));
    editItemName(id);
  });

  $("#itemList").on("click", ".holdButton", function () {
    var id = Number($(this).closest("li").attr("data-id"));
    toggleHeld(id);
  });

  $("#itemList").on("click", ".increaseButton", function () {
    var id = Number($(this).closest("li").attr("data-id"));
    increaseQuantity(id);
  });

  $("#itemList").on("click", ".decreaseButton", function () {
    var id = Number($(this).closest("li").attr("data-id"));
    decreaseQuantity(id);
  });

  $("#itemList").on("click", ".deleteButton", function () {
    var id = Number($(this).closest("li").attr("data-id"));
    deleteItem(id);
  });

  $("#clearAllButton").on("click", function () {
    if (window.confirm("リストを全件削除します。よろしいですか？")) {
      clearAllItems();
    }
  });
});
