export const STORAGE_KEY = 'bryggis-demo-v1';
export const TIME_ZONE = 'Europe/Stockholm';
// Piloten har ett enda abonnemang per kafé: bryggkaffe, en kopp om dagen.
// Priset är cirka 15 gånger priset för en kopp (39 kr), avrundat nedåt.
export const PLAN_TYPES = [
  {id:'daily',name:'Dagens kaffe',price:579,regularPrice:39,description:'Nybryggt kaffe, en kopp om dagen.',benefit:'Bryggkaffe varje dag',drinks:['Bryggkaffe']}
];
const ACTIVE_ORDERS = ['queued','preparing','ready'];
export class AppError extends Error { constructor(message){super(message);this.name='AppError';} }
export function dayKey(time=Date.now()) {return new Intl.DateTimeFormat('sv-SE',{timeZone:TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));}
export function minutesOfDay(time=Date.now()) {const parts=new Intl.DateTimeFormat('en-GB',{timeZone:TIME_ZONE,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(time));return Number(parts.find(p=>p.type==='hour').value)*60+Number(parts.find(p=>p.type==='minute').value);}
export const toMinutes = value => Number(value.split(':')[0])*60+Number(value.split(':')[1]);
export const addDays = (day,amount) => {const d=new Date(`${day}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10);};
export function addMonth(day,anchorDay) {const [y,m,d]=day.split('-').map(Number),last=new Date(Date.UTC(y,m+1,0)).getUTCDate();return `${m===12?y+1:y}-${String(m===12?1:m+1).padStart(2,'0')}-${String(Math.min(anchorDay||d,last)).padStart(2,'0')}`;}
export const uid = () => globalThis.crypto?.randomUUID?.() || `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,11)}`;
export function planFor(state,id=state.subscription.plan) {const p=PLAN_TYPES.find(p=>p.id===id)||PLAN_TYPES[0];return {...p,price:Number(state.cafe.prices[p.id]??p.price),regularPrice:Number(state.cafe.regularPrices[p.id]??p.regularPrice)};}
export function createState(now=Date.now(),samples=true) {
  const day=dayKey(now);
  return {version:2,revision:0,day,
    cafe:{name:'Ditt Kafé',address:'Runt hörnet, i ditt kvarter',open:'07:00',close:'18:00',prepMinutes:4,paused:false,prices:{daily:579},regularPrices:{daily:39},bean:'Etiopien Guji',beanNote:'Ljusrost · jasmin, citrus & bergamott'},
    profile:{name:'Alex Andersson',email:'alex@example.com',favorite:{drink:'Bryggkaffe',milk:'Svart',takeaway:true}},
    subscription:{plan:'daily',price:579,active:true,cancelling:false,periodStart:day,periodEnd:addMonth(day),billingDay:Number(day.slice(-2))},
    orders:samples?[
      {id:'example-nora',name:'Nora A.',drink:'Bryggkaffe',milk:'Svart',takeaway:true,fika:false,createdAt:now-120000,dueAt:now+4*60000,status:'preparing',startedAt:now-30000,own:false,day,number:'101'},
      {id:'example-sara',name:'Sara L.',drink:'Bryggkaffe',milk:'Havredryck',takeaway:true,fika:false,createdAt:now-90000,dueAt:now+9*60000,status:'queued',own:false,day,number:'102'},
      {id:'example-omar',name:'Omar K.',drink:'Bryggkaffe',milk:'Vanlig mjölk',takeaway:false,fika:false,createdAt:now-60000,dueAt:now+12*60000,status:'queued',own:false,day,number:'103'},
      {id:'example-elin',name:'Elin B.',drink:'Bryggkaffe',milk:'Svart',takeaway:true,fika:false,createdAt:now-8*60000,dueAt:now-60000,status:'ready',startedAt:now-6*60000,readyAt:now-60000,own:false,day,number:'104'}
    ]:[],redemptions:{},history:[],log:samples?[
      {id:'log-jonas',name:'Jonas P.',drink:'Bryggkaffe',at:now-7*60000,kind:'counter',sample:true},
      {id:'log-maja',name:'Maja S.',drink:'Bryggkaffe',at:now-10*60000,kind:'preorder',sample:true},
      {id:'log-ali',name:'Ali R.',drink:'Bryggkaffe',at:now-14*60000,kind:'counter',sample:true}
    ]:[],nextNumber:105};
}
const validString=(v,max=160)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const validTime=v=>typeof v==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
export function migrateState(raw,now=Date.now()) {
  const base=createState(now);
  if(!raw || typeof raw!=='object' || ![1,2].includes(raw.version))return base;
  if(raw.version===1){
    if(validString(raw.profile?.name,60))base.profile.name=raw.profile.name;
    if(validString(raw.profile?.email))base.profile.email=raw.profile.email;
    if(PLAN_TYPES.some(p=>p.id===raw.subscription?.plan))base.subscription={...base.subscription,...raw.subscription,price:PLAN_TYPES.find(p=>p.id===raw.subscription.plan).price};
    base.cafe.paused=raw.acceptingOrders===false;
    base.orders=Array.isArray(raw.orders)?raw.orders.filter(o=>validString(o.id)&&validString(o.name,60)&&Number.isFinite(o.createdAt)&&Number.isFinite(o.dueAt)).map((o,i)=>({...o,status:o.status==='pending'?'queued':o.status,day:dayKey(o.createdAt),number:String(101+i),milk:'Svart',takeaway:true,fika:false})):base.orders;
    base.nextNumber=101+base.orders.length;
    base.redemptions=raw.redemptions&&typeof raw.redemptions==='object'?raw.redemptions:{};
    base.history=Array.isArray(raw.history)?raw.history.filter(h=>Number.isFinite(h.at)&&validString(h.drink)).slice(0,300):[];
    base.log=Array.isArray(raw.log)?raw.log.filter(l=>validString(l.name,60)&&validString(l.drink)&&Number.isFinite(l.at)).map(l=>({...l,id:uid()})).slice(0,300):[];
    return rollState(base,now);
  }
  if(!validString(raw.profile?.name,60)||!validString(raw.profile?.email)||!Array.isArray(raw.orders)||!Array.isArray(raw.history)||!Array.isArray(raw.log)||!raw.redemptions||typeof raw.redemptions!=='object'||!PLAN_TYPES.some(p=>p.id===raw.subscription?.plan)||!validTime(raw.cafe?.open)||!validTime(raw.cafe?.close)||!validString(raw.cafe?.name,60))return base;
  const next={...base,...raw,cafe:{...base.cafe,...raw.cafe,prices:{...base.cafe.prices,...raw.cafe.prices},regularPrices:{...base.cafe.regularPrices,...raw.cafe.regularPrices}},profile:{...base.profile,...raw.profile,favorite:{...base.profile.favorite,...raw.profile.favorite}},subscription:{...base.subscription,...raw.subscription}};
  next.orders=next.orders.filter(o=>validString(o.id)&&validString(o.name,60)&&validString(o.drink)&&Number.isFinite(o.createdAt)&&Number.isFinite(o.dueAt)).slice(-300);
  next.history=next.history.filter(h=>Number.isFinite(h.at)&&validString(h.drink)).slice(0,300);
  next.log=next.log.filter(l=>Number.isFinite(l.at)&&validString(l.name,60)&&validString(l.drink)).slice(0,300);
  next.cafe.prepMinutes=Math.min(20,Math.max(1,Number(next.cafe.prepMinutes)||4));
  for(const p of PLAN_TYPES){
    if(!Number.isFinite(Number(next.cafe.prices[p.id]))||Number(next.cafe.prices[p.id])<50||Number(next.cafe.prices[p.id])>4999)next.cafe.prices[p.id]=p.price;
    if(!Number.isFinite(Number(next.cafe.regularPrices[p.id]))||Number(next.cafe.regularPrices[p.id])<5||Number(next.cafe.regularPrices[p.id])>500)next.cafe.regularPrices[p.id]=p.regularPrice;
  }
  if(!Number.isFinite(next.subscription.price)||next.subscription.price<0)next.subscription.price=planFor(next).price;
  next.subscription.billingDay=Math.min(31,Math.max(1,Number(next.subscription.billingDay)||Number(next.subscription.periodStart.slice(-2))));
  if(!Number.isInteger(next.nextNumber)||next.nextNumber<100)next.nextNumber=105;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(next.subscription.periodEnd))next.subscription.periodEnd=base.subscription.periodEnd;
  return rollState(next,now);
}
export function rollState(state,now=Date.now()) {
  const today=dayKey(now);
  if(state.day!==today){state.day=today;state.orders=state.orders.filter(o=>(o.day||dayKey(o.createdAt))===today);state.log=state.log.filter(l=>dayKey(l.at)===today);}
  let safety=0;
  while(state.subscription.active&&today>=state.subscription.periodEnd&&safety++<120){
    if(state.subscription.cancelling){state.subscription.active=false;break;}
    state.subscription.periodStart=state.subscription.periodEnd;
    state.subscription.periodEnd=addMonth(state.subscription.periodEnd,state.subscription.billingDay);
  }
  return state;
}
export function redemptionFor(state,now=Date.now()){return state.redemptions[dayKey(now)];}
export function currentOrder(state,now=Date.now()){const r=redemptionFor(state,now);return r?.orderId?state.orders.find(o=>o.id===r.orderId&&o.status!=='cancelled'):null;}
export function openStatus(state,now=Date.now()) {
  const min=minutesOfDay(now),opens=toMinutes(state.cafe.open),closes=toMinutes(state.cafe.close);
  const open=min>=opens&&min<closes;
  return {open,accepting:open&&!state.cafe.paused,reason:!open?'closed':state.cafe.paused?'paused':'open',remaining:Math.max(0,closes-min)};
}
function assertAvailable(state,kind,now){
  if(!state.subscription.active)throw new AppError('Välj ett aktivt abonnemang först.');
  if(redemptionFor(state,now))throw new AppError('Dagens kopp är redan beställd eller hämtad.');
  const status=openStatus(state,now);
  if(!status.open)throw new AppError(`Kaféet är stängt. Öppet ${state.cafe.open}–${state.cafe.close}.`);
  if(kind==='preorder'&&!status.accepting)throw new AppError('Kaféet har pausat nya förbeställningar.');
}
export function normalizeDrink(state,input={}) {
  const plan=planFor(state);
  const drink=plan.drinks.includes(input.drink)?input.drink:plan.drinks[0];
  const milks=drink==='Espresso'?['Utan mjölk']:['Svart','Vanlig mjölk','Havredryck'];
  let milk=milks.includes(input.milk)?input.milk:(['Caffè latte','Cappuccino','Flat white'].includes(drink)?'Vanlig mjölk':milks[0]);
  if(['Caffè latte','Cappuccino','Flat white'].includes(drink)&&milk==='Svart')milk='Vanlig mjölk';
  return {drink,milk,takeaway:input.takeaway!==false,fika:!!plan.fika};
}
export function createOrder(state,input,now=Date.now()) {
  rollState(state,now);assertAvailable(state,'preorder',now);
  const minutes=Number(input.minutes);
  if(![0,5,10,15,20].includes(minutes))throw new AppError('Välj en giltig hämtningstid.');
  const delay=Math.max(state.cafe.prepMinutes,minutes),status=openStatus(state,now);
  if(delay>=status.remaining)throw new AppError('Den tiden är efter stängning. Välj en tidigare hämtning.');
  const order={id:uid(),number:String(state.nextNumber++),day:dayKey(now),name:state.profile.name,...normalizeDrink(state,input),createdAt:now,dueAt:now+delay*60000,status:'queued',own:true};
  state.orders.push(order);state.redemptions[dayKey(now)]={kind:'preorder',orderId:order.id,at:now,drink:order.drink};return order;
}
export function redeemCounter(state,input,now=Date.now()) {
  rollState(state,now);assertAvailable(state,'counter',now);
  const drink=normalizeDrink(state,input),record={id:uid(),kind:'counter',at:now,...drink};
  state.redemptions[dayKey(now)]=record;state.history.unshift(record);state.log.unshift({...record,name:state.profile.name});return record;
}
export function transitionOrder(state,id,action,now=Date.now()) {
  const order=state.orders.find(o=>o.id===id);
  if(!order)throw new AppError('Beställningen finns inte längre.');
  if((order.day||dayKey(order.createdAt))!==dayKey(now))throw new AppError('Beställningen tillhör en tidigare dag.');
  if(action==='start'&&order.status==='queued'){order.status='preparing';order.startedAt=now;}
  else if(action==='ready'&&['queued','preparing'].includes(order.status)){order.previousStatus=order.status;order.status='ready';order.readyAt=now;}
  else if(action==='undo'&&order.status==='ready'){order.status=order.previousStatus==='queued'?'queued':'preparing';delete order.readyAt;}
  else if(action==='collect'&&order.status==='ready'){
    order.status='collected';order.collectedAt=now;
    const record={id:order.id,kind:'preorder',at:now,drink:order.drink,milk:order.milk,takeaway:order.takeaway,fika:order.fika};
    state.log.unshift({...record,name:order.name});
    if(order.own){state.history.unshift(record);const r=state.redemptions[order.day];if(r?.orderId===id)r.at=now;}
  }
  else if(action==='cancel'&&order.status==='queued'){
    order.status='cancelled';if(order.own&&state.redemptions[order.day]?.orderId===id)delete state.redemptions[order.day];
  }
  else if(action==='delay'&&ACTIVE_ORDERS.includes(order.status)){
    const newDue=Math.max(order.dueAt,now)+5*60000;
    if(minutesOfDay(newDue)>=toMinutes(state.cafe.close)||dayKey(newDue)!==dayKey(now))throw new AppError('Den tiden är efter stängning. Prata med personalen.');
    order.dueAt=newDue;order.delayed=true;
  }
  else throw new AppError('Beställningen har ändrats. Kontrollera dess senaste status.');
  return order;
}
export function activateSubscription(state,input,now=Date.now()) {
  const p=planFor(state,input.plan);
  if(!PLAN_TYPES.some(p=>p.id===input.plan))throw new AppError('Välj ett abonnemang.');
  if(!validString(input.name?.trim(),60)||input.name.trim().length<2)throw new AppError('Skriv minst två tecken i namnet.');
  if(!validString(input.email?.trim())||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email.trim()))throw new AppError('Kontrollera din e-postadress.');
  if(ACTIVE_ORDERS.includes(currentOrder(state,now)?.status))throw new AppError('Hämta eller avbryt din pågående beställning före abonnemangsbyte.');
  state.profile.name=input.name.trim();state.profile.email=input.email.trim();
  state.subscription={plan:p.id,price:p.price,active:true,cancelling:false,periodStart:dayKey(now),periodEnd:addMonth(dayKey(now)),billingDay:Number(dayKey(now).slice(-2))};
  state.profile.favorite=normalizeDrink(state,state.profile.favorite);
}
export function savingsFor(state,planId,visits){const p=planFor(state,planId),n=Math.max(1,Math.min(31,Number(visits)||20)),ordinary=n*p.regularPrice;return {visits:n,ordinary,cost:p.price,savings:ordinary-p.price,perCup:p.price/n,breakEven:Math.ceil(p.price/p.regularPrice)};}
export function nextNumber(state){return `#${state.nextNumber}`;}
