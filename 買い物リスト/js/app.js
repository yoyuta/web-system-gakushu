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

  var remainingCount = 0;
  for (var i = 0; i < items.length; i++) {
    if (!items[i].purchased) {
      remainingCount++;
    }
  }
  $("#remainingCount").text("未購入: " + remainingCount + "件");

  for (i = 0; i < items.length; i++) {
    var item = items[i];
    var $li = $("<li></li>").attr("data-id", item.id);
    if (item.purchased) {
      $li.addClass("purchased");
    }

    var $checkbox = $("<input>").attr("type", "checkbox").addClass("purchaseCheckbox");
    if (item.purchased) {
      $checkbox.prop("checked", true);
    }

    var $name = $("<span></span>").addClass("itemName").text(item.name);

    var $decreaseButton = $("<button></button>").attr("type", "button").addClass("decreaseButton").text("－");
    var $quantity = $("<span></span>").addClass("itemQuantity").text(item.quantity || 1);
    var $increaseButton = $("<button></button>").attr("type", "button").addClass("increaseButton").text("＋");
    var $quantityControls = $("<span></span>").addClass("quantityControls")
      .append($decreaseButton).append($quantity).append($increaseButton);

    var $editButton = $("<button></button>").attr("type", "button").addClass("editButton").text("✎");
    var $deleteButton = $("<button></button>").attr("type", "button").addClass("deleteButton").text("×");

    $li.append($checkbox).append($name).append($quantityControls).append($editButton).append($deleteButton);
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
