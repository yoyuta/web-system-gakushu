var express = require("express");
var path = require("path");
var fs = require("fs");

var app = express();
var PORT = process.env.PORT || 3000;
var DATA_DIR = path.join(__dirname, "data");
var DATA_FILE = path.join(DATA_DIR, "items.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function ensureDataFile() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]", "utf8");
  }
}

function readItems() {
  var raw = fs.readFileSync(DATA_FILE, "utf8");
  if (!raw) {
    return [];
  }
  return JSON.parse(raw);
}

function writeItems(items) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

function nextId(items) {
  var maxId = 0;
  for (var i = 0; i < items.length; i++) {
    if (items[i].id > maxId) {
      maxId = items[i].id;
    }
  }
  return maxId + 1;
}

ensureDataFile();

app.get("/api/items", function (req, res) {
  res.json({ items: readItems() });
});

app.post("/api/items", function (req, res) {
  var rawName = (req.body && req.body.name) ? String(req.body.name) : "";
  var trimmedName = rawName.replace(/^\s+|\s+$/g, "");
  if (trimmedName === "") {
    res.status(400).json({ error: "name is required" });
    return;
  }

  var items = readItems();
  items.push({
    id: nextId(items),
    name: trimmedName,
    purchased: false
  });
  writeItems(items);
  res.status(201).json({ items: items });
});

app.put("/api/items/:id/toggle", function (req, res) {
  var id = Number(req.params.id);
  var items = readItems();
  var found = false;

  for (var i = 0; i < items.length; i++) {
    if (items[i].id === id) {
      items[i].purchased = !items[i].purchased;
      found = true;
      break;
    }
  }

  if (!found) {
    res.status(404).json({ error: "item not found" });
    return;
  }
  writeItems(items);
  res.json({ items: items });
});

app.delete("/api/items/:id", function (req, res) {
  var id = Number(req.params.id);
  var items = readItems();
  var filteredItems = [];
  var found = false;

  for (var i = 0; i < items.length; i++) {
    if (items[i].id === id) {
      found = true;
    } else {
      filteredItems.push(items[i]);
    }
  }

  if (!found) {
    res.status(404).json({ error: "item not found" });
    return;
  }
  writeItems(filteredItems);
  res.json({ items: filteredItems });
});

app.listen(PORT, "0.0.0.0", function () {
  console.log("共有買い物リスト サーバー起動: http://localhost:" + PORT + "/");
});
