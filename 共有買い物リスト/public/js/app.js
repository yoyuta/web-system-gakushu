var API_BASE = "/api/items";

function showStatus(message) {
  $("#statusMessage").text(message || "");
}

function showError() {
  showStatus("エラー: サーバーと通信できませんでした。ページを再読み込みしてください。");
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

function loadItems() {
  showStatus("読み込み中...");
  $.ajax({ url: API_BASE, method: "GET", dataType: "json" })
    .done(function (response) {
      showStatus("");
      renderList(response.items);
    })
    .fail(showError);
}

function addItem(name) {
  var trimmedName = name.replace(/^\s+|\s+$/g, "");
  if (trimmedName === "") {
    return;
  }
  $.ajax({
    url: API_BASE,
    method: "POST",
    contentType: "application/json",
    data: JSON.stringify({ name: trimmedName }),
    dataType: "json"
  }).done(function (response) {
    renderList(response.items);
  }).fail(showError);
}

function toggleItem(id) {
  $.ajax({ url: API_BASE + "/" + id + "/toggle", method: "PUT", dataType: "json" })
    .done(function (response) {
      renderList(response.items);
    })
    .fail(showError);
}

function deleteItem(id) {
  $.ajax({ url: API_BASE + "/" + id, method: "DELETE", dataType: "json" })
    .done(function (response) {
      renderList(response.items);
    })
    .fail(showError);
}

$(document).ready(function () {
  loadItems();

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
