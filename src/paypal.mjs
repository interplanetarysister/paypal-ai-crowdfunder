// PayPal REST v2 sandbox-only adapter. Never expose client secret to browsers.
export function makePayPal({clientId,secret,base='https://api-m.sandbox.paypal.com'}){
  if(!/^https:\/\/api-m\.sandbox\.paypal\.com$/.test(base)&&! (process.env.NODE_ENV==='test'&&/^http:\/\/127\.0\.0\.1:\d+$/.test(base)))throw Error('Only PayPal sandbox endpoint is permitted.');
  const configured=Boolean(clientId&&secret);
  async function token(){
    if(!configured)throw Object.assign(Error('Sandbox credentials are not configured'),{status:503});
    const res=await fetch(base+'/v1/oauth2/token',{method:'POST',headers:{authorization:'Basic '+Buffer.from(clientId+':'+secret).toString('base64'),'content-type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials',signal:AbortSignal.timeout(15000)});
    const json=await res.json();if(!res.ok||!json.access_token)throw Object.assign(Error('PayPal sandbox authentication failed'),{status:502});return json.access_token;
  }
  async function api(endpoint,method='GET',body,requestId){
    const access=await token();const headers={authorization:'Bearer '+access,'content-type':'application/json'};
    if(requestId)headers['PayPal-Request-Id']=requestId;
    const res=await fetch(base+endpoint,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(20000)});
    const json=await res.json().catch(()=>({}));
    if(!res.ok){
      const issue=json.details?.[0]?.issue;
      if(issue==='INSTRUMENT_DECLINED')throw Object.assign(Error('Sandbox funding source declined. Choose a different funding method.'),{status:409,code:'INSTRUMENT_DECLINED'});
      if(issue==='ORDER_NOT_APPROVED')throw Object.assign(Error('Buyer approval is required before capture.'),{status:409,code:'ORDER_NOT_APPROVED'});
      throw Object.assign(Error(`PayPal sandbox request failed (${res.status})`),{status:502});
    }
    return json;
  }
  async function create(campaign,amount,idempotency){
    return api('/v2/checkout/orders','POST',{intent:'CAPTURE',purchase_units:[{reference_id:campaign.id,custom_id:campaign.id,description:campaign.title.slice(0,127),amount:{currency_code:'USD',value:(amount/100).toFixed(2)}}]},idempotency);
  }
  return {configured,clientId:configured?clientId:null,checkCredentials:async()=>Boolean(await token()),create,capture:(id,reqId)=>api('/v2/checkout/orders/'+encodeURIComponent(id)+'/capture','POST',undefined,reqId),get:(id)=>api('/v2/checkout/orders/'+encodeURIComponent(id)),verify:async(headers,event,webhookId)=>{
    if(!webhookId)return false;
    const body={auth_algo:headers.get('paypal-auth-algo'),cert_url:headers.get('paypal-cert-url'),transmission_id:headers.get('paypal-transmission-id'),transmission_sig:headers.get('paypal-transmission-sig'),transmission_time:headers.get('paypal-transmission-time'),webhook_id:webhookId,webhook_event:event};
    if(Object.values(body).some(v=>!v))return false;
    const result=await api('/v1/notifications/verify-webhook-signature','POST',body);
    return result.verification_status==='SUCCESS';
  }};
}
