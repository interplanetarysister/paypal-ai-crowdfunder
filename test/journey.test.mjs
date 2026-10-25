import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {mkdtemp,rm} from 'node:fs/promises';
import {createApp} from '../server.mjs';

const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve('http://127.0.0.1:'+server.address().port)));
const close=server=>new Promise(resolve=>server.close(resolve));
const post=(base,route,data)=>fetch(base+route,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data)});
test('guided browser assets and real AI-to-saved-campaign journey, no PayPal credentials',async()=>{
  const folder=await mkdtemp(path.join(os.tmpdir(),'crowdfunder-demo-'));
  const disconnected={configured:false,clientId:null};
  let app=createApp({dataDir:folder,paypal:disconnected}),base=await listen(app);
  try{
    const home=await fetch(base+'/');
    assert.equal(home.status,200);
    const html=await home.text();
    assert.match(html,/id="load-demo"/);
    assert.match(html,/id="draft-title-options"/);
    assert.match(html,/PAYPAL SANDBOX DEMO/);
    for(const route of ['/app.js','/style.css']){
      const asset=await fetch(base+route);
      assert.equal(asset.status,200);
      assert.ok((await asset.text()).length>1000);
    }
    const status=await (await fetch(base+'/api/status')).json();
    assert.equal(status.paypalConfigured,false);
    assert.equal(status.ai.local,true);
    const draftRes=await post(base,'/api/ai/draft',{
      who:'Our neighborhood coastal cleanup volunteers',
      need:'Reusable gloves, litter grabbers, and waste bags for a shoreline cleanup',
      impact:'Remove litter from the shoreline and protect nearby habitats',
      goal:'500'
    });
    assert.equal(draftRes.status,200);
    const {draft}=await draftRes.json();
    assert.equal(draft.category,'environment');
    assert.equal(draft.titles.length,3);
    assert.ok(draft.story.includes('litter grabbers'));
    const savedRes=await post(base,'/api/campaigns',{
      title:'Help Clean Our Coast',summary:draft.summary,story:draft.story,
      category:draft.category,goal:'500'
    });
    assert.equal(savedRes.status,201);
    const {campaign}=await savedRes.json();
    assert.match(campaign.id,/^[0-9a-f-]{36}$/);
    const order=await post(base,'/api/orders',{campaignId:campaign.id,amount:'5'});
    assert.equal(order.status,503);
    const campaigns=await (await fetch(base+'/api/campaigns')).json();
    const row=campaigns.campaigns.find(c=>c.id===campaign.id);
    assert.equal(row.raised,0);
    assert.equal(row.donations,0);
    await close(app);app=createApp({dataDir:folder,paypal:disconnected});base=await listen(app);
    const persisted=await (await fetch(base+'/api/campaigns')).json();
    assert.ok(persisted.campaigns.some(c=>c.id===campaign.id));
  }finally{await close(app);await rm(folder,{recursive:true,force:true});}
});