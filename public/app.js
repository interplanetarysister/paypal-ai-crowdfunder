const by=id=>document.getElementById(id);
const money=cents=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD'}).format(cents/100);
let sandbox,selectedCampaign=null,paypalLoaded=false,approvedOrderId=null;
const notice=(id,message,error=false)=>{by(id).textContent=message;by(id).classList.toggle('error',error);};
async function jsonFetch(url,options){const response=await fetch(url,{...options,headers:{'content-type':'application/json',...options?.headers}});const data=await response.json();if(!response.ok){const error=Error(data.error||'Request failed');error.code=data.code;throw error;}return data;}
function el(tag,text,css){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(css)e.className=css;return e;}
async function loadCampaigns(){
 const {campaigns}=await jsonFetch('/api/campaigns');const grid=by('campaign-grid');grid.replaceChildren();
 for(const c of campaigns){const card=el('article',undefined,'campaign');card.append(el('span',c.category,'chip'),el('h3',c.title),el('p',c.summary));
 const progress=el('div',undefined,'progress'),fill=el('span');fill.style.width=Math.min(100,Math.round(100*c.raised/c.goal))+'%';progress.append(fill);card.append(progress);
 const metrics=el('div',undefined,'metrics');metrics.append(el('span',money(c.raised)+' raised'),el('span',money(c.goal)+' goal'));card.append(metrics);
 const button=el('button',sandbox.paypalConfigured?'Donate with PayPal':'PayPal setup required','primary');button.disabled=!sandbox.paypalConfigured;button.onclick=()=>openCheckout(c);card.append(button);grid.append(card);
 }
}
async function start(){try{
 sandbox=await jsonFetch('/api/status');
 if(sandbox.paypalConfigured){
  by('paypal-state').textContent='Checking PayPal Sandbox credentials…';
  try{await jsonFetch('/api/paypal/readiness');by('paypal-state').textContent='PayPal Sandbox API connected — buyer checkout still requires approval';}
  catch(e){sandbox.paypalConfigured=false;by('paypal-state').textContent='PayPal Sandbox credential check failed: '+e.message;}
 }else{by('paypal-state').textContent='PayPal Sandbox credentials needed for checkout';}
 await loadCampaigns();
 }catch(e){by('paypal-state').textContent='Cannot reach local demo server';console.error(e);}}
by('draft-form').addEventListener('submit',async e=>{
 e.preventDefault();notice('draft-message','Training-data model is preparing suggestions…');
 try{const {draft}=await jsonFetch('/api/ai/draft',{method:'POST',body:JSON.stringify({who:by('who').value,need:by('need').value,impact:by('impact').value,goal:by('goal').value})});
 by('result').hidden=false;by('draft-title').value=draft.titles[0];by('draft-summary').value=draft.summary;by('draft-story').value=draft.story;
 const options=by('draft-title-options');options.replaceChildren();for(const title of draft.titles){const option=document.createElement('option');option.value=title;option.textContent=title;options.append(option);}options.value=draft.titles[0];
 by('ai-reason').textContent=`Suggested category: ${draft.category} · Audience: ${draft.audience} · ${draft.disclaimer}`;by('result').dataset.category=draft.category;
 notice('draft-message','Draft ready. Review the claims, title, and story before saving.');by('result').scrollIntoView({behavior:'smooth',block:'nearest'});
 }catch(e){notice('draft-message',e.message,true);}
});
by('draft-title-options').addEventListener('change',()=>{by('draft-title').value=by('draft-title-options').value;});
by('load-demo').addEventListener('click',()=>{
 by('who').value='Our neighborhood coastal cleanup volunteers';
 by('need').value='Reusable gloves, litter grabbers, and waste bags for a shoreline cleanup';
 by('impact').value='Remove litter from the shoreline and protect nearby habitats';
 by('goal').value='500';
 notice('draft-message','Example loaded. Select Generate an AI-assisted draft to see the local model work.');
 by('create').scrollIntoView({behavior:'smooth',block:'start'});by('who').focus({preventScroll:true});
});
by('save-campaign').onclick=async()=>{
 const button=by('save-campaign');button.disabled=true;
 try{await jsonFetch('/api/campaigns',{method:'POST',body:JSON.stringify({title:by('draft-title').value,summary:by('draft-summary').value,story:by('draft-story').value,category:by('result').dataset.category,goal:by('goal').value})});notice('draft-message','Campaign saved as a local sandbox demo.');await loadCampaigns();by('discover').scrollIntoView({behavior:'smooth'});}catch(e){notice('draft-message',e.message,true);}finally{button.disabled=false;}
};
function loadSdk(){if(paypalLoaded)return Promise.resolve();return new Promise((resolve,reject)=>{
 if(!sandbox.clientId)return reject(Error('PayPal client ID missing'));
 const script=document.createElement('script');const nonce=document.querySelector('meta[name="paypal-csp-nonce"]')?.content;if(nonce){script.nonce=nonce;script.setAttribute('data-csp-nonce',nonce);}script.src='https://www.paypal.com/sdk/js?client-id='+encodeURIComponent(sandbox.clientId)+'&currency=USD&intent=capture&components=buttons';script.onload=()=>{paypalLoaded=true;resolve()};script.onerror=()=>reject(Error('PayPal SDK could not load'));document.head.append(script);
});}
async function finalizeCapture(orderId,actions){
 notice('payment-message','Checking completed PayPal Sandbox capture…');
 try{
  const {donation}=await jsonFetch('/api/orders/'+encodeURIComponent(orderId)+'/capture',{method:'POST',body:'{}'});
  approvedOrderId=null;by('retry-capture').hidden=true;
  notice('payment-message',`Verified sandbox capture ${donation.id}. Amount ${money(donation.amount)} credited once.`);
  await loadCampaigns();
 }catch(error){
  if(error.code==='INSTRUMENT_DECLINED'&&actions?.restart){
   approvedOrderId=null;by('retry-capture').hidden=true;
   notice('payment-message','Sandbox payment method declined. Select another funding source.');
   return actions.restart();
  }
  notice('payment-message',error.message+' If you approved payment, retry verification; do not create a second order.',true);
  by('retry-capture').hidden=false;
 }
}
by('retry-capture').addEventListener('click',async()=>{
 if(!approvedOrderId)return;
 const button=by('retry-capture');button.disabled=true;
 try{await finalizeCapture(approvedOrderId);}finally{button.disabled=false;}
});
async function openCheckout(c){
 selectedCampaign=c;approvedOrderId=null;by('retry-capture').hidden=true;
 by('donation-title').textContent='Support '+c.title;
 notice('payment-message','');by('donation-dialog').showModal();
 try{
  await loadSdk();by('paypal-buttons').replaceChildren();
  await window.paypal.Buttons({
   createOrder:async()=>{
    const input=by('donation-amount');if(!input.reportValidity())throw Error('Enter a valid donation amount.');
    const {id}=await jsonFetch('/api/orders',{method:'POST',body:JSON.stringify({campaignId:c.id,amount:input.value})});
    return id;
   },
   onApprove:async(data,actions)=>{approvedOrderId=data.orderID;await finalizeCapture(data.orderID,actions);},
   onError:error=>notice('payment-message',error?.message||'Sandbox checkout failed. No donation has been confirmed.',true),
   onCancel:()=>{approvedOrderId=null;by('retry-capture').hidden=true;notice('payment-message','Checkout canceled; no donation credited.');}
  }).render('#paypal-buttons');
 }catch(e){notice('payment-message',e.message,true);}
}
start();
