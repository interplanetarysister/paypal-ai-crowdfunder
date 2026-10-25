import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import {mkdtemp,rm} from 'node:fs/promises';
import {createApp} from '../server.mjs';
import {makePayPal} from '../src/paypal.mjs';

const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${server.address().port}`)));
const close=server=>new Promise(resolve=>server.close(resolve));
const request=async(base,route,body)=>{
 const response=await fetch(base+route,body?{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{});
 return {status:response.status,body:await response.json()};
};

test('sandbox readiness, declined-funding restart, and network-error capture retry',async()=>{
 const orders=new Map(),idempotency=new Map();let next=1;
 const fake=http.createServer(async(req,res)=>{
  const send=(status,data)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(data));};
  let raw='';for await(const part of req)raw+=part;
  if(req.url==='/v1/oauth2/token')return send(200,{access_token:'sandbox-fake-token'});
  if(req.url==='/v2/checkout/orders'&&req.method==='POST'){
   const input=JSON.parse(raw),id=`ORDER-${next++}`;
   const unit=input.purchase_units[0];
   const row={id,status:'CREATED',purchase_units:[{custom_id:unit.custom_id,amount:unit.amount,payments:{captures:[]}}],requests:[],attempts:0};
   orders.set(id,row);return send(201,{id,status:'CREATED'});
  }
  const match=req.url.match(/^\/v2\/checkout\/orders\/(ORDER-\d+)(\/capture)?$/);
  if(!match)return send(404,{});
  const row=orders.get(match[1]);if(!row)return send(404,{});
  if(match[2]){
   const key=req.headers['paypal-request-id'];row.requests.push(key);
   if(idempotency.has(key))return send(...idempotency.get(key));
   row.attempts++;
   if(row.id==='ORDER-1'&&row.attempts===1){
    const decline=[422,{details:[{issue:'INSTRUMENT_DECLINED'}]}];idempotency.set(key,decline);return send(...decline);
   }
   row.status='COMPLETED';
   row.purchase_units[0].payments.captures=[{id:`CAPTURE-${row.id}`,status:'COMPLETED',amount:row.purchase_units[0].amount}];
   if(row.id==='ORDER-2'&&row.attempts===1)return send(500,{error:'captured but response unavailable'});
   return send(201,row);
  }
  return send(200,row);
 });
 const remote=await listen(fake),folder=await mkdtemp(path.join(os.tmpdir(),'crowdfunder-checkout-'));
 process.env.NODE_ENV='test';
 const paypal=makePayPal({clientId:'fake-sandbox-id',secret:'fake-sandbox-secret',base:remote});
 const app=createApp({dataDir:folder,paypal}),base=await listen(app);
 try{
  assert.deepEqual((await request(base,'/api/paypal/readiness')).body,{sandbox:true,verifiedCredentials:true});
  const order1=await request(base,'/api/orders',{campaignId:'clean-coast',amount:'5'});
  assert.equal(order1.status,201);
  const route1=`/api/orders/${order1.body.id}/capture`;
  const declined=await request(base,route1,{});
  assert.equal(declined.status,409);
  assert.equal(declined.body.code,'INSTRUMENT_DECLINED');
  assert.equal((await request(base,'/api/campaigns')).body.campaigns[0].raised,0);
  const good=await request(base,route1,{});
  assert.equal(good.status,200);
  assert.equal(good.body.donation.amount,500);
  assert.notEqual(orders.get(order1.body.id).requests[0],orders.get(order1.body.id).requests[1], 'decline rotates capture key');
  assert.equal((await request(base,route1,{})).body.donation.id,good.body.donation.id);
  const order2=await request(base,'/api/orders',{campaignId:'clean-coast',amount:'7'});
  const route2=`/api/orders/${order2.body.id}/capture`;
  assert.equal((await request(base,route2,{})).status,502);
  const recovered=await request(base,route2,{});
  assert.equal(recovered.status,200);
  assert.equal(recovered.body.donation.amount,700);
  assert.equal(orders.get(order2.body.id).attempts,1,'completed remote order is not recaptured');
  const campaigns=await request(base,'/api/campaigns');
  assert.equal(campaigns.body.campaigns[0].raised,1200);
  assert.equal(campaigns.body.campaigns[0].donations,2);
 }finally{await close(app);await close(fake);await rm(folder,{recursive:true,force:true});}
});