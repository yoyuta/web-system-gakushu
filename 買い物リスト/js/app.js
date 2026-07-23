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

  for (var i = 0; i < items.length; i++) {
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
    var $deleteButton = $("<button></button>").attr("type", "button").addClass("deleteButton").text("×");

    $li.append($checkbox).append($name).append($deleteButton);
    $list.append($li);
  }
}

function addItem(name) {
  var trimmedName = name.replace(/^\s+|\s+$/g, "");
  if (trimmedName === "") {
    return;
  }

  var items = loadItems();
  items.push({
    id: Date.now(),
    name: trimmedName,
    purchased: false
  });
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

$(document).ready(function () {
  renderList(loadItems());

  $("#addButton").on("click", function () {
    addItem($("#itemInput").val());
    $("#itemInput").val("").focus();
  });

  $("#itemInput").on("keydown", function (event) {
    if (event.which === 13) {
      addItem($("#itemInput").val());
      $("#itemInput").val("").focus();
    }
  });

  $("#itemList").on("click", ".purchaseCheckbox", function () {
    var id = Number($(this).closest("li").attr("data-id"));
    toggleItem(id);
  });

  $("#itemList").on("click", ".deleteButton", function () {
    var id = Number($(this).closest("li").attr("data-id"));
    deleteItem(id);
  });
});
