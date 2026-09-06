import { seed, type State } from './model.ts';
export type Snapshot = { state: State; revision: number };
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('stride-gear', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('records');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(Error('无法打开本地存储，请检查浏览器隐私设置。'));
  });
}
export async function readLocal(): Promise<Snapshot> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readonly');
    const request = tx.objectStore('records').get('personal');
    tx.oncomplete = () => { db.close(); resolve(request.result ?? { state: seed(), revision: 0 }); };
    tx.onabort = () => { db.close(); reject(Error('本地记录读取失败，请重试。')); };
  });
}
export async function writeLocal(state: State, revision: number): Promise<{ revision: number }> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('records', 'readwrite');
    const store = tx.objectStore('records');
    let message = '保存失败，浏览器空间可能不足。请先导出备份。';
    const request = store.get('personal');
    request.onsuccess = () => {
      if ((request.result?.revision ?? 0) !== revision) {
        message = '记录已在其他页面更新，请重新加载后重试。'; tx.abort(); return;
      }
      store.put({ state, revision: revision + 1 }, 'personal');
    };
    tx.oncomplete = () => { db.close(); resolve({ revision: revision + 1 }); };
    tx.onabort = () => { db.close(); reject(Error(message)); };
  });
}
