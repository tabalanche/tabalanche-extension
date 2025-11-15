function postDesignDocMigration(doc) {
  const uuid = (doc.uuid || doc._id || crypto.randomUUID()
    ).toUpperCase();
  const created = new Date(doc.created).toISOString();

  if (!doc.uuid) {
    doc.uuid = uuid;
    doc._id = `${created}_${uuid}`;
  }

  // ensure document timestamp is in ISO format
  doc.created = created;

  return doc;
}

async function importFromOldToNew(oldDb, newDb) {
  async function getNextBatch(startKey) {
    const queryOpts = {
      include_docs: true,
      limit: 100
    };

    if (startKey) {
      queryOpts.startkey = startKey;
      queryOpts.skip = 1;
    }
    return oldDb.allDocs(queryOpts);
  }

  const totalDocs = (await oldDb.info()).doc_count;
  let importedDocCount = +localStorage.getItem("pouch9MigrationProgress");

  let lastKey = localStorage.getItem("pouch9MigrationLastKey");

  let response = await getNextBatch(lastKey);
  const imports = [];

  while (response.rows.length > 0) {
    for (const {doc} of response.rows) {
      // ignore design docs etc. (not using them for Tabalanche 1.2.0+)
      if (doc._id[0] == '_') continue;

      // imports get rejected if they have revision history
      delete doc._rev;

      imports.push(postDesignDocMigration(doc));
    }

    // Could *maybe* check this to see if there were any conflict errors,
    // but I'm pretty sure that's safely ignorable
    await newDb.bulkDocs(imports);

    importedDocCount += response.rows.length;
    lastKey = response.rows[response.rows.length-1].id;
    localStorage.setItem("pouch9MigrationLastKey", lastKey);
    localStorage.setItem("pouch9MigrationProgress", importedDocCount);
    localStorage.setItem("slowBanner",
      `Updating stash records for Tabalanche 1.2.0 (${
        importedDocCount}/${totalDocs})`)

    imports.length = 0;
    response = await getNextBatch(lastKey);
  }
}

var migrating = localStorage.getItem("pouch9MigrationStatus") ? null :
 navigator.locks.request("pouch9Migration", migrateLegacyStashes);

async function migrateLegacyStashes() {
  const newDb = new PouchDB('stashes');

  // if the lock was released because the migrtaion finished successfully
  if (localStorage.getItem("pouch9MigrationStatus") == 'complete') {

    // return and remove the migration flag for future calls on this page
    migrating = null;
    return newDb;
  }

  const oldDb = new PouchDB5('tabgroups');

  await importFromOldToNew(oldDb, newDb);

  localStorage.setItem("pouch9MigrationStatus", "complete");
  await oldDb.destroy();
  localStorage.removeItem("pouch9MigrationLastKey");
  localStorage.removeItem("pouch9MigrationProgress");
  localStorage.removeItem("slowBanner");

  migrating = null;
  return newDb;
}
