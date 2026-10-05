(function (root) {
  "use strict";
  const KEY = "drumscore:workspace";
  let opening;
  function db() {
    if (opening) return opening;
    opening = new Promise((resolve, reject) => {
      const request = indexedDB.open("drumscore-workspaces", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("snapshots", { keyPath: "id" });
        request.result.createObjectStore("media");
      };
      request.onerror = () => { opening = null; reject(request.error); };
      request.onsuccess = () => {
        request.result.onversionchange = () => { request.result.close(); opening = null; };
        resolve(request.result);
      };
    });
    return opening;
  }
  async function transaction(store, mode, action) {
    const connection = await db();
    return new Promise((resolve, reject) => {
      const tx = connection.transaction(store, mode);
      const request = action(tx.objectStore(store));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error || new Error("자동 저장 공간을 사용할 수 없습니다."));
    });
  }
  function remember(snapshot) {
    // Keep a small, synchronous recovery handle even if large Blob storage
    // fails or the browser is killed before an IndexedDB write completes.
    const { id, jobId, stage, fileName, fileSize, options, updatedAt } = snapshot;
    localStorage.setItem(KEY, JSON.stringify({ id, jobId, stage, fileName, fileSize, options, updatedAt }));
  }
  async function save(snapshot) {
    await transaction("snapshots", "readwrite", store => store.put(snapshot));
  }
  async function load() {
    let handle;
    try { handle = JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
    if (!handle?.id) return null;
    try {
      const stored = await transaction("snapshots", "readonly", store => store.get(handle.id));
      return stored && stored.updatedAt >= handle.updatedAt ? stored : { ...stored, ...handle };
    } catch { return handle; }
  }
  const media = (id, kind) => transaction("media", "readonly", store => store.get(`${id}:${kind}`));
  const putMedia = (id, kind, blob) => transaction("media", "readwrite", store => store.put(blob, `${id}:${kind}`));
  root.DrumWorkspace = { remember, save, load, media, putMedia };
})(globalThis);
