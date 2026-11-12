import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

test('Service workern sparar den aktuella startsidan redan vid första besöket', async () => {
  const home=new URL('https://example.com/bryggis/');
  const html=readFileSync(new URL('../dist/index.html',import.meta.url),'utf8');
  const worker=readFileSync(new URL('../dist/sw.js',import.meta.url),'utf8');
  const handlers=new Map(), entries=new Map();
  let online=true;
  const cache={
    addAll: async()=>{},
    put: async(key,response)=>{entries.set(key,response.clone());},
    match: async key=>entries.get(key)?.clone()
  };
  runInNewContext(worker,{
    self:{
      location:new URL('sw.js',home),
      addEventListener:(event,handler)=>handlers.set(event,handler),
      skipWaiting:async()=>{}
    },
    URL, Response, caches:{open:async()=>cache},
    fetch:async request=>{
      if(!online)throw new Error('Offline');
      assert.equal(String(request),home.href);
      return new Response(html,{headers:{'content-type':'text/html'}});
    }
  });
  let installing;
  handlers.get('install')({waitUntil:promise=>{installing=promise;}});
  await installing;
  online=false;
  let response;
  handlers.get('fetch')({
    request:{url:home.href,method:'GET',mode:'navigate'},
    respondWith:promise=>{response=promise;}
  });
  const offline=await response;
  assert.equal(offline.status,200);
  assert.equal(await offline.text(),html);
});
