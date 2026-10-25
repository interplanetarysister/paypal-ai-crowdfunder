import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {makeStore} from './src/store.mjs';
import {makePayPal} from './src/paypal.mjs';
import {propose} from './src/ai.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const files={'/':'index.html','/app.js':'app.js','/style.css':'style.css'};
const mime={'html':'text/html; charset=utf-8','js':'application/javascript; charset=utf-8','css':'text/css; charset=utf-8'};
export function createApp({dataDir=path.join(root,'.data'),paypal=makePayPal({clientId:process.env.PAYPAL_CLIENT_ID,secret:process.env.PAYPAL_CLIENT_SECRET}),webhookId=process.env.PAYPAL_WEBHOOK_ID||''}={}){
  const store=makeStore(dataDir);const capturing=new Map();
  const respond=(res,status,body,extra={})=>{
    const text=typeof body==='string'?body:JSON.stringify(body);
    res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer',...extra});res.end(text);
  };
  const error=(res,e)=>respond(res,e.status&&[400,401,403,404,409,413,503].includes(e.status)?e.status:500,{error:e.status&&e.status<500?e.message:'Request could not be completed. Check the server log.'});
  const bad=(message,status=400)=>Object.assign(new Error(message),{status});
  const body=async req=>{
    if(!req.headers['content-type']?.startsWith('application/json'))throw bad('JSON request required.');
    let text='';for await(const chunk of req){text+=chunk;if(text.length>10000)throw bad('Request too large.',413);}
    try{return JSON.parse(text)}catch{throw bad('Invalid JSON.');}
  };
  const cents=value=>{
    const raw=String(value??'');if(!/^(?:[1-9]\d{0,4})(?:\.\d{1,2})?$/.test(raw))throw bad('Enter a USD donation between $1 and $10,000.');
    const [d,c='']=raw.split('.');const amount=Number(d)*100+Number(c.padEnd(2,'0'));
    if(!Number.isSafeInteger(amount)||amount<100||amount>1000000)throw bad('Invalid donation amount.');return amount;
  };
  const totals=s=>s.campaigns.map(c=>({...c,raised:Object.values(s.captures).filter(x=>x.campaignId===c.id).reduce((a,x)=>a+x.amount,0),donations:Object.values(s.captures).filter(x=>x.campaignId===c.id).length}));
  function verifiedCapture(response,record){
    if(response.id!==record.paypalOrderId||response.status!=='COMPLETED')throw bad('Order has not completed payment.',409);
    const units=response.purchase_units||[];if(units.length!==1||units[0].custom_id!==record.campaignId||units[0].amount?.currency_code!=='USD'||units[0].amount?.value!==(record.amount/100).toFixed(2))throw bad('PayPal order does not match campaign or amount.',409);
    const captures=units[0].payments?.captures||[];
    if(captures.length!==1||captures[0].status!=='COMPLETED'||captures[0].amount?.currency_code!=='USD'||captures[0].amount?.value!==(record.amount/100).toFixed(2)||!captures[0].id)throw bad('PayPal capture not verified.',409);
    return captures[0].id;
  }
  async function reconcile(orderId,requestCapture){
    if(capturing.has(orderId))return capturing.get(orderId);
    const work=(async()=>{
      const initial=await store.load(),record=initial.orders[orderId];if(!record)throw bad('Unknown PayPal order.',404);
      if(record.captureId&&initial.captures[record.captureId])return initial.captures[record.captureId];
      let remote=await paypal.get(orderId);
      if(requestCapture&&remote.status!=='COMPLETED')remote=await paypal.capture(orderId,record.captureRequestId);
      const captureId=verifiedCapture(remote,record);
      return store.transact(s=>{
        const same=s.orders[orderId];if(!same||same.campaignId!==record.campaignId||same.amount!==record.amount)throw bad('Order details changed.',409);
        if(same.captureId&&s.captures[same.captureId])return s.captures[same.captureId];
        // One capture ID credits a campaign exactly once across both approval and webhook paths.
        if(s.captures[captureId]&&s.captures[captureId].orderId!==orderId)throw bad('Duplicate capture belongs to another order.',409);
        const donation=s.captures[captureId]||{id:captureId,orderId,campaignId:same.campaignId,amount:same.amount,currency:'USD',verified:true,recordedAt:new Date().toISOString()};
        s.captures[captureId]=donation;same.captureId=captureId;return donation;
      });
    })().finally(()=>capturing.delete(orderId));capturing.set(orderId,work);return work;
  }
  const server=http.createServer(async(req,res)=>{
    const url=new URL(req.url||'/',`http://${req.headers.host||'127.0.0.1'}`);
    try{
      if(req.method==='GET'&&files[url.pathname]){
        const name=files[url.pathname];const ext=name.split('.').at(-1);const text=await readFile(path.join(root,'public',name));
        const csp="default-src 'self'; script-src 'self' https://www.paypal.com https://www.paypalobjects.com; connect-src 'self' https://www.paypal.com https://www.sandbox.paypal.com; frame-src https://www.paypal.com https://www.sandbox.paypal.com; img-src 'self' data: https://www.paypalobjects.com https://www.paypal.com; style-src 'self' 'unsafe-inline'; base-uri 'none'; form-action 'self'";
        res.writeHead(200,{'content-type':mime[ext], 'cache-control':'no-store','content-security-policy':csp,'x-content-type-options':'nosniff'});res.end(text);return;
      }
      if(req.method==='GET'&&url.pathname==='/api/status')return respond(res,200,{sandbox:true,paypalConfigured:paypal.configured,clientId:paypal.clientId,ai:{type:'Multinomial Naive Bayes',local:true,noPaidCredits:true},version:'1.0.0'});
      if(req.method==='GET'&&url.pathname==='/api/campaigns')return respond(res,200,{campaigns:totals(await store.load())});
      if(req.method==='GET'&&url.pathname==='/api/health')return respond(res,200,{status:'ok',sandbox:true});
      if(!['POST'].includes(req.method))return respond(res,404,{error:'Route not found.'});
      const origin=req.headers.origin;
      if(origin&&new URL(origin).host!==req.headers.host)throw bad('Cross-origin requests are not permitted.',403);
      if(url.pathname==='/api/ai/draft'){
        const input=await body(req);const who=String(input.who||''),need=String(input.need||''),impact=String(input.impact||'');return respond(res,200,{draft:propose({who,need,impact,goal:cents(input.goal)})});
      }
      if(url.pathname==='/api/campaigns'){
        const input=await body(req);const title=String(input.title||'').trim(),summary=String(input.summary||'').trim(),story=String(input.story||'').trim();
        if(title.length<5||title.length>120||summary.length<10||summary.length>600||story.length<40||story.length>4000)throw bad('Review the title, summary and story before creating a campaign.');
        const amount=cents(input.goal),category=String(input.category||'other');
        if(!['medical','education','animals','environment','community','creative','business','emergency','other'].includes(category))throw bad('Invalid category.');
        const campaign=await store.transact(s=>{const c={id:randomUUID(),title,summary,story,category,goal:amount,createdAt:new Date().toISOString(),demo:true};s.campaigns.unshift(c);return c;});
        return respond(res,201,{campaign});
      }
      if(url.pathname==='/api/orders'){
        if(!paypal.configured)throw bad('Configure PayPal sandbox credentials to test checkout.',503);
        const input=await body(req);const amount=cents(input.amount),s=await store.load();const campaign=s.campaigns.find(c=>c.id===input.campaignId);
        if(!campaign)throw bad('Campaign not found.',404);
        const requestId=randomUUID(),order=await paypal.create(campaign,amount,requestId);
        if(!order.id||!['CREATED','PAYER_ACTION_REQUIRED','APPROVED'].includes(order.status))throw bad('PayPal did not create a valid sandbox order.',502);
        await store.transact(state=>{state.orders[order.id]={paypalOrderId:order.id,campaignId:campaign.id,amount,captureRequestId:randomUUID(),createdAt:new Date().toISOString()};});
        return respond(res,201,{id:order.id});
      }
      const captured=url.pathname.match(/^\/api\/orders\/([\w-]{3,100})\/capture$/);
      if(captured){await body(req);return respond(res,200,{donation:await reconcile(captured[1],true)});}
      if(url.pathname==='/api/webhooks/paypal'){
        const event=await body(req);
        if(!paypal.configured||!webhookId)throw bad('Sandbox webhook is not configured.',503);
        if(!await paypal.verify(new Headers(req.headers),event,webhookId))throw bad('Webhook signature is invalid.',403);
        const eventId=String(event.id||'');if(!eventId)throw bad('Missing webhook event id.');
        const state=await store.load();if(state.events[eventId])return respond(res,200,{duplicate:true});
        if(event.event_type==='PAYMENT.CAPTURE.COMPLETED'){
          const orderId=event.resource?.supplementary_data?.related_ids?.order_id;
          if(orderId&&state.orders[orderId])await reconcile(orderId,false);
        }
        await store.transact(s=>{s.events[eventId]={event_type:String(event.event_type||''),verifiedAt:new Date().toISOString()};});
        return respond(res,200,{received:true});
      }
      return respond(res,404,{error:'Route not found.'});
    }catch(e){console.error('[crowdfunder]',e.message);error(res,e);}
  });
  return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const host=process.env.HOST||'127.0.0.1',port=Number(process.env.PORT||3000);
  if(!['127.0.0.1','localhost'].includes(host))throw Error('Public binding is disabled for the authentication-free demo.');
  createApp({dataDir:process.env.DEMO_DATA_DIR||undefined}).listen(port,host,()=>console.log(`Crowdfunder sandbox demo: http://${host}:${port}`));
}
