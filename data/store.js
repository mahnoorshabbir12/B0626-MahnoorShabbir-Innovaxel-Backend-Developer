const fs = require('fs');
const path = require('path');

// ─── File Paths 
const DATA_DIR = path.join(__dirname, '..', 'data');
const EVENTS_FILE = path.join(DATA_DIR, 'events.json');
const REGISTRATIONS_FILE = path.join(DATA_DIR, 'registrations.json');

// ─── Ensure data directory and files exist 
function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(EVENTS_FILE)) {
    fs.writeFileSync(EVENTS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
  if (!fs.existsSync(REGISTRATIONS_FILE)) {
    fs.writeFileSync(REGISTRATIONS_FILE, JSON.stringify([], null, 2), 'utf-8');
  }
}

// ─── Mutex Lock (prevents race conditions) 
class Mutex {
  constructor() {
    this._locks = new Map();
  }

  async acquire(key) {
    while (this._locks.has(key)) {
      await this._locks.get(key);
    }
    let release;
    const promise = new Promise((resolve) => {
      release = resolve;
    });
    this._locks.set(key, promise);
    return release;
  }

  release(key, releaseFn) {
    this._locks.delete(key);
    releaseFn();
  }
}

const mutex = new Mutex();

// ─── Generic read / write helpers   
function readJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeJSON(filePath, data) {
  // Atomic write: write to temp file first, then rename
  const tmpPath = filePath + '.tmp';
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpPath, filePath);
}

// ─── Events 
function getEvents() {
  return readJSON(EVENTS_FILE);
}

function saveEvents(events) {
  writeJSON(EVENTS_FILE, events);
}

// ─── Registrations  
function getRegistrations() {
  return readJSON(REGISTRATIONS_FILE);
}

function saveRegistrations(registrations) {
  writeJSON(REGISTRATIONS_FILE, registrations);
}

// ─── Export 
module.exports = {
  ensureDataFiles,
  mutex,
  getEvents,
  saveEvents,
  getRegistrations,
  saveRegistrations,
};
