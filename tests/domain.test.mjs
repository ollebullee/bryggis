import test from 'node:test';
import assert from 'node:assert/strict';
import {PLAN_TYPES,createState,dayKey,addMonth,rollState,createOrder,redeemCounter,transitionOrder,activateSubscription,savingsFor,migrateState,openStatus} from '../dist/domain.mjs';
const now=Date.parse('2026-11-04T10:00:00Z');
test('Förbeställning och kassa delar en kopp; kö kan avbrytas och släppa reservationen',()=>{
  const s=createState(now,false),o=createOrder(s,{minutes:5,drink:'Bryggkaffe'},now);
  assert.throws(()=>redeemCounter(s,{},now),/redan/);
  assert.throws(()=>createOrder(s,{minutes:5},now),/redan/);
  transitionOrder(s,o.id,'cancel',now);
  redeemCounter(s,{},now);
  assert.equal(s.history.length,1);
  assert.throws(()=>redeemCounter(s,{},now),/redan/);
});
test('Påbörjat kaffe kan inte avbrytas; klar/ångra/hämtad är konsekventa och idempotenta',()=>{
  const s=createState(now,false),o=createOrder(s,{minutes:10},now);
  transitionOrder(s,o.id,'start',now+1000);
  assert.throws(()=>transitionOrder(s,o.id,'cancel',now+2000));
  transitionOrder(s,o.id,'ready',now+3000);transitionOrder(s,o.id,'undo',now+4000);
  assert.equal(o.status,'preparing');
  transitionOrder(s,o.id,'ready',now+5000);transitionOrder(s,o.id,'collect',now+6000);
  assert.equal(s.redemptions[s.day].at,now+6000);
  assert.throws(()=>transitionOrder(s,o.id,'collect',now+7000));
  assert.equal(s.history.length,1);assert.equal(s.log.length,1);
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
