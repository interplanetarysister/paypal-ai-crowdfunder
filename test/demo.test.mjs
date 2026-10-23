import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp,rm} from 'node:fs/promises';
import {createApp} from '../server.mjs';
import {makePayPal} from '../src/paypal.mjs';
import {classify,propose} from '../src/ai.mjs';
const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${server.address().port}`)));
const close=server=>new Promise(resolve=>server.close(resolve));
const json=async(url,method='GET',body,headers={})=>{
 const res=await fetch(url,{method,headers:{'content-type':'application/json',...headers},body:body?JSON.stringify(body):undefined});return {status:res.status,body:await res.json()};
};
test('trained local ML makes no unsupported factual claims',()=>{
 assert.equal(classify('volunteers cleaning ocean beach litter').category,'environment');
 const output=propose({who:'our neighborhood volunteers',need:'new litter grabbers',impact:'clean the shoreline',goal:5000});
 assert.match(output.story,/new litter grabbers/);assert.match(output.disclaimer,/Naive Bayes/);assert.match(output.summary,/50\.00/);
 assert.throws(()=>propose({who:'ok',need:'ok',impact:'ok',goal:10}));
});
test('sandbox checkout is server-authoritative, replay-safe, with verified captures',async()=>{
 const orders=new Map();let count=0,changed=false,verifyOk=true;
 const fake=http.createServer(async(req,res)=>{
  const chunks=[];for await(const part of req)chunks.push(part);const input=chunks.length?Buffer.concat(chunks).toString():'';
  const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
  if(req.url==='/v1/oauth2/token')return send(200,{access_token:'sandbox-test-token'});
  if(req.url==='/v2/checkout/orders'&&req.method==='POST'){
    const obj=JSON.parse(input);const id='ORDER-'+(++count);orders.set(id,{id,status:'CREATED',purchase_units:[{custom_id:obj.purchase_units[0].custom_id,amount:obj.purchase_units[0].amount,payments:{captures:[]}}]});return send(201,{id,status:'CREATED'});
  }
  if(req.url==='/v1/notifications/verify-webhook-signature')return send(200,{verification_status:verifyOk?'SUCCESS':'FAILURE'});
  const match=req.url.match(/^\/v2\/checkout\/orders\/(ORDER-\d+)(\/capture)?$/);
  if(match){const row=orders.get(match[1]);if(!row)return send(404,{});
    if(match[2]&&req.method==='POST'){row.status='COMPLETED';row.purchase_units[0].payments.captures=[{id:'CAPTURE-'+match[1],status:'COMPLETED',amount:{currency_code:'USD',value:changed?'9999.00':row.purchase_units[0].amount.value}}];}
    return send(200,row);
  }
  return send(404,{});
 });
 const fakeUrl=await listen(fake),directory=await mkdtemp(path.join(os.tmpdir(),'crowdfunder-'));
 process.env.NODE_ENV='test';const paypal=makePayPal({clientId:'sandbox-id',secret:'sandbox-secret',base:fakeUrl});
 const server=createApp({dataDir:directory,paypal,webhookId:'webhook-sandbox'});const host=await listen(server);
 try{
  assert.equal((await json(host+'/api/status')).body.paypalConfigured,true);
  const ai=await json(host+'/api/ai/draft','POST',{who:'community volunteers',need:'gloves for cleanup',impact:'clear beach litter',goal:'250'});assert.equal(ai.status,200);
  const badOrigin=await json(host+'/api/campaigns','POST',{title:'Test campaign',summary:'A helpful summary',story:'A detailed and truthful story about community needs.',goal:'2'}, {'Origin':'https://evil.example'});assert.equal(badOrigin.status,403);
  assert.equal((await json(host+'/api/orders','POST',{campaignId:'clean-coast',amount:'0.20'})).status,400);
  const order=await json(host+'/api/orders','POST',{campaignId:'clean-coast',amount:'5.00'});assert.equal(order.status,201);assert.match(order.body.id,/ORDER-/);
  const tamper=await json(host+'/api/orders/UNTRUSTED/capture','POST',{});assert.equal(tamper.status,404);
  const capture=await json(host+'/api/orders/'+order.body.id+'/capture','POST',{});assert.equal(capture.status,200);assert.equal(capture.body.donation.amount,500);
  const replay=await json(host+'/api/orders/'+order.body.id+'/capture','POST',{});assert.deepEqual(capture.body,replay.body);
  const campaignList=await json(host+'/api/campaigns');const c=campaignList.body.campaigns.find(c=>c.id==='clean-coast');assert.equal(c.raised,500);assert.equal(c.donations,1);
  verifyOk=false;
  const event={id:'EVENT-1',event_type:'PAYMENT.CAPTURE.COMPLETED',resource:{supplementary_data:{related_ids:{order_id:order.body.id}}}};
  const signed={'paypal-auth-algo':'SHA256withRSA','paypal-cert-url':'https://api.sandbox.paypal.com/cert','paypal-transmission-id':'fake-id','paypal-transmission-sig':'fake-sig','paypal-transmission-time':'2026-10-22T00:00:00Z'};
  assert.equal((await json(host+'/api/webhooks/paypal','POST',event,signed)).status,403);
  verifyOk=true;assert.equal((await json(host+'/api/webhooks/paypal','POST',event,signed)).status,200);
  assert.equal((await json(host+'/api/webhooks/paypal','POST',event,signed)).body.duplicate,true);
  const order2=await json(host+'/api/orders','POST',{campaignId:'clean-coast',amount:'6'});changed=true;
  const incorrect=await json(host+'/api/orders/'+order2.body.id+'/capture','POST',{});assert.equal(incorrect.status,409);
  const end=await json(host+'/api/campaigns');assert.equal(end.body.campaigns.find(c=>c.id==='clean-coast').raised,500);
 }finally{await close(server);await close(fake);await rm(directory,{recursive:true,force:true});}
});
