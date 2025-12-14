import express from "express";
import crypto from "crypto";
import fs from "fs";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// JSON files
import path from "path";
import { fileURLToPath } from "url";


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTACT_FILE = path.join(__dirname, "contacts.json");
const DELETED_FILE = path.join(__dirname, "deleted.json");
const CALL_FILE = path.join(__dirname, "calls.json");


// Helper functions
const readData = (file) => {
  if (!fs.existsSync(file)) fs.writeFileSync(file, "[]");
  return JSON.parse(fs.readFileSync(file, "utf-8"));
};

const writeData = (file, data) => {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// ----------- CONTACTS API -----------

app.get("/api/contacts", (req, res) => {
  res.json(readData(CONTACT_FILE));
});

app.get("/api/deleted", (req, res) => {
  res.json(readData(DELETED_FILE));
});

app.post("/api/contacts", (req, res) => {
  const contacts = readData(CONTACT_FILE);
  const newContact = {
    id: crypto.randomUUID(),
    name: req.body.name,
    phone: req.body.phone,
    email: req.body.email || "",
    saveTo: req.body.saveTo || "phone",
    isFavourite: false,
    isBlocked: false
  };
  contacts.push(newContact);
  writeData(CONTACT_FILE, contacts);
  res.json(newContact);
});

app.put("/api/contacts/:id", (req, res) => {
  let contacts = readData(CONTACT_FILE);
  contacts = contacts.map(c =>
    c.id === req.params.id ? { ...c, ...req.body } : c
  );
  writeData(CONTACT_FILE, contacts);
  res.json(contacts.find(c => c.id === req.params.id));
});

// DELETE / MOVE contact to deleted.json
app.delete("/api/contacts/:id", (req, res) => {
  let contacts = readData(CONTACT_FILE);
  let deleted = readData(DELETED_FILE);

  const index = contacts.findIndex(c => c.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: "Contact not found" });

  const [deletedContact] = contacts.splice(index, 1); // remove from contacts
  deleted.push(deletedContact); // add to deleted
  writeData(CONTACT_FILE, contacts);
  writeData(DELETED_FILE, deleted);

  res.json({ success: true, deleted: deletedContact });
});



// DELETE contact from deleted.json (restore)
app.post("/api/contacts/restore/:id", (req, res) => {
  const contacts = readData(CONTACT_FILE);
  const deleted = readData(DELETED_FILE);

  const contactToRestore = deleted.find(c => c.id === req.params.id);
  if (!contactToRestore) {
    return res.status(404).json({ error: "Contact not found" });
  }

  // remove from deleted.json
  const updatedDeleted = deleted.filter(c => c.id !== req.params.id);
  writeData(DELETED_FILE, updatedDeleted);

  // add back to contacts.json
  contacts.push(contactToRestore);
  writeData(CONTACT_FILE, contacts);

  res.json({ success: true, contact: contactToRestore });
});

// ----------- CALL HISTORY API -----------

// Get all calls
app.get("/api/calls", (req, res) => {
  const calls = readData(CALL_FILE);
  res.json(calls);
});

// Add new call
app.post("/api/calls", (req, res) => {
  const calls = readData(CALL_FILE);
  const newCall = {
    id: Date.now(),
    number: req.body.number,
    time: req.body.time
  };
  calls.unshift(newCall); // add to top
  writeData(CALL_FILE, calls);
  res.json(newCall);
});

// Clear all call history
// CLEAR ALL CALL HISTORY (PERMANENT)
app.delete("/api/calls", (req, res) => {
  fs.writeFileSync(CALL_FILE, JSON.stringify([], null, 2));
  res.json({ success: true });
});

app.use(express.static(path.join(__dirname, "../dist")));

app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});
// ----------- START SERVER -----------

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
