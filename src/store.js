const DB_NAME='cove', DB_VERSION=3;
let dbPromise;
export function openDB(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,DB_VERSION);req.onerror=()=>reject(req.error);req.onupgradeneeded=()=>{
    const db=req.result;
    if(!db.objectStoreNames.contains('items')){const s=db.createObjectStore('items',{keyPath:'id'});s.createIndex('state','state');s.createIndex('addedAt','addedAt');s.createIndex('urlKey','urlKey',{unique:true});s.createIndex('folderId','folderId');s.createIndex('tags','tags',{multiEntry:true})}
    if(!db.objectStoreNames.contains('folders'))db.createObjectStore('folders',{keyPath:'id'});
    if(!db.objectStoreNames.contains('articles'))db.createObjectStore('articles',{keyPath:'itemId'});
    if(!db.objectStoreNames.contains('annotations')){const s=db.createObjectStore('annotations',{keyPath:'id'});s.createIndex('itemId','itemId');s.createIndex('createdAt','createdAt')}
  };req.onsuccess=()=>resolve(req.result)});return dbPromise;
}
function request(req){return new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function tx(storeNames,mode,work){const db=await openDB();return new Promise((resolve,reject)=>{const t=db.transaction(storeNames,mode);let value;try{value=work(t)}catch(e){reject(e);return}t.oncomplete=async()=>resolve(await value);t.onerror=()=>reject(t.error);t.onabort=()=>reject(t.error)})}
export const all=store=>tx([store],'readonly',t=>request(t.objectStore(store).getAll()));
export const get=(store,key)=>tx([store],'readonly',t=>request(t.objectStore(store).get(key)));
export const put=(store,value)=>tx([store],'readwrite',t=>request(t.objectStore(store).put(value)));
export const remove=(store,key)=>tx([store],'readwrite',t=>request(t.objectStore(store).delete(key)));
export async function getByUrlKey(urlKey){return tx(['items'],'readonly',t=>request(t.objectStore('items').index('urlKey').get(urlKey)))}
export async function annotationsFor(itemId){return (await all('annotations')).filter(a=>a.itemId===itemId&&!a.deletedAt).sort((a,b)=>a.createdAt-b.createdAt)}
export async function deleteItemCascade(id){return tx(['items','articles','annotations'],'readwrite',t=>{t.objectStore('items').delete(id);t.objectStore('articles').delete(id);const idx=t.objectStore('annotations').index('itemId');const req=idx.openCursor(IDBKeyRange.only(id));req.onsuccess=()=>{const c=req.result;if(c){c.delete();c.continue()}}})}
export async function clearAll(){const db=await openDB();const names=['items','folders','articles','annotations'];return new Promise((resolve,reject)=>{const t=db.transaction(names,'readwrite');names.forEach(n=>t.objectStore(n).clear());t.oncomplete=resolve;t.onerror=()=>reject(t.error)})}
export function makeId(prefix){return `${prefix}_${Date.now().toString(36)}_${crypto.getRandomValues(new Uint32Array(1))[0].toString(36)}`}
