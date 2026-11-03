const LifeOSDB = (() => {
  const DB_NAME = "LifeOS";
  const DB_VERSION = 1;

  const STORES = [
    "tasks",
    "habits",
    "weight",
    "workouts",
    "sleep",
    "dailyLogs",
    "settings",
    "notes"
  ];

  let database;

  function init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        STORES.forEach((store) => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, {
              keyPath: "id",
              autoIncrement: true
            });
          }
        });
      };

      request.onsuccess = () => {
        database = request.result;
        resolve(database);
      };

      request.onerror = () => reject(request.error);
    });
  }

  async function save(store, data) {
    const db = database || await init();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(store, "readwrite");
      const request = transaction.objectStore(store).put({
        ...data,
        updatedAt: new Date().toISOString()
      });

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getAll(store) {
    const db = database || await init();

    return new Promise((resolve, reject) => {
      const request = db
        .transaction(store, "readonly")
        .objectStore(store)
        .getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function get(store, id) {
    const db = database || await init();

    return new Promise((resolve, reject) => {
      const request = db
        .transaction(store, "readonly")
        .objectStore(store)
        .get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function remove(store, id) {
    const db = database || await init();

    return new Promise((resolve, reject) => {
      const request = db
        .transaction(store, "readwrite")
        .objectStore(store)
        .delete(id);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  }

  async function exportData() {
    const backup = {};

    for (const store of STORES) {
      backup[store] = await getAll(store);
    }

    return JSON.stringify({
      application: "LifeOS",
      version: DB_VERSION,
      exportedAt: new Date().toISOString(),
      data: backup
    }, null, 2);
  }

  async function importData(json) {
    const backup = JSON.parse(json);

    if (
      backup.application !== "LifeOS" ||
      !backup.data
    ) {
      throw new Error("Invalid LifeOS backup");
    }

    const db = database || await init();

    for (const store of STORES) {
      if (!Array.isArray(backup.data[store])) continue;

      await new Promise((resolve, reject) => {
        const transaction = db.transaction(store, "readwrite");
        const objectStore = transaction.objectStore(store);

        backup.data[store].forEach(item => {
          objectStore.put(item);
        });

        transaction.oncomplete = resolve;
        transaction.onerror = () => reject(transaction.error);
      });
    }

    return true;
  }

  return {
    init,
    save,
    get,
    getAll,
    remove,
    exportData,
    importData
  };
})();

window.LifeOSDB = LifeOSDB;

LifeOSDB.init()
  .then(() => console.log("LifeOS Database initialized"))
  .catch(error => console.error("Database error:", error));
