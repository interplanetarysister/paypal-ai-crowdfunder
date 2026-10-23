// Multinomial Naive Bayes campaign category classifier. No API, network or paid tokens.
// Local training data is deliberately limited; review output before publishing.
const examples = {
  medical: ["fund emergency surgery treatment hospital recovery medicines", "medical transportation doctor appointments cancer care", "help a family pay for physical therapy medication"],
  education: ["buy school books tuition classroom supplies", "scholarship students education classes and learning", "fund coding workshop computers for students"],
  animals: ["rescue injured dog veterinary care shelter", "save sick cat vet treatment medicine", "animal rescue food and adoption assistance"],
  environment: ["clean beach protect ocean remove litter", "plant trees restore river habitat", "recycle waste community coastal cleanup"],
  community: ["neighborhood community center playground volunteer", "feed families in our town mutual aid", "organize accessible community gathering park"],
  creative: ["make independent music film and art", "fund theatre stage costumes performance", "publish illustrated comic creative story"],
  business: ["launch new product business startup", "develop app software technology prototype hackathon", "support local shop equipment entrepreneur"],
  emergency: ["wildfire evacuation urgent housing shelter", "flood disaster emergency temporary lodging", "replace lost household supplies after storm"]
};
const words = s => String(s||'').toLowerCase().match(/[a-z]{3,}/g)||[];
const model = Object.entries(examples).map(([category,documents])=> {
  const counts=new Map(); let total=0;
  for(const doc of documents)for(const w of words(doc)){counts.set(w,(counts.get(w)||0)+1); total++;}
  return {category,counts,total,documents:documents.length};
});
const vocabulary=new Set(model.flatMap(m=>[...m.counts.keys()]));
export function classify(text){
  const tokens=words(text).filter(w=>vocabulary.has(w));
  const rankings=model.map(m=>({category:m.category,score:Math.log(m.documents)+tokens.reduce((sum,w)=>sum+Math.log(((m.counts.get(w)||0)+1)/(m.total+vocabulary.size)),0)})).sort((a,b)=>b.score-a.score);
  return {category:rankings[0].category,confidence:tokens.length>0? 'signal-detected':'low',evidence:[...new Set(tokens)].slice(0,6)};
}
const audiences={medical:'family, friends, and community members',education:'educators, parents, and local supporters',animals:'animal lovers and local rescue supporters',environment:'local volunteers and environmental supporters',community:'neighbors and community volunteers',creative:'supporters of independent creative work',business:'builders, early adopters, and supporters',emergency:'friends, neighbors, and emergency relief supporters'};
export function propose({who,need,impact,goal}){
  for(const v of [who,need,impact])if(typeof v!=='string'||v.trim().length<4||v.length>1200)throw new Error('Please provide at least four characters for each campaign detail (maximum 1,200).');
  if(!Number.isSafeInteger(goal)||goal<100||goal>100000000)throw new Error('Goal must be between $1 and $1,000,000.');
  const category=classify([who,need,impact].join(' '));
  const clean=x=>x.replace(/\s+/g,' ').trim().replace(/[.!?]+$/,'');
  const subject=clean(who).slice(0,90), request=clean(need), result=clean(impact);
  return {category:category.category,confidence:category.confidence,evidence:category.evidence, audience:audiences[category.category],
    titles:[`Help ${subject}`,`What if we could ${result.charAt(0).toLowerCase()+result.slice(1)}`,`Together for ${subject}`].map(s=>s.slice(0,120)),
    summary:`Help ${subject} with ${request.charAt(0).toLowerCase()+request.slice(1)}. Goal: $${(goal/100).toFixed(2)}.`,
    story:`What if we could make a difference together?\n\nThis fundraiser is for ${subject}. The immediate need is ${request.charAt(0).toLowerCase()+request.slice(1)}.\n\nFunds are intended to help ${result.charAt(0).toLowerCase()+result.slice(1)}. Our fundraising goal is $${(goal/100).toFixed(2)}.\n\nPlease review this draft for accuracy, add a real spending breakdown, and explain how supporters will receive updates before sharing.`,
    disclaimer:'A locally trained Naive Bayes classifier suggested the category and audience. Story wording is based on your supplied facts, not external research.'};
}
