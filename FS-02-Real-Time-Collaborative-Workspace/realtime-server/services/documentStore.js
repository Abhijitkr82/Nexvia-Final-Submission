
import * as Y from "yjs";
import { Awareness } from "y-protocols/awareness";
import { prisma } from "../config/database.js";

const documents = new Map();
const SAVE_DELAY = 500;

const LEGACY_MIGRATION_KEY = "richContentMigratedFromText";

function migrateLegacyContent(doc) {
  const metadata = doc.getMap("nexviaMeta");

  if (metadata.get(LEGACY_MIGRATION_KEY) === true) {
    return false;
  }

  const legacyText = doc.getText("content").toString();
  const richContent = doc.getXmlFragment("richContent");

  // Never overwrite an existing rich-text document.
  if (richContent.length === 0) {
    const lines = legacyText.split(/\r\n|\n|\r/);

    doc.transact(() => {
      for (const line of lines) {
        const paragraph = new Y.XmlElement("paragraph");

        if (line.length > 0) {
          const text = new Y.XmlText();
          text.insert(0, line);
          paragraph.insert(0, [text]);
        }

        richContent.insert(richContent.length, [paragraph]);
      }

      metadata.set(LEGACY_MIGRATION_KEY, true);
    });
  } else {
    metadata.set(LEGACY_MIGRATION_KEY, true);
  }

  return true;
}

function attachSaveListener(pageId, entry) {
  entry.doc.on("update", () => {
    scheduleSave(pageId, entry);
  });
}

function createDocumentEntry(pageId, initialState = null) {
  const doc = new Y.Doc();
  const awareness = new Awareness(doc);

  if (initialState) {
    Y.applyUpdate(doc, new Uint8Array(initialState));
  }

  migrateLegacyContent(doc);

  const entry = {
    doc,
    awareness,
    connections: new Map(),
    saveTimer: null,
    realtimeListenersAttached: false,
    replacingDocument: false,
  };

  attachSaveListener(pageId, entry);

  return entry;
}

export async function getDocument(pageId) {
  const existing = documents.get(pageId);

  if (existing) {
    return existing;
  }

  const savedDocument = await prisma.pageDocument.findUnique({
    where: { pageId },
    select: { state: true },
  });

  const entry = createDocumentEntry(
    pageId,
    savedDocument?.state || null
  );

  documents.set(pageId, entry);

  // Persist the migrated document before serving it to clients.
  await persistDocument(pageId, entry);

  return entry;
}

function scheduleSave(pageId, entry) {
  if (entry.saveTimer) {
    clearTimeout(entry.saveTimer);
  }

  entry.saveTimer = setTimeout(() => {
    persistDocument(pageId, entry).catch((error) => {
      console.error(
        `Failed to save document ${pageId}:`,
        error.message
      );
    });
  }, SAVE_DELAY);
}

export async function persistDocument(pageId, entry) {
  if (entry.saveTimer) {
    clearTimeout(entry.saveTimer);
    entry.saveTimer = null;
  }

  const state = Buffer.from(Y.encodeStateAsUpdate(entry.doc));

  await prisma.pageDocument.upsert({
    where: { pageId },
    create: { pageId, state },
    update: { state },
  });
}

export async function replaceDocument(pageId, snapshot) {
  let entry = documents.get(pageId);

  if (!entry) {
    entry = createDocumentEntry(pageId, snapshot);
    documents.set(pageId, entry);
  } else {
    if (entry.saveTimer) {
      clearTimeout(entry.saveTimer);
      entry.saveTimer = null;
    }

    const previousDoc = entry.doc;
    const previousAwareness = entry.awareness;

    entry.doc = new Y.Doc();
    entry.awareness = new Awareness(entry.doc);

    Y.applyUpdate(entry.doc, new Uint8Array(snapshot));

    // Migrate legacy snapshots during version restoration too.
    migrateLegacyContent(entry.doc);

    entry.realtimeListenersAttached = false;

    attachSaveListener(pageId, entry);

    entry.replacingDocument = true;

    try {
      previousAwareness.destroy();
      previousDoc.destroy();
    } finally {
      entry.replacingDocument = false;
    }
  }

  await persistDocument(pageId, entry);

  return entry;
}

export async function flushAllDocuments() {
  const tasks = [];

  for (const [pageId, entry] of documents.entries()) {
    tasks.push(persistDocument(pageId, entry));
  }

  await Promise.all(tasks);
}

export function getLoadedDocuments() {
  return documents;
}
