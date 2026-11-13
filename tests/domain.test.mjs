import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAN_TYPES,UNKNOWN_AFTER_MINUTES,createState,dayKey,addMonth,rollState,createOrder,redeemCounter,transitionOrder,activateSubscription,savingsFor,migrateState,openStatus,slotFor,slotLoad,slotIsFull,pickupDue,nextFreePickupAt} from '../dist/domain.mjs';
const now=Date.parse('2026-11-04T10:00:00Z');
// Andra kunders beställningar som fyller ett intervall. Demon har bara en egen kund per dag.
const fill=(s,dueAt,count,status='queued')=>{for(let i=0;i<count;i++)s.orders.push({id:`gast-${dueAt}-${i}-${s.orders.length}`,name:`Gäst ${i}`,drink:'Bryggkaffe',milk:'Svart',takeaway:true,fika:false,createdAt:now,dueAt,capacitySlot:slotFor(dueAt),cancelUntil:now,status,own:false,day:s.day,number:String(300+s.orders.length)});};
test('Kapacitetstak: en femte beställning i samma intervall nekas och nästa lediga tid föreslås',()=>{
  const s=createState(now,false),due=pickupDue(s,10,now),slot=slotFor(due);
  fill(s,due,3);fill(s,due,1,'collected');
  assert.equal(slotLoad(s,slot),4);assert.ok(slotIsFull(s,slot));
  assert.throws(()=>createOrder(s,{minutes:10},now),/Den tiden är full\. Nästa lediga tid är 11:15\./);
  assert.equal(s.redemptions[s.day],undefined);
  const o=createOrder(s,{minutes:15},now);
  assert.equal(o.capacitySlot,slotFor(pickupDue(s,15,now)));
});
test('Kapacitetstak: en avbokning frigör platsen',()=>{
  const s=createState(now,false),due=pickupDue(s,20,now),slot=slotFor(due);
  fill(s,due,3);
  const o=createOrder(s,{minutes:20},now);
  assert.ok(slotIsFull(s,slot));
  transitionOrder(s,o.id,'cancel',now+1000);
  assert.equal(slotLoad(s,slot),3);
  createOrder(s,{minutes:20},now+2000);
  assert.equal(slotLoad(s,slot),4);
});
test('Kapacitetstak: 5 minuter senare stoppas av en full tid, men en klar kopp behåller sitt intervall',()=>{
  const s=createState(now,false),o=createOrder(s,{minutes:10},now),slot=o.capacitySlot,due=o.dueAt;
  fill(s,due+5*60000,4);
  assert.throws(()=>transitionOrder(s,o.id,'delay',now+60000),/Tiden 11:15 är full\. Din beställning ligger kvar 11:10\./);
  assert.equal(o.dueAt,due);assert.equal(o.capacitySlot,slot);assert.equal(o.delayed,undefined);
  transitionOrder(s,o.id,'ready',now+2*60000);
  transitionOrder(s,o.id,'delay',now+3*60000);
  assert.equal(o.dueAt,due+5*60000);assert.equal(o.capacitySlot,slot);assert.equal(slotLoad(s,slot),1);
  assert.throws(()=>transitionOrder(s,o.id,'cancel',now+3*60000));
});
test('Kapacitetstak: när allt är fullt hänvisas kunden till kassan',()=>{
  const s=createState(now,false);s.cafe.slotCapacity=1;s.cafe.close='11:12';
  for(const m of [0,5,10])fill(s,pickupDue(s,m,now),1);
  assert.equal(nextFreePickupAt(s,undefined,now),null);
  assert.throws(()=>createOrder(s,{minutes:0},now),/Alla tider är fulla just nu\. Du kan hämta direkt i kassan\./);
  redeemCounter(s,{},now);
});
test('Kapacitetstak: inställningen ligger mellan 1 och 20, och äldre data får standardvärde och intervall',()=>{
  const s=createState(now,false),o=createOrder(s,{minutes:15},now);
  delete s.cafe.slotCapacity;delete o.capacitySlot;
  const m=migrateState(JSON.parse(JSON.stringify(s)),now);
  assert.equal(m.cafe.slotCapacity,4);assert.equal(m.orders[0].capacitySlot,slotFor(o.dueAt));
  for(const [value,expected] of [[99,20],[-3,1],['x',4],[7,7]]){s.cafe.slotCapacity=value;assert.equal(migrateState(JSON.parse(JSON.stringify(s)),now).cafe.slotCapacity,expected);}
  assert.ok(createState(now).orders.every(x=>Number.isFinite(x.capacitySlot)));
  assert.throws(()=>createOrder(createState(now,false),{minutes:7},now),/giltig/);
});
test('Sista lediga intervall före stängning går att boka med den visade klocktiden',()=>{
  const at=Date.parse('2026-11-12T10:02:00Z'),s=createState(at,false);
  s.cafe.slotCapacity=1;s.cafe.close='11:16';
  fill(s,at+4*60_000,1);
  fill(s,at+10*60_000,1);
  const lastPickup=Date.parse('2026-11-12T10:15:00Z');
  assert.equal(nextFreePickupAt(s,undefined,at),lastPickup);
  assert.throws(()=>createOrder(s,{minutes:5},at),/Nästa lediga tid är 11:15/);
  assert.throws(()=>createOrder(s,{pickupAt:lastPickup},lastPickup-3*60_000),/för nära hämtningstiden/);
  const order=createOrder(s,{pickupAt:lastPickup},at+60_000);
  assert.equal(order.dueAt,lastPickup);
  assert.equal(order.cancelUntil,lastPickup-4*60_000);
});
test('Nästa lediga tid stannar vid bokningens 180-minutersgräns',()=>{
  const s=createState(now,false);s.cafe.slotCapacity=1;
  for(let minutes=0;minutes<=180;minutes+=5)fill(s,pickupDue(s,minutes,now),1);
  assert.equal(nextFreePickupAt(s,undefined,now),null);
  assert.throws(()=>createOrder(s,{pickupAt:pickupDue(s,185,now)},now),/giltig hämtningstid/);
});
test('Ångra en senarelagd klar kopp kontrollerar platsen i dess nya intervall',()=>{
  const s=createState(now,false);s.cafe.slotCapacity=1;
  const order=createOrder(s,{minutes:10},now),originalSlot=order.capacitySlot;
  const newDue=order.dueAt+5*60_000,newSlot=slotFor(newDue);
  const cancelUntil=order.cancelUntil;
  fill(s,newDue,1);
  transitionOrder(s,order.id,'ready',now+60_000);
  transitionOrder(s,order.id,'delay',now+2*60_000);
  assert.throws(()=>transitionOrder(s,order.id,'undo',now+3*60_000),/ligger kvar på hyllan/);
  assert.equal(order.status,'ready');
  assert.equal(order.capacitySlot,originalSlot);
  s.orders.at(-1).status='cancelled';
  transitionOrder(s,order.id,'undo',now+3*60_000);
  assert.equal(order.status,'queued');
  assert.equal(order.dueAt,newDue);
  assert.equal(order.capacitySlot,newSlot);
  assert.equal(order.cancelUntil,cancelUntil);
  assert.equal(slotLoad(s,newSlot),1);
});
test('Förbeställning och kassa delar en kopp; kö kan avbrytas och släppa reservationen',()=>{
  const s=createState(now,false),o=createOrder(s,{minutes:5,drink:'Bryggkaffe'},now);
  assert.throws(()=>redeemCounter(s,{},now),/redan/);
  assert.throws(()=>createOrder(s,{minutes:5},now),/redan/);
  transitionOrder(s,o.id,'cancel',now);
  redeemCounter(s,{},now);
  assert.equal(s.history.length,1);
  assert.throws(()=>redeemCounter(s,{},now),/redan/);
});
test('Klar direkt från kön; ångra och kundens hämtning registreras bara en gång',()=>{
  const s=createState(now,false),o=createOrder(s,{minutes:10},now);
  assert.throws(()=>transitionOrder(s,o.id,'start',now+1000),/ändrats/);
  transitionOrder(s,o.id,'ready',now+3000);transitionOrder(s,o.id,'undo',now+4000);
  assert.equal(o.status,'queued');
  transitionOrder(s,o.id,'ready',now+5000);transitionOrder(s,o.id,'collect',now+6000);
  assert.equal(o.status,'collected');assert.equal(s.redemptions[s.day].at,now+6000);
  assert.throws(()=>transitionOrder(s,o.id,'collect',now+7000));
  assert.throws(()=>transitionOrder(s,o.id,'undo',now+7000));
  assert.equal(s.history.length,1);assert.equal(s.log.length,1);
});
test('Avbokning stängs vid en fast gräns som senare ankomst inte flyttar',()=>{
  const s=createState(now,false),o=createOrder(s,{minutes:10},now);
  assert.equal(o.cancelUntil,o.dueAt-s.cafe.prepMinutes*60000);
  transitionOrder(s,o.id,'delay',now+60000);transitionOrder(s,o.id,'delay',now+120000);
  assert.equal(o.cancelUntil,now+6*60000);
  assert.throws(()=>transitionOrder(s,o.id,'cancel',o.cancelUntil),/inte längre/);
  assert.equal(o.status,'queued');
  const t=createState(now,false),p=createOrder(t,{minutes:10},now);
  transitionOrder(t,p.id,'cancel',p.cancelUntil-1000);
  assert.equal(p.status,'cancelled');createOrder(t,{minutes:5},now);
});
test('Snarast kan inte avbokas, och gränsen gäller även efter omladdning',()=>{
  const s=createState(now,false),o=createOrder(s,{minutes:0},now);
  assert.equal(o.cancelUntil,now);
  assert.throws(()=>transitionOrder(s,o.id,'cancel',now),/inte längre/);
  const t=createState(now,false),p=createOrder(t,{minutes:15},now);
  const reloaded=migrateState(JSON.parse(JSON.stringify(t)),now+60000),q=reloaded.orders.find(x=>x.id===p.id);
  assert.equal(q.cancelUntil,p.cancelUntil);
  assert.throws(()=>transitionOrder(reloaded,q.id,'cancel',p.cancelUntil+1000),/inte längre/);
});
test('Ej hämtad och okänd hämtning ger aldrig en ny dagskopp och räknas inte som hämtade',()=>{
  const s=createState(now,false),o=createOrder(s,{minutes:5},now);
  transitionOrder(s,o.id,'ready',now+5*60000);transitionOrder(s,o.id,'no-show',now+25*60000);
  assert.equal(o.status,'not_collected');
  assert.throws(()=>transitionOrder(s,o.id,'collect',now+26*60000));
  assert.throws(()=>createOrder(s,{minutes:5},now+26*60000),/redan/);
  assert.throws(()=>redeemCounter(s,{},now+26*60000),/redan/);
  assert.equal(s.log.length,0);assert.equal(s.history.length,0);
  const t=createState(now,false),p=createOrder(t,{minutes:5},now);
  transitionOrder(t,p.id,'ready',now+5*60000);
  rollState(t,now+5*60000+(UNKNOWN_AFTER_MINUTES*60000)-1000);assert.equal(p.status,'ready');
  rollState(t,now+5*60000+UNKNOWN_AFTER_MINUTES*60000);
  assert.equal(p.status,'unknown');assert.equal(p.closedAt,now+5*60000+UNKNOWN_AFTER_MINUTES*60000);
  assert.throws(()=>transitionOrder(t,p.id,'collect',now+90*60000));
  assert.throws(()=>redeemCounter(t,{},now+90*60000),/redan/);
  assert.equal(t.log.length,0);assert.equal(t.history.length,0);
});
test('Äldre demodata med Börja-steget går tillbaka till kön utan ny avbokningsrätt',()=>{
  const s=createState(now,false),o=createOrder(s,{minutes:20},now);
  o.status='preparing';o.startedAt=now+1000;delete o.cancelUntil;
  const m=migrateState(JSON.parse(JSON.stringify(s)),now+2000),x=m.orders.find(y=>y.id===o.id);
  assert.equal(x.status,'queued');assert.equal(x.cancelUntil,now);
  assert.throws(()=>transitionOrder(m,x.id,'cancel',now+3000),/inte längre/);
  assert.ok(createState(now).orders.every(y=>['queued','ready'].includes(y.status)&&Number.isFinite(y.cancelUntil)));
});
test('Daggränsen använder Stockholm under vintertid och sommartid',()=>{
  assert.equal(dayKey(Date.parse('2026-11-04T23:01:00Z')),'2026-11-05');
  assert.equal(dayKey(Date.parse('2026-07-04T22:01:00Z')),'2026-07-05');
  const s=createState(now,false);redeemCounter(s,{},now);rollState(s,now+86400000);
  assert.equal(s.log.length,0);redeemCounter(s,{},now+86400000);assert.equal(s.history.length,2);
});
test('Stängt, paus och stängningstid begränsar nya beställningar',()=>{
  const s=createState(now,false);s.cafe.paused=true;
  assert.throws(()=>createOrder(s,{minutes:5},now),/pausat/);
  redeemCounter(s,{},now);
  const t=createState(now,false);assert.equal(openStatus(t,Date.parse('2026-11-04T05:00:00Z')).open,false);
  assert.throws(()=>redeemCounter(t,{},Date.parse('2026-11-04T05:00:00Z')),/stängt/);
  assert.throws(()=>createOrder(t,{minutes:15},Date.parse('2026-11-04T16:50:00Z')),/stängning/);
});
test('Ny aktivering av abonnemanget skapar aldrig en extra daglig kopp',()=>{
  const s=createState(now,false);redeemCounter(s,{},now);
  activateSubscription(s,{plan:'daily',name:'Alex Andersson',email:'alex@example.com'},now);
  assert.throws(()=>createOrder(s,{minutes:5},now),/redan/);assert.equal(s.subscription.price,579);
});
test('Avslut gäller vid periodslut; månadsslut och skottår klipps rätt',()=>{
  assert.equal(addMonth('2026-01-31'),'2026-02-28');assert.equal(addMonth('2028-01-31'),'2028-02-29');assert.equal(addMonth('2026-12-31'),'2027-01-31');
  const s=createState(now,false);s.subscription.cancelling=true;rollState(s,Date.parse('2026-12-04T10:00:00Z'));
  assert.equal(s.subscription.active,false);assert.throws(()=>redeemCounter(s,{},Date.parse('2026-12-04T10:00:00Z')),/aktivt/);
});
test('Kalkylen visar även när abonnemang kostar mer',()=>{
  const s=createState(now,false),a=savingsFor(s,'daily',4),b=savingsFor(s,'daily',20);
  assert.equal(a.savings,-423);assert.equal(b.savings,201);assert.equal(b.breakEven,15);
});
test('Månatlig förnyelse behåller originaldagen efter februari',()=>{
  const s=createState(Date.parse('2026-01-31T10:00:00Z'),false);
  rollState(s,Date.parse('2026-02-28T10:00:00Z'));
  assert.equal(s.subscription.periodEnd,'2026-03-31');
});
test('Äldre demo migreras med daglig reservation och kundnamn kvar',()=>{
  const old={version:1,profile:{name:'Test Kund',email:'test@example.com'},subscription:{plan:'daily',active:true},orders:[],redemptions:{'2026-11-04':{kind:'counter',at:now,drink:'Dagens kaffe'}},history:[],log:[]};
  const s=migrateState(old,now);assert.equal(s.version,2);assert.equal(s.profile.name,'Test Kund');assert.throws(()=>redeemCounter(s,{},now),/redan/);
});
test('Piloten har ett enda bryggkaffeabonnemang',()=>{
  assert.equal(PLAN_TYPES.length,1);
  assert.deepEqual(PLAN_TYPES[0].drinks,['Bryggkaffe']);
  assert.equal(createState(now,false).subscription.price,579);
  assert.ok(createState(now).orders.every(o=>o.drink==='Bryggkaffe'));
});
