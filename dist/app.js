import {STORAGE_KEY,TIME_ZONE,PLAN_TYPES,UNKNOWN_AFTER_MINUTES,AppError,dayKey,addDays,createState,migrateState,rollState,planFor,redemptionFor,currentOrder,openStatus,normalizeDrink,createOrder,redeemCounter,transitionOrder,activateSubscription} from './domain.mjs';
import {icon,art} from './icons.mjs';

const $=s=>document.querySelector(s);
const esc=(v='')=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>new Intl.NumberFormat('sv-SE',{maximumFractionDigits:0}).format(v);
const time=(v=Date.now(),seconds=false)=>new Intl.DateTimeFormat('sv-SE',{timeZone:TIME_ZONE,hour:'2-digit',minute:'2-digit',...(seconds?{second:'2-digit'}:{})}).format(new Date(v));
const dateLabel=(v=Date.now(),long=false)=>new Intl.DateTimeFormat('sv-SE',{timeZone:TIME_ZONE,day:'numeric',month:long?'long':'short',...(long?{weekday:'long'}:{})}).format(new Date(typeof v==='string'&&v.length===10?`${v}T12:00:00Z`:v)).replace(/\.$/,'');
const fallback=createState();let state,storageOK=true;
function load(){try{return migrateState(JSON.parse(localStorage.getItem(STORAGE_KEY)));}catch{storageOK=false;return state||fallback;}}
state=load();
const plan=()=>planFor(state),order=()=>currentOrder(state),used=()=>redemptionFor(state),firstName=()=>state.profile.name.trim().split(/\s+/)[0];
const activeOrder=()=>['queued','preparing','ready'].includes(order()?.status)?order():null;
let ui={page:'hem',mode:'customer',plan:state.subscription.plan,minutes:5,draft:normalizeDrink(state,state.profile.favorite),filter:'all',search:'',busy:false,settingsDirty:false,customizing:false};
let toastTimer,ticketTimer,lastFocus,channel,installPrompt,writeChain=Promise.resolve();
try{channel=new BroadcastChannel('bryggis-demo-v2');channel.onmessage=()=>sync();}catch{}
function persist(){state.revision=(Number(state.revision)||0)+1;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(state));storageOK=true;channel?.postMessage('changed');}catch{storageOK=false;}}
persist();
function toast(message,error=false){
  clearTimeout(toastTimer);
  const el=$('#toast');
  el.setAttribute('role',error?'alert':'status');
  el.setAttribute('aria-live',error?'assertive':'polite');
  el.classList.toggle('error',error);
  el.textContent=message;
  el.classList.add('visible');
  toastTimer=setTimeout(()=>el.classList.remove('visible'),error?7000:4500);
}
function pendingButton(el,label){
  const html=el.innerHTML;
  el.disabled=true;
  el.setAttribute('aria-busy','true');
  el.innerHTML=`<span class="button-spinner" aria-hidden="true"></span>${label}`;
  return ()=>{if(el.isConnected){el.disabled=false;el.removeAttribute('aria-busy');el.innerHTML=html;}};
}
async function transaction(change){
  const run=()=>{state=storageOK?load():state;rollState(state);const next=structuredClone(state),result=change(next);state=next;persist();return result;};
  const attempt=async()=>{try{return navigator.locks?await navigator.locks.request('bryggis-state',run):run();}catch(error){toast(error instanceof AppError?error.message:'Det gick inte att spara. Försök igen.',true);throw error;}};
  const result=writeChain.then(attempt,attempt);writeChain=result.catch(()=>{});return result;
}
function sync(){const before=activeOrder()?.status;state=load();if(ui.settingsDirty&&ui.page==='installningar')return;render();if(before!=='ready'&&activeOrder()?.status==='ready')toast('Din kopp är klar! Välkommen in.');}
window.addEventListener('storage',e=>{if(e.key===STORAGE_KEY)sync();});
function route(){const page=location.hash.slice(1);if(page==='main')return;ui.page=['hem','abonnemang','konto','bestallning','bli-medlem','personal','installningar'].includes(page)?page:'hem';ui.mode=['personal','installningar'].includes(ui.page)?'staff':'customer';ui.settingsDirty=false;render();document.dispatchEvent(new CustomEvent('bryggis:navigate',{detail:{page:ui.page}}));window.scrollTo({top:0,behavior:'instant'});$('#main h1')?.focus({preventScroll:true});}
function navigate(page){if(location.hash===`#${page}`)route();else location.hash=page;}
window.addEventListener('hashchange',route);
function button(action,text,type='primary',value='',extra=''){return `<button type="button" class="${type}" data-action="${action}" ${value!==''?`data-value="${esc(value)}"`:''} ${extra}>${text}</button>`;}
function pageHead(kicker,title,subtitle='',aside=''){
  return `<header class="page-heading"><div>
    ${kicker?`<p class="page-context">${kicker}</p>`:''}
    <h1 tabindex="-1">${title}</h1>
    ${subtitle?`<p class="page-subtitle">${subtitle}</p>`:''}
  </div>${aside}</header>`;
}
function footer(){
  return `<footer class="footnote"><span>Interaktiv demo · ingen betalning</span><div>
    ${ui.page==='bli-medlem'?'':button('welcome','Prova registreringen','text-link')}
    ${button('about','Om demon','text-link')}
    ${button('install','Lägg till på hemskärmen','text-link')}
  </div></footer>`;
}
function shelfPickupNote(name,number){
  return `Hämta på hyllan vid kassan. Koppen är märkt <strong>${esc(name)}, #${esc(number)}</strong>.`;
}
const drinkDescription=o=>[o.milk,o.takeaway?'Ta med':'Drick här',o.fika?'Kanelbulle':''].filter(Boolean).join(' · ');
function nav(){
  const staff=ui.mode==='staff';
  const links=staff?[['personal','queue','Beställningar'],['installningar','settings','Kaféinställningar']]:[['hem','home','Hem'],['abonnemang','card','Abonnemang'],['konto','user','Mitt konto']];
  const active=k=>ui.page===k||k==='hem'&&ui.page==='bestallning'||k==='abonnemang'&&ui.page==='bli-medlem';
  $('#desktop-nav').innerHTML=links.map(([k,i,l])=>`<a href="#${k}" class="nav-link ${active(k)?'active':''}" ${active(k)?'aria-current="page"':''}>${icon(i)}<span>${l}</span></a>`).join('');
  $('#mobile-nav').innerHTML=links.map(([k,i,l])=>`<a href="#${k}" class="${active(k)?'active':''}" ${active(k)?'aria-current="page"':''}>${icon(i)}<span>${k==='konto'?'Konto':k==='installningar'?'Inställningar':l}</span></a>`).join('');
  $('#customer-mode').setAttribute('aria-pressed',String(!staff));
  $('#staff-mode').setAttribute('aria-pressed',String(staff));
}
function membership(){
  const p=plan(),sub=state.subscription;
  return `<section class="panel membership" aria-labelledby="membership-title">
    <h2 id="membership-title">Ditt abonnemang</h2>
    <p class="membership-summary"><strong>${esc(p.name)}</strong><span>${money(sub.price)} kr/mån</span></p>
    ${!sub.active?'<p>Avslutat</p>':sub.cancelling?`<p>Avslutas ${esc(dateLabel(sub.periodEnd))}</p>`:''}
    ${button('plans','Visa abonnemang '+icon('arrow'),'text-link')}
  </section>`;
}
function choices(label,values,current,action){return `<fieldset class="choice-field"><legend>${label}</legend><div class="choice-options">${values.map(([v,l],i)=>button(action,l,`choice ${String(current)===String(v)?'selected':''}`,String(v),`id="choice-${action}-${i}" aria-pressed="${String(current)===String(v)}"`)).join('')}</div></fieldset>`;}
function composer(){
  const p=plan(),r=used(),o=activeOrder(),availability=openStatus(state),d=ui.draft;
  const pickupMinutes=Math.max(state.cafe.prepMinutes,ui.minutes);
  const canOrder=availability.accepting&&pickupMinutes<availability.remaining;
  if(!state.subscription.active)return `<section class="panel empty-state">
    <h2>Välj ett abonnemang</h2><p>Ditt demoabonnemang har avslutats.</p>
    ${button('plans','Visa abonnemang '+icon('arrow'))}
  </section>`;
  if(o){
    const ready=o.status==='ready';
    return `<section class="panel active-order-card">
      <h2>${ready?'Din kopp är klar':o.status==='preparing'?'Ditt kaffe förbereds':'Beställningen är mottagen'}</h2>
      <p>${ready?shelfPickupNote(firstName(),o.number):`Beräknad hämtning <strong>${time(o.dueAt)}</strong>.`}</p>
      <div class="active-drink">
        <span class="drink-icon">${icon('cup')}</span>
        <div><h3>${esc(o.drink)}${o.fika?' + kanelbulle':''}</h3><span>${esc(drinkDescription(o))}</span></div>
        ${ready?'':`<strong>#${esc(o.number)}</strong>`}
      </div>
      ${ready?button('collect-own',icon('check')+'Jag har hämtat mitt kaffe')+button('order-status','Se beställningen '+icon('arrow'),'text-link'):button('order-status','Följ min beställning '+icon('arrow'))}
    </section>`;
  }
  const closed=r?.orderId?state.orders.find(x=>x.id===r.orderId&&['not_collected','unknown'].includes(x.status)):null;
  if(closed)return `<section class="panel done-card">
    <div class="done-icon">${icon('info')}</div><h2>Dagens förbeställning är avslutad</h2>
    <p>${closed.status==='not_collected'?'Koppen hämtades inte.':'Vi fick ingen bekräftelse på att koppen hämtades.'}</p>
    <div class="next-cup"><span>${icon('calendar')}Nästa kopp</span><strong>${dateLabel(addDays(dayKey(),1))} från ${state.cafe.open}</strong></div>
  </section>`;
  if(r)return `<section class="panel done-card">
    <div class="done-icon">${icon('check')}</div><h2>Dagens kopp är hämtad</h2>
    <p>Du hämtade ${esc(r.drink.toLowerCase())} klockan ${time(r.at)}.</p>
    ${r.kind==='counter'&&Date.now()-r.at<120000?button('show-ticket','Visa hämtbekräftelsen','secondary'):''}
    <div class="next-cup"><span>${icon('calendar')}Nästa kopp</span><strong>${dateLabel(addDays(dayKey(),1))} från ${state.cafe.open}</strong></div>
  </section>`;
  const milkChoices=['Caffè latte','Cappuccino','Flat white'].includes(d.drink)
    ?[['Vanlig mjölk','Vanlig mjölk'],['Havredryck','Havredryck']]
    :[['Svart','Svart'],['Vanlig mjölk','Mjölk'],['Havredryck','Havredryck']];
  return `<section class="panel order-panel" aria-label="Välj kaffe och hämtningstid">
    <div class="current-cup">
      <span class="drink-icon">${icon('cup')}</span>
      <div><h2>${esc(d.drink)}${p.fika?' + kanelbulle':''}</h2><p>${esc(drinkDescription({...d,fika:false}))}</p></div>
    </div>
    <details class="customize-cup" id="customize-cup" ${ui.customizing?'open':''}>
      <summary>Anpassa koppen</summary>
      <div>
        ${p.drinks.length>1?choices('Dryck',p.drinks.map(drink=>[drink,esc(drink)]),d.drink,'drink'):''}
        ${d.drink!=='Espresso'?choices('Mjölk',milkChoices,d.milk,'milk'):''}
        ${choices('Hur vill du ha kaffet?',[['true','Ta med'],['false','Drick här']],d.takeaway,'takeaway')}
        <div class="customize-actions">
          ${button('favorite',icon('reset')+'Återställ till min favorit','text-link')}
          ${button('save-favorite','Spara som favorit','text-link')}
        </div>
      </div>
    </details>
    <div class="arrival-heading"><h2 id="arrival-title">När vill du hämta?</h2><span id="prep-time">Minst ${state.cafe.prepMinutes} min tillagning</span></div>
    <div class="time-options" role="group" aria-labelledby="arrival-title" aria-describedby="prep-time">
      ${[0,5,10,15,20].map(n=>button('time',n===0?'Snarast':`${n} min`,ui.minutes===n?'selected':'',String(n),`id="pickup-time-${n}" aria-pressed="${ui.minutes===n}"`)).join('')}
    </div>
    ${canOrder?`<p class="planned-time"><span>Beräknad hämtning</span><time id="planned-pickup">${time(Date.now()+pickupMinutes*60000)}</time></p>`:`<div class="availability-note" id="preorder-unavailable">
      ${icon('time')}<div>
        <strong>${availability.reason==='closed'?'Kaféet är stängt':availability.reason==='paused'?'Förbeställningarna är pausade':'Den tiden är för nära stängning'}</strong>
        <p>${availability.reason==='closed'?`Öppet ${state.cafe.open}–${state.cafe.close}.`:availability.reason==='paused'?'Du kan hämta i kassan.':`Välj en tidigare tid eller hämta i kassan före ${state.cafe.close}.`}</p>
      </div></div>`}
    ${button('preorder','Förbered mitt kaffe '+icon('arrow'),'primary','',canOrder?'':'disabled aria-describedby="preorder-unavailable"')}
    ${button('counter','Hämta i kassan','secondary','',availability.open?'':'disabled')}
  </section>`;
}

function cafeCard(){
  const s=openStatus(state);
  return `<section class="panel cafe-card">
    <div class="section-top"><h2>${esc(state.cafe.name)}</h2><span class="tiny-open ${s.open?'':'closed'}"><span></span>${s.open?'Öppet':'Stängt'}</span></div>
    <p class="cafe-address">${icon('pin')}${esc(state.cafe.address)}</p>
    <p class="cafe-hours">${icon('time')}${state.cafe.open}–${state.cafe.close} varje dag</p>
    <div class="bean-block"><div><small>Dagens bryggkaffe</small><strong>${esc(state.cafe.bean)}</strong><p>${esc(state.cafe.beanNote)}</p></div></div>
    ${button('cafe','Mer om kaféet '+icon('arrow'),'text-link')}
  </section>`;
}
function home(){
  const heading=state.subscription.active&&!activeOrder()&&!used()?'Förbeställ ditt kaffe':'Dagens kopp';
  return pageHead(esc(state.cafe.name),heading)+`<div class="home-grid">
    <div>${composer()}</div><aside class="stack home-side">${membership()}${cafeCard()}</aside>
  </div>`+footer();
}

function singlePlanCard(){
  const x=planFor(state,ui.plan);
  return `<section class="panel subscription-offer" aria-labelledby="offer-title">
    <h2 id="offer-title">${esc(x.name)}</h2>
    <div class="plan-price">${money(x.price)}<span> kr/mån</span></div>
    <p>En kopp bryggkaffe om dagen under kaféets öppettider.</p>
    ${button('checkout','Prova demoabonnemanget')}
    <p class="button-note">Inget kort behövs. Ingen betalning görs.</p>
  </section>`;
}

function productPeek(){
  return `<section class="product-peek" aria-labelledby="pickup-examples-title">
    <h2 id="pickup-examples-title">Hämta ditt kaffe på två sätt</h2>
    <div class="peek-screens">
      <figure class="peek-example">
        <div class="peek-card" aria-hidden="true">
          <span class="order-cup ready">${icon('check')}</span>
          <strong>Din kopp är klar</strong>
          <span>Alex, #105</span>
        </div>
        <figcaption><strong>Förbeställt kaffe</strong><p>Hämta koppen på hyllan vid kassan. Den har ditt namn och ordernummer.</p></figcaption>
      </figure>
      <figure class="peek-example">
        <div class="peek-green" aria-hidden="true">
          <span class="pickup-check">${icon('check')}</span>
          <strong>Dagens kopp</strong>
          <span class="pickup-name">Alex Andersson</span>
          <span class="live-clock">07:46:12</span>
        </div>
        <figcaption><strong>Direkt i kassan</strong><p>Visa den gröna bekräftelsen med ditt namn för baristan.</p></figcaption>
      </figure>
    </div>
  </section>`;
}

function plansPage(welcome=false){
  const sub=state.subscription,managing=!welcome&&sub.active;
  const faq=`<section class="plan-faq" aria-label="Frågor om abonnemanget">
    <details><summary>Kan jag hämta utan att förbeställa?</summary><p>Ja. Tryck Hämta i kassan och visa den gröna bekräftelsen för baristan.</p></details>
    <details><summary>Vad händer om jag missar en dag?</summary><p>Oanvända koppar förs inte över till nästa dag.</p></details>
    <details><summary>Hur avslutar jag abonnemanget?</summary><p>I demon väljer du Avsluta vid periodslut under Abonnemang. Det är en lokal simulering.</p></details>
    <details><summary>Vad fungerar i demon?</summary><p>Du kan prova kund- och personalflödet med exempeldata. Vyerna delar data i samma webbläsare.</p></details>
  </section>`;
  if(managing)return pageHead('','Ditt abonnemang')+`<section class="panel current-subscription">
    <div><h2>${esc(plan().name)} · ${money(sub.price)} kr/mån</h2>
    <p>${sub.cancelling?`Avslutas ${dateLabel(sub.periodEnd)}. Du kan hämta till och med ${dateLabel(addDays(sub.periodEnd,-1))}.`:`Period ${dateLabel(sub.periodStart)}–${dateLabel(addDays(sub.periodEnd,-1))}. Nästa demoperiod börjar ${dateLabel(sub.periodEnd)}.`}</p></div>
    ${button(sub.cancelling?'resume':'cancel-sub',sub.cancelling?'Behåll abonnemanget':'Avsluta vid periodslut',sub.cancelling?'secondary':'text-link danger-link')}
  </section>${faq}`+footer();
  return pageHead(esc(state.cafe.name),'Bryggkaffe varje dag','Förbeställ i mobilen och hämta på hyllan vid kassan.')+`
    <div class="subscription-grid">${singlePlanCard()}<div class="subscription-info">${productPeek()}</div></div>${faq}`+footer();
}
function orderPage(){const o=order();if(!o)return pageHead('','Ingen beställning på gång')+`<section class="panel empty-state"><div class="drink-icon">${icon('cup')}</div>${button('home','Till hemvyn '+icon('arrow'))}</section>`+footer();
  const closed=['not_collected','unknown'].includes(o.status),stages=['queued','ready','collected'],idx=closed?2:stages.indexOf(o.status),labels=['Beställningen är mottagen','Klar på hämthyllan',o.status==='not_collected'?'Koppen hämtades inte':o.status==='unknown'?'Avslutad, hämtning okänd':'Koppen är hämtad'],times=[o.createdAt,o.readyAt,o.closedAt||o.collectedAt],canCancel=o.status==='queued'&&Date.now()<o.cancelUntil;
  const heading=o.status==='not_collected'?'Koppen hämtades inte':o.status==='unknown'?'Hämtning okänd':idx===2?'Koppen är hämtad':idx===1?'Din kopp är klar':'Beställningen är mottagen';
  const intro=o.status==='not_collected'?'Koppen blev stående och hämtades inte. En ny kopp väntar nästa dag.':o.status==='unknown'?'Vi fick ingen bekräftelse på att koppen hämtades. En ny kopp väntar nästa dag.':idx===2?'Hoppas det smakade. Vi ses igen nästa dag.':idx===1?`Hämta på hyllan vid kassan. Koppen är märkt <strong>${esc(firstName())}</strong>.`:`Planerad hämtning <strong>${time(o.dueAt)}</strong> hos ${esc(state.cafe.name)}.<br>${canCancel?`Du kan avbryta fram till ${time(o.cancelUntil)}.`:'Baristan kan ha börjat, så beställningen går inte längre att avbryta.'}`;
  return `<div class="order-layout">${button('home',icon('back')+'Till hemvyn','back-link')}<div class="order-heading"><div class="order-cup ${idx>=1&&!closed?'ready':''}">${icon(closed?'info':idx>=1?'check':'cup')}</div><h1 tabindex="-1">${heading}</h1><p>${intro}</p></div><section class="panel order-summary"><div class="order-summary-title"><span class="drink-icon">${icon('cup')}</span><div><h2>${esc(o.drink)}${o.fika?' + kanelbulle':''}</h2><p>${esc(drinkDescription(o))}</p></div><strong class="order-number">#${o.number}</strong></div><ol class="timeline">${stages.map((s,i)=>`<li class="${i<idx?'done':i===idx?'current':'waiting'}"><span class="timeline-dot">${i<idx||i===2&&o.status==='collected'?icon('check'):i+1}</span><span>${labels[i]}</span><time>${times[i]?time(times[i]):i===1?`ca ${time(o.dueAt)}`:'–'}</time></li>`).join('')}</ol><div class="order-pickup-location">${icon('pin')}Hämthyllan vid kassan · ${esc(state.cafe.name)}</div></section>${idx<2?`<div class="order-action-row">${idx===1?button('collect-own',icon('check')+'Jag har hämtat mitt kaffe'):button('arrive',icon('pin')+(o.arrivedAt?'Baristan vet att du är här':'Jag är på plats'),'secondary','',o.arrivedAt?'disabled':'')}${button('delay',icon('time')+'5 minuter senare','secondary')}</div><div class="order-info-row">${canCancel?button('cancel-order','Avbryt förbeställningen','text-link danger-link'):'<p>Kontakta personalen om du behöver ändra koppen.</p>'}${o.delayed?'<span>Ankomsttiden är uppdaterad.</span>':''}</div>`:button('home','Till hemvyn '+icon('arrow'))}</div>`+footer();
}
function historyMarkup(){return state.history.length?state.history.slice(0,12).map(h=>`<div class="history-item"><div><strong>${esc(h.drink)}${h.fika?' + kanelbulle':''}</strong><p>${dateLabel(h.at)} · ${time(h.at)} · ${h.kind==='counter'?'I kassan':'Förbeställning'}</p></div>${icon('check')}</div>`).join(''):`<div class="empty-state compact"><div class="drink-icon">${icon('cup')}</div><p>Här samlas dina kaffepauser.<br>Den första väntar på dig.</p></div>`;}
function accountPage(){const history=state.history.filter(h=>dayKey(h.at)>=state.subscription.periodStart),f=normalizeDrink(state,state.profile.favorite);return pageHead('','Mitt konto')+`<div class="account-stats"><div><strong>${history.length}</strong><span>${history.length===1?'kopp':'koppar'} den här perioden</span></div><div><strong>${money(state.subscription.price)}<small> kr</small></strong><span>pris för ditt demoabonnemang</span></div></div><p class="account-period">Abonnemangsperiod: <time datetime="${esc(state.subscription.periodStart)}">${dateLabel(state.subscription.periodStart)}</time>–<time datetime="${esc(addDays(state.subscription.periodEnd,-1))}">${dateLabel(addDays(state.subscription.periodEnd,-1))}</time>.</p><div class="account-layout"><section class="panel account-panel"><div class="account-avatar">${esc(state.profile.name.split(/\s+/).filter(Boolean).map(n=>n[0]).slice(0,2).join(''))}</div><h2>${esc(state.profile.name)}</h2><p class="panel-intro">Medlem hos ${esc(state.cafe.name)}</p><form id="profile-form"><label for="profile-name">Namn på koppen</label><input id="profile-name" name="name" value="${esc(state.profile.name)}" required minlength="2" maxlength="60" autocomplete="name"><label for="profile-email">E-postadress</label><input id="profile-email" name="email" type="email" value="${esc(state.profile.email)}" required maxlength="160" autocomplete="email"><button class="primary" type="submit">Spara mina uppgifter ${icon('check')}</button></form><p class="form-hint">Använd exempeluppgifter. Det här sparas bara i din webbläsare.</p><div class="favorite-summary"><span class="drink-icon">${icon('cup')}</span><div><span>Mitt vanliga</span><strong>${esc(f.drink)}</strong><p>${esc(drinkDescription(f))}</p></div>${button('edit-favorite',icon('arrow'),'icon-button','','aria-label="Ändra min favorit"')}</div></section><div class="stack"><section class="panel history-card"><div class="section-top"><h2>Mina kaffepauser</h2><span class="tag">${state.history.length} ${state.history.length===1?'kopp':'koppar'}</span></div>${historyMarkup()}</section><section class="panel data-card"><h2>Din demo, dina uppgifter.</h2><p>Hämta din historik eller börja om med exempeldata.</p><div>${button('export-history',icon('card')+'Exportera min historik','secondary','',!state.history.length?'disabled':'')}${button('reset','Återställ demon','text-link danger-link')}</div></section></div></div>`+footer();}
function etaLabel(o){const n=Math.ceil((o.dueAt-Date.now())/60000);return o.arrivedAt?'På plats':n>0?`Om ${n} min`:n>=-3?'Hämtas nu':`Planerad ${time(o.dueAt)}`;}
// En order är sen när planerad hämtning har passerat utan att koppen markerats Klar. Sen är inte samma sak som missad.
const isLate=o=>o.status==='queued'&&!o.arrivedAt&&Date.now()>o.dueAt;
function etaMarkup(o){return esc(isLate(o)?`Sen · ${time(o.dueAt)}`:etaLabel(o))+(o.delayed?' · senarelagd':'');}
function queueMarkup(){
  const orders=state.orders.filter(o=>o.status==='queued')
    .sort((a,b)=>Number(!!b.arrivedAt)-Number(!!a.arrivedAt)||a.dueAt-b.dueAt);
  if(!orders.length)return '<p class="staff-empty">Inga förbeställningar i kön.</p>';
  return orders.map(o=>`<article class="queue-card">
    <div class="queue-info">
      <h3>${esc(o.drink)}${o.fika?' + kanelbulle':''}</h3>
      <p class="queue-options">${esc(drinkDescription(o))}</p>
      <p class="queue-person" id="queue-person-${esc(o.id)}">${esc(o.name)} <span>· #${esc(o.number)}${o.own?' · Din beställning':''}</span></p>
    </div>
    <div class="queue-actions">
      <strong class="eta-label ${o.arrivedAt?'arrived':isLate(o)?'late':''}" data-eta="${esc(o.id)}">${etaMarkup(o)}</strong>
      ${button('ready','Klar '+icon('check'),'queue-button',o.id,`aria-describedby="queue-person-${esc(o.id)}"`)}
    </div>
  </article>`).join('');
}

function shelfMarkup(){
  const ready=state.orders.filter(o=>o.status==='ready').sort((a,b)=>a.readyAt-b.readyAt);
  if(!ready.length)return '<p class="section-empty">Inga koppar på hyllan.</p>';
  return ready.map(o=>`<div class="pickup-row shelf-row${o.id===ui.justReady?' just-added':''}">
    <div><strong>${esc(o.name)} <span class="shelf-number">#${esc(o.number)}</span></strong><p>${esc(o.drink)} · klar ${time(o.readyAt)}</p></div>
    <div class="shelf-actions">${button('undo','Ångra','text-link',o.id)}${button('no-show','Ej hämtad','text-link danger-link',o.id)}</div>
  </div>`).join('');
}

function staffPage(){
  const status=openStatus(state);
  const queued=state.orders.filter(o=>o.status==='queued').length;
  const ready=state.orders.filter(o=>o.status==='ready').length;
  const pause=button('toggle-open',state.cafe.paused?'Återuppta beställningar':'Pausa beställningar','secondary');
  return pageHead(esc(state.cafe.name),'Förbeställningar','',`<div class="staff-header-actions">${pause}</div>`)+`
    ${!status.accepting?`<p class="staff-status-note">${icon('info')}<span>${status.reason==='closed'?`Kaféet är stängt. Öppet ${state.cafe.open}–${state.cafe.close}.`:'Nya förbeställningar är pausade.'} Befintliga beställningar ligger kvar.</span></p>`:''}
    <div class="staff-grid">
      <section class="panel queue-panel" aria-labelledby="queue-title">
        <div class="section-top queue-head"><h2 id="queue-title">I kön <span class="section-count">${queued}</span></h2></div>
        <div id="queue-list" aria-live="polite" aria-relevant="additions removals">${queueMarkup()}</div>
      </section>
      <aside class="stack staff-side">
        <section class="panel shelf-panel" aria-labelledby="shelf-title">
          <div class="section-top"><h2 id="shelf-title" tabindex="-1">På hyllan <span class="section-count">${ready}</span></h2></div>
          <div id="shelf-list">${shelfMarkup()}</div>
        </section>
        <section class="panel pickup-log" aria-labelledby="pickup-log-title">
          <div class="section-top"><h2 id="pickup-log-title">Hämtat idag <span class="section-count">${state.log.length}</span></h2></div>
          ${state.log.length?state.log.slice(0,8).map(l=>`<div class="pickup-row">
            <div><strong>${esc(l.name)}</strong><p>${esc(l.drink)}</p></div><time>${time(l.at)}</time>
          </div>`).join(''):'<p class="section-empty">Inga hämtningar ännu.</p>'}
        </section>
      </aside>
    </div>`+footer();
}
const field=(label,name,value,type='text',attrs='')=>`<div class="form-field"><label for="setting-${name}">${label}</label><input id="setting-${name}" name="${name}" type="${type}" value="${esc(value)}" ${attrs}></div>`;
function settingsPage(){const c=state.cafe;return pageHead('','Kaféinställningar')+`<form id="settings-form"><div class="settings-grid"><section class="panel settings-panel"><div class="section-top"><h2>Kaféuppgifter</h2>${icon('home')}</div>${field('Kaféets namn','cafeName',c.name,'text','required maxlength="60"')}${field('Adress eller plats','address',c.address,'text','required maxlength="100"')}<div class="form-columns">${field('Öppnar','open',c.open,'time','required')}${field('Stänger','close',c.close,'time','required')}</div><p class="form-hint">Samma öppettider varje dag i demon. Nya beställningar stoppas när kaféet är stängt.</p>${field('Tillagningstid i minuter','prepMinutes',c.prepMinutes,'number','required min="1" max="20" step="1"')}${field('Dagens kaffe','bean',c.bean,'text','required maxlength="60"')}${field('Rostning och smaknoter','beanNote',c.beanNote,'text','required maxlength="120"')}</section><div class="stack"><section class="panel settings-panel"><h2>Priser i demon</h2><p class="panel-intro">Exempelpriser i den lokala demon. Ett aktivt abonnemang behåller sitt pris.</p><div class="price-table"><div class="price-table-head"><span>Abonnemang</span><span>kr / mån</span><span>Ord. kr / besök</span></div>${PLAN_TYPES.map(p=>`<div class="price-table-row"><label for="setting-price-${p.id}">${esc(p.name)}</label><input id="setting-price-${p.id}" name="price-${p.id}" type="number" value="${c.prices[p.id]}" required min="50" max="4999" step="1" aria-label="${esc(p.name)} kronor per månad"><input name="regular-${p.id}" type="number" value="${c.regularPrices[p.id]}" required min="5" max="500" step="1" aria-label="Ordinarie pris per besök för ${esc(p.name)}"></div>`).join('')}</div></section><section class="panel settings-extras"><div class="section-top"><h2>Nya medlemmar</h2>${icon('card')}</div><p>Kunden skannar skylten för att öppna registreringen.</p>${button('poster',icon('card')+'Skylt för nya medlemmar','secondary')}<p class="form-hint">Skylten öppnar den publika demon. Hämtning i kassan kräver ingen QR-kod.</p></section><section class="notice"><strong>Inställningarna gäller i demon.</strong><p>Betalning är inte ansluten. Inga prisändringar debiteras.</p></section></div></div><div class="settings-save"><span id="settings-save-label">${icon('check')}Dina ändringar sparas på den här enheten.</span><button class="primary" type="submit">Spara kaféinställningar ${icon('check')}</button></div></form>`+footer();}
function render(){const focused=document.activeElement,id=focused?.id,pos=focused?.selectionStart;rollState(state);nav();$('#main').innerHTML=ui.page==='personal'?staffPage():ui.page==='installningar'?settingsPage():ui.page==='abonnemang'?plansPage():ui.page==='bli-medlem'?plansPage(true):ui.page==='bestallning'?orderPage():ui.page==='konto'?accountPage():home();document.title=`${({personal:'Bakom disken',installningar:'Kaféinställningar',abonnemang:'Abonnemang','bli-medlem':'Bli medlem',bestallning:'Din beställning',konto:'Mitt konto'})[ui.page]||'Dagens kopp'} · Bryggis`;if(id&&document.getElementById(id)){const el=document.getElementById(id);el.focus({preventScroll:true});if(typeof pos==='number'&&['text','search','email'].includes(el.type)){try{el.setSelectionRange(pos,pos);}catch{}}}}
function inert(v){document.querySelectorAll('.topbar,.app-shell,.mobile-nav,.connection-banner').forEach(el=>{el.inert=v;});}
function closeModal(){clearInterval(ticketTimer);$('#modal-root').replaceChildren();document.body.style.overflow='';inert(false);if(lastFocus?.isConnected)lastFocus.focus({preventScroll:true});}
function modal(contents,cls=''){closeModal();lastFocus=document.activeElement;$('#modal-root').innerHTML=`<div class="modal-backdrop"><section class="modal ${cls}" role="dialog" aria-modal="true" aria-labelledby="dialog-title">${button('close',icon('x'),'close-button','','aria-label="Stäng dialog"')}${contents}</section></div>`;document.body.style.overflow='hidden';inert(true);requestAnimationFrame(()=>$('.modal input:not([type=checkbox]),.modal .primary,.modal .close-button')?.focus());}
function confirm(title,text,action,label){modal(`<span class="eyebrow">Bara så du vet</span><h2 id="dialog-title">${title}</h2><p>${text}</p><div class="modal-actions">${button('close','Tillbaka','secondary')}${button(action,label)}</div>`);}
function checkout(){const p=planFor(state,ui.plan);modal(`<span class="eyebrow">Prova registreringen</span><h2 id="dialog-title">Starta ditt demoabonnemang.</h2><p>Välj ett exempelnamn och en exempeladress. Ingen betalning eller riktig prenumeration skapas.</p><div class="checkout-summary"><span>${icon('cup')}<strong>${esc(p.name)}</strong></span><strong>${money(p.price)}<small> kr/mån</small></strong></div><form id="checkout-form"><label for="checkout-name">Namn på koppen</label><input id="checkout-name" name="name" required minlength="2" maxlength="60" value="${ui.page==='bli-medlem'?'':esc(state.profile.name)}" placeholder="Till exempel Alex Andersson" autocomplete="name"><label for="checkout-email">E-postadress</label><input id="checkout-email" name="email" type="email" required maxlength="160" value="${ui.page==='bli-medlem'?'':esc(state.profile.email)}" placeholder="alex@example.com" autocomplete="email"><div class="notice"><strong>Du provar en demo.</strong><p>Inget kort behövs. Inget debiteras. Använd gärna exempeluppgifter.</p></div><button class="primary" type="submit">Starta mitt demoabonnemang ${icon('arrow')}</button><p class="checkout-terms">En kopp om dagen. Ingen riktig prenumeration skapas här.</p></form>`);}
function counterConfirm(){if(used()){toast('Dagens kopp är redan beställd eller hämtad.');render();return;}const d=normalizeDrink(state,ui.draft);modal(`<span class="eyebrow">Hämtning i kassan</span><h2 id="dialog-title">Redo vid kassan?</h2><p>Tryck när baristan kan titta på din skärm. Då registreras dagens kopp och din gröna bekräftelse visas i två minuter.</p><div class="counter-drink"><span class="drink-icon">${icon('cup')}</span><div><strong>${esc(d.drink)}${d.fika?' + kanelbulle':''}</strong><p>${esc(drinkDescription(d))}</p></div></div><div class="notice">Gör detta när du står i kassan. Dagens kopp kan bara hämtas en gång.</div>${button('redeem','Visa för baristan '+icon('check'))}${button('close','Jag väntar lite','text-link modal-wait')}`);}
function ticket(){const r=used();if(!r||r.kind!=='counter'||Date.now()-r.at>=120000){toast('Bekräftelsen har gått ut. Dagens kopp är registrerad.');render();return;}closeModal();lastFocus=document.activeElement;inert(true);document.body.style.overflow='hidden';$('#modal-root').innerHTML=`<section class="pickup-screen" role="dialog" aria-modal="true" aria-labelledby="ticket-title"><header class="pickup-top"><strong>${esc(state.cafe.name)} <span>/</span> bryggis.</strong>${button('close',icon('x'),'pickup-close','','aria-label="Stäng bekräftelse"')}</header><div class="live-strip"><span>VISA FÖR BARISTAN · DEMO</span></div><div class="pickup-body"><div class="pickup-check">${icon('check')}</div><h1 id="ticket-title">Dagens kopp</h1><p class="pickup-name">${esc(state.profile.name)}</p><div class="live-clock" id="live-clock"></div><p class="pickup-date">${dateLabel(Date.now(),true)}</p><div class="live-valid"><span></span>Livebekräftelse <strong id="ticket-countdown"></strong></div></div><footer class="pickup-bottom"><div class="pickup-receipt"><div><span>Din kopp</span><strong>${esc(r.drink)}${r.fika?' + kanelbulle':''}</strong></div><div><span>Nästa kopp</span><strong>${dateLabel(addDays(dayKey(),1))} från ${state.cafe.open}</strong></div></div>${button('close','Klart, tack!')}<p>Demobekräftelse · ingen riktig utlämning registreras hos ett kafé.</p></footer></section>`;const tick=()=>{if(!$('#live-clock')){clearInterval(ticketTimer);return;}const n=Math.max(0,120-Math.floor((Date.now()-r.at)/1000));$('#live-clock').textContent=time(Date.now(),true);$('#ticket-countdown').textContent=`${Math.floor(n/60)}:${String(n%60).padStart(2,'0')} kvar`;if(!n){closeModal();render();toast('Bekräftelsen har gått ut. Dagens kopp är hämtad.');}};tick();ticketTimer=setInterval(tick,1000);$('.pickup-close').focus();}
function about(){modal(`<span class="eyebrow">Om Bryggis</span><h2 id="dialog-title">Kaffeabonnemang för lokala kaféer.</h2><p>Bryggis hjälper fristående kaféer att erbjuda kaffeabonnemang och förbeställning. Vi börjar med ett lokalt kafé i taget.</p><div class="notice"><strong>Det här är en interaktiv frontenddemo.</strong><p>Exempelpriser, exempeldata och simulerade abonnemang. Ingen betalning sker, och inget skickas till ett riktigt kafé.</p></div><ul class="about-list"><li><strong>Din demo stannar på enheten.</strong>Kund- och personalvy delar data i samma webbläsare, även mellan flikar. Olika enheter delar inte data.</li><li><strong>Kort först, Swish senare.</strong>Betalning ska gå direkt till kaféets eget konto via betalleverantören. Bryggis ska aldrig hålla pengarna.</li><li><strong>Inför kafépiloten.</strong>Kundinloggning, personalbehörighet, serverlagring, serverkontrollerad inlösen och betalningskoppling återstår. Den rörliga skärmen är en visuell kontroll i demon.</li></ul>${button('close','Till min kaffepaus '+icon('arrow'))}`);}
function poster(){modal(`<div class="poster"><span class="poster-brand">bryggis.</span><span class="eyebrow">Hos ${esc(state.cafe.name)}</span><h2 id="dialog-title">Ditt kaffe.<br>Varje dag.</h2><p>Skanna för att bli medlem.<br>Förbeställ nästa kopp på vägen.</p><img class="poster-qr" src="signup-qr.png" width="230" height="230" alt="QR-kod till registreringen i Bryggis-demon"><strong>Ingen app att ladda ner.</strong><small>Demotest · öppnas direkt i mobilens webbläsare.<br>Ingen betalning görs.</small></div><div class="poster-actions">${button('print',icon('card')+'Skriv ut skylten','secondary')}${button('welcome','Prova registreringen '+icon('arrow'))}</div>`,'poster-modal');}
function install(){if(installPrompt){installPrompt.prompt();installPrompt.userChoice.finally(()=>{installPrompt=null;});return;}modal(`<span class="eyebrow">I mobilen</span><h2 id="dialog-title">Bryggis på hemskärmen.</h2><p>Öppna sidan i mobilens vanliga webbläsare. Du behöver ingen appbutik.</p><ul class="about-list"><li><strong>iPhone · Safari</strong>Tryck på Dela och välj Lägg till på hemskärmen.</li><li><strong>Android · Chrome</strong>Öppna webbläsarens meny och välj Installera app eller Lägg till på startskärmen.</li></ul><p>Demon fungerar också direkt i webbläsaren.</p>${button('close','Jag förstår '+icon('check'))}`);}
function csvDownload(rows,filename){const cell=v=>{const s=String(v??'');return '"'+(/^[=+@\-\t\r]/.test(s)?"'":'')+s.replaceAll('"','""')+'"';};const blob=new Blob(['\ufeff'+rows.map(r=>r.map(cell).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Din export är klar.');}

document.addEventListener('click',async e=>{
  const el=e.target.closest('[data-action]');if(!el||el.disabled)return;const a=el.dataset.action,v=el.dataset.value,hadFocus=document.activeElement===el;let restorePending;
  const pendingLabels={'save-favorite':'Sparar…',preorder:'Skickar beställning…',redeem:'Registrerar koppen…','confirm-preorder':'Skickar beställning…',ready:'Markerar klar…',undo:'Ångrar…','no-show':'Sparar…','collect-own':'Registrerar hämtning…',delay:'Uppdaterar tiden…',arrive:'Meddelar…','confirm-cancel-order':'Avbryter…','toggle-open':'Sparar…','confirm-cancel-sub':'Sparar…',resume:'Sparar…','confirm-reset':'Återställer…'};
  const routes={home:'hem',customer:'hem',staff:'personal',plans:'abonnemang',welcome:'bli-medlem',settings:'installningar','order-status':'bestallning'};
  try{
    if(routes[a]){closeModal();navigate(routes[a]);return;}
    if(a==='close')return closeModal();if(a==='about')return about();if(a==='checkout')return checkout();if(a==='counter')return counterConfirm();if(a==='show-ticket')return ticket();if(a==='poster')return poster();if(a==='print')return window.print();if(a==='install')return install();
    if(a==='time'){ui.minutes=Number(v);render();return;}
    if(a==='drink'){ui.draft=normalizeDrink(state,{...ui.draft,drink:v});render();return;}
    if(a==='milk'){ui.draft.milk=v;render();return;}
    if(a==='takeaway'){ui.draft.takeaway=v==='true';render();return;}
    if(a==='favorite'){ui.draft=normalizeDrink(state,state.profile.favorite);render();toast('Din favorit är vald.');return;}
    if(a==='edit-favorite'){ui.draft=normalizeDrink(state,state.profile.favorite);ui.customizing=true;navigate('hem');toast('Ändra koppen och spara som favorit.');return;}
    if(a==='select-plan'){ui.plan=v;render();document.querySelector(`[data-action="select-plan"][data-value="${v}"]`)?.focus({preventScroll:true});return;}
    if(pendingLabels[a]){if(ui.busy)return;ui.busy=true;restorePending=pendingButton(el,pendingLabels[a]);}
    if(a==='save-favorite'){await transaction(s=>{s.profile.favorite=normalizeDrink(s,ui.draft);});toast('Din favorit är sparad.');return;}
    if(a==='preorder'&&ui.minutes===0)return confirm('Förbereda kaffet så snart som möjligt?','Baristan kan börja direkt, så när du har skickat beställningen går den inte att avbryta.','confirm-preorder','Skicka beställningen');
    if(a==='preorder'||a==='confirm-preorder'){closeModal();await transaction(s=>createOrder(s,{...ui.draft,minutes:a==='confirm-preorder'?0:ui.minutes}));navigate('bestallning');toast('Beställningen ligger i baristans kö.');return;}
    if(a==='redeem'){await transaction(s=>redeemCounter(s,ui.draft));closeModal();render();ticket();return;}
    if(['ready','undo','no-show'].includes(a)){await transaction(s=>transitionOrder(s,v,a));ui.justReady=a==='ready'?v:null;render();ui.justReady=null;if(a==='ready'&&hadFocus)($('.queue-button')||$('#shelf-title'))?.focus({preventScroll:true});toast(a==='ready'?'Koppen är klar. Kunden ser det i sin vy.':a==='no-show'?'Koppen är markerad som ej hämtad.':'Beställningen är tillbaka i kön.');return;}
    if(a==='collect-own'||a==='delay'){const id=activeOrder()?.id;if(id){await transaction(s=>transitionOrder(s,id,a==='delay'?'delay':'collect'));render();toast(a==='delay'?'Baristan ser din nya ankomsttid.':'Tack för din kaffepaus!');}return;}
    if(a==='arrive'){const id=activeOrder()?.id;if(id){await transaction(s=>{const o=s.orders.find(x=>x.id===id);if(!o||!['queued','preparing'].includes(o.status))throw new AppError('Beställningen har ändrats. Kontrollera statusen.');o.arrivedAt=Date.now();});render();toast('Baristan ser att du är här.');}return;}
    if(a==='cancel-order'){const o=activeOrder();return confirm('Avbryta din kopp?',`Du kan avbryta fram till ${o?time(o.cancelUntil):''}. Dagens kopp blir då tillgänglig igen.`,'confirm-cancel-order','Avbryt koppen');}
    if(a==='confirm-cancel-order'){const id=activeOrder()?.id;closeModal();if(id)await transaction(s=>transitionOrder(s,id,'cancel'));navigate('hem');toast('Förbeställningen är avbruten. Dagens kopp finns kvar.');return;}
    if(a==='toggle-open'){await transaction(s=>{s.cafe.paused=!s.cafe.paused;});render();toast(state.cafe.paused?'Nya förbeställningar är pausade.':'Förbeställningar är öppna under öppettid.');return;}
    if(a==='cancel-sub')return confirm('Avsluta demoabonnemanget?',`Demoabonnemanget avslutas ${dateLabel(state.subscription.periodEnd)}. Du har tillgång till och med ${dateLabel(addDays(state.subscription.periodEnd,-1))}. Ingen betalning påverkas.`,'confirm-cancel-sub','Avsluta vid periodslut');
    if(a==='confirm-cancel-sub'){await transaction(s=>{s.subscription.cancelling=true;});closeModal();render();toast('Avslutet är sparat till periodens slut.');return;}
    if(a==='resume'){await transaction(s=>{s.subscription.cancelling=false;});render();toast('Ditt demoabonnemang fortsätter.');return;}
    if(a==='reset')return confirm('Börja om från första koppen?','Dina lokala demouppgifter och hämtningar ersätts av de ursprungliga exemplen.','confirm-reset','Återställ demon');
    if(a==='confirm-reset'){await transaction(s=>{Object.keys(s).forEach(k=>delete s[k]);Object.assign(s,createState());});ui.plan='daily';ui.draft=normalizeDrink(state,state.profile.favorite);ui.minutes=5;closeModal();render();toast('Demon är återställd. Dagens kopp väntar.');return;}
    if(a==='export-log'){csvDownload([['Namn','Dryck','Mjölk','Ta med','Fika','Datum','Tid','Sätt'],...state.log.map(l=>[l.name,l.drink,l.milk||'',l.takeaway?'Ja':'Nej',l.fika?'Ja':'Nej',dayKey(l.at),time(l.at),l.kind==='counter'?'Kassa':'Förbeställning'])],`bryggis-hamtningar-${dayKey()}.csv`);return;}
    if(a==='export-history'){csvDownload([['Dryck','Datum','Tid','Sätt'],...state.history.map(h=>[h.drink,dayKey(h.at),time(h.at),h.kind==='counter'?'Kassa':'Förbeställning'])],'bryggis-mina-kaffepauser.csv');return;}
    if(a==='cafe')modal(`<span class="eyebrow">Kaffe i ditt kvarter</span><h2 id="dialog-title">${esc(state.cafe.name)}</h2>${art()}<p>En plats för första koppen på morgonen och den lilla pausen mitt i dagen. Ett hej från baristan. En favorit att komma tillbaka till.</p><div class="cafe-modal-info"><p>${icon('pin')}${esc(state.cafe.address)}</p><p>${icon('time')}Öppet ${state.cafe.open}–${state.cafe.close} varje dag i demon</p><p>${icon('cup')}${esc(state.cafe.bean)} · ${esc(state.cafe.beanNote)}</p></div><p class="form-hint">Det här är ett exempelkafé. Uppgifterna kan anpassas i personalvyn.</p>${button('close','Vi ses snart '+icon('arrow'))}`);
  }catch{render();}finally{if(restorePending){ui.busy=false;restorePending();}}
});
document.addEventListener('toggle',e=>{if(e.target.id==='customize-cup')ui.customizing=e.target.open;},true);
document.addEventListener('input',e=>{if(e.target.closest('#settings-form')){ui.settingsDirty=true;$('#settings-save-label').textContent='Du har osparade ändringar.';}});
document.addEventListener('submit',async e=>{
  const f=e.target;if(!['checkout-form','profile-form','settings-form'].includes(f.id))return;e.preventDefault();if(!f.reportValidity()||ui.busy)return;const d=new FormData(f);ui.busy=true;const submit=f.querySelector('[type=submit]'),restorePending=pendingButton(submit,f.id==='checkout-form'?'Startar demoabonnemang…':'Sparar…');
  try{
    if(f.id==='checkout-form'){await transaction(s=>activateSubscription(s,{plan:ui.plan,name:String(d.get('name')),email:String(d.get('email'))}));ui.draft=normalizeDrink(state,state.profile.favorite);closeModal();navigate('hem');toast(`Välkommen, ${firstName()}! Ditt demoabonnemang är igång.`);}
    else if(f.id==='profile-form'){const name=String(d.get('name')).trim(),email=String(d.get('email')).trim();if(name.length<2)throw new AppError('Skriv minst två tecken i namnet.');await transaction(s=>{s.profile.name=name;s.profile.email=email;s.orders.filter(o=>o.own&&['queued','preparing','ready'].includes(o.status)).forEach(o=>o.name=name);});render();toast('Dina uppgifter är sparade.');}
    else{
      if(String(d.get('open'))>=String(d.get('close')))throw new AppError('Stängningstiden måste vara efter öppningstiden.');
      await transaction(s=>{s.cafe={...s.cafe,name:String(d.get('cafeName')).trim(),address:String(d.get('address')).trim(),open:String(d.get('open')),close:String(d.get('close')),prepMinutes:Number(d.get('prepMinutes')),bean:String(d.get('bean')).trim(),beanNote:String(d.get('beanNote')).trim(),prices:Object.fromEntries(PLAN_TYPES.map(p=>[p.id,Number(d.get('price-'+p.id))])),regularPrices:Object.fromEntries(PLAN_TYPES.map(p=>[p.id,Number(d.get('regular-'+p.id))]))};if(!s.cafe.name||!s.cafe.address||!s.cafe.bean)throw new AppError('Fyll i kaféets namn, plats och dagens kaffe.');});ui.settingsDirty=false;render();toast('Sparat. Kundvyn visar nu ditt kafé.');
    }
  }catch(err){toast(err instanceof AppError?err.message:'Det gick inte att spara. Försök igen.',true);}finally{ui.busy=false;restorePending();}
});
document.addEventListener('keydown',e=>{
  if($('#modal-root').firstElementChild){if(e.key==='Escape'){e.preventDefault();closeModal();return;}if(e.key==='Tab'){const n=[...$('#modal-root').querySelectorAll('button,input,select,a[href]')].filter(n=>!n.disabled),first=n[0],last=n.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}}
  if(e.target.closest('[data-action="select-plan"]')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();const idx=PLAN_TYPES.findIndex(p=>p.id===ui.plan),next=e.key==='Home'?0:e.key==='End'?PLAN_TYPES.length-1:(idx+(['ArrowRight','ArrowDown'].includes(e.key)?1:-1)+PLAN_TYPES.length)%PLAN_TYPES.length;ui.plan=PLAN_TYPES[next].id;render();document.querySelector(`[data-action="select-plan"][data-value="${ui.plan}"]`).focus();}
});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
function connection(){const offline=!navigator.onLine;$('#connection-banner').hidden=!offline;document.body.classList.toggle('offline',offline);}
window.addEventListener('online',connection);window.addEventListener('offline',connection);connection();
if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(()=>{});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')sync();});
let lastAvailability=openStatus(state).reason;
setInterval(()=>{const available=openStatus(state);if(available.reason!==lastAvailability){lastAvailability=available.reason;if(ui.page==='hem')render();else nav();}const pickup=$('#planned-pickup');if(pickup)pickup.textContent=time(Date.now()+Math.max(state.cafe.prepMinutes,ui.minutes)*60000);if(dayKey()!==state.day){sync();persist();return;}document.querySelectorAll('[data-eta]').forEach(el=>{const o=state.orders.find(o=>o.id===el.dataset.eta);if(o&&o.status==='queued'){el.innerHTML=etaMarkup(o);el.classList.toggle('late',isLate(o));}});if(state.orders.some(o=>o.status==='ready'&&Date.now()-o.readyAt>=UNKNOWN_AFTER_MINUTES*60000)){transaction(()=>{}).then(render,()=>{});return;}const own=activeOrder();if(ui.page==='bestallning'&&own?.status==='queued'&&Date.now()>=own.cancelUntil&&document.querySelector('[data-action="cancel-order"]'))render();},15000);
$('#brand-icon').innerHTML=icon('cup');route();if(!storageOK)toast('Webbläsaren kan inte spara. Prova att tillåta lokal lagring.');
