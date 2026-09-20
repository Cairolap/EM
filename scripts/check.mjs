import {readdir,readFile} from 'node:fs/promises';
import vm from 'node:vm';
// Parse browser bundles as scripts, without executing them or opening network access.
for(const scope of ['machines','parts','bom','users']){
 const html=await readFile(new URL(`../public/${scope}/index.html`,import.meta.url),'utf8');
 for(const match of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1],{filename:scope});
 if(!html.includes('window.EM_RPC'))throw new Error('Missing Cloudflare transport: '+scope);
}
for(const entry of await readdir(new URL('../src/',import.meta.url))){if(entry.endsWith('.js'))await import(new URL('../src/'+entry,import.meta.url));}
console.log('Worker imports and all four browser bundles parse successfully.');
