import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
const seed=[{id:'clean-coast',title:'Keep Our Coast Clean',summary:'Help volunteers gather supplies for a coastal cleanup.',story:'Community members are planning a volunteer shoreline cleanup. Specific dates and permissions will be confirmed before the event.',category:'environment',goal:150000,createdAt:'demo',demo:true}];
export function makeStore(folder){
  const filename=path.join(folder,'state.json');let queue=Promise.resolve();
  async function load(){try{return JSON.parse(await readFile(filename,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;return {campaigns:seed,orders:{},captures:{},events:{}};}}
  async function transact(fn){
    const job=queue.catch(()=>{}).then(async()=>{
      const state=await load();const result=await fn(state);
      await mkdir(folder,{recursive:true});const tmp=filename+'.'+randomUUID();
      await writeFile(tmp,JSON.stringify(state,null,2),{mode:0o600});await rename(tmp,filename);
      return result;
    });queue=job.catch(()=>{});return job;
  }
  return {load,transact};
}
