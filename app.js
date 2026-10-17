// ===== Data: sample events + saving in the browser (localStorage) =====
const KEY="eventhub-v2";
const NOTES_KEY="eventhub-v2-notes";
const seed=()=>{const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};return[
 {id:6,name:"Intro to Agile & Scrum Bootcamp",type:"Workshop",date:d(-3),time:"17:00",place:"PNU, Hall 3",seats:30,taken:27,mine:true,ratings:[5,4,5,4,5,3,4]},
 {id:7,name:"Startup Pitch Night",type:"Social",date:d(2),time:"20:00",place:"Misk Hub, Riyadh",seats:80,taken:46,mine:true,ratings:[]},
 {id:1,name:"AI in Education Workshop",type:"Workshop",date:d(4),time:"10:00",place:"PNU, College of CCIS",seats:40,taken:31,mine:false,ratings:[]},
 {id:2,name:"Riyadh Season Food Festival",type:"Social",date:d(7),time:"19:00",place:"Boulevard City, Riyadh",seats:300,taken:120,mine:false,ratings:[]},
 {id:3,name:"Cybersecurity Awareness Day",type:"Conference",date:d(10),time:"09:00",place:"KAFD Conference Center",seats:150,taken:149,mine:false,ratings:[]},
 {id:4,name:"Women's 5K Fun Run",type:"Sports",date:d(14),time:"06:30",place:"Wadi Hanifa Trail",seats:200,taken:58,mine:false,ratings:[]},
 {id:5,name:"Saudi Design Week Exhibition",type:"Exhibition",date:d(20),time:"16:00",place:"JAX District, Diriyah",seats:500,taken:210,mine:false,ratings:[]}]};
let events,notes;
try{events=JSON.parse(localStorage.getItem(KEY))||seed()}catch(e){events=seed()}
try{notes=JSON.parse(localStorage.getItem(NOTES_KEY))||[]}catch(e){notes=[]}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(events));localStorage.setItem(NOTES_KEY,JSON.stringify(notes))}catch(e){}};
let role="attendee";
let editingId=null;      // US10: id of the event being edited (null = creating a new one)
let confirmDeleteId=null; // US15: id of the event waiting for delete confirmation
let confirmCancelId=null; // US5: id of the registration waiting for cancel confirmation
let tab="all";            // US7 / US13: which list the attendee is looking at (all, mine, fav)
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const today=()=>new Date().toISOString().slice(0,10);
const daysUntil=e=>Math.round((new Date(e.date)-new Date(today()))/864e5);
const isPast=e=>e.date<today();
const niceDate=e=>{const [,m,d]=e.date.split("-");return `${MON[+m-1]} ${+d}`};

// ===== US12 Close registration when the event reaches full capacity =====
const isClosed=e=>e.taken>=e.seats;

// ===== US8 Notifications and reminders =====
function notify(text,kind="info"){
  notes.unshift({id:Date.now()+Math.random(),text,kind,at:new Date().toISOString(),read:false});
  notes=notes.slice(0,30);
}
// Reminder for every event I'm registered for that starts within 3 days (sent once per event)
function checkReminders(){
  events.forEach(e=>{
    const n=daysUntil(e);
    if(e.mine&&n>=0&&n<=3&&!e.reminded){
      const when=n===0?"today":n===1?"tomorrow":`in ${n} days`;
      notify(`Reminder: ${e.name} starts ${when} at ${e.time}, ${e.place}.`,"reminder");
      e.reminded=true;
    }
  });
}
function ago(iso){const s=(Date.now()-new Date(iso))/1000;if(s<60)return "just now";if(s<3600)return Math.floor(s/60)+" min ago";if(s<86400)return Math.floor(s/3600)+" h ago";return Math.floor(s/86400)+" d ago"}
function renderBell(){
  const unread=notes.filter(n=>!n.read).length;
  $("bellBadge").textContent=unread;$("bellBadge").hidden=!unread;
  $("bell").setAttribute("aria-label",unread?`Notifications, ${unread} unread`:"Notifications");
  $("noteList").innerHTML=notes.length?notes.map(n=>`<li class="note-item ${n.read?"":"unread"} k-${n.kind}"><p>${esc(n.text)}</p><time>${ago(n.at)}</time></li>`).join("")
    :`<li class="note-empty">No notifications yet. You'll get reminders here for events you register for.</li>`;
}

// ===== US1 Browse events + US2 Search: draw the event cards, filtered by the search box =====
function render(){
  const q=$("q").value.trim().toLowerCase();
  // ===== US3 Filter events by type or date =====
  const fType=$("fltType").value,from=$("fltFrom").value,to=$("fltTo").value;
  const filtering=!!(fType||from||to);
  $("clearFlt").hidden=!filtering;
  // ===== US7 My events / US13 Favorites: tab counters =====
  $("nMine").textContent=events.filter(e=>e.mine).length;
  $("nFav").textContent=events.filter(e=>e.fav&&!isPast(e)).length;
  // Attendees see past events only in "My events" (so they can rate them, US9). Organizers see everything.
  const inTab=e=>role==="organizer"||(tab==="all"&&!isPast(e))||(tab==="mine"&&e.mine)||(tab==="fav"&&e.fav&&!isPast(e));
  const list=events.filter(inTab)
                   .filter(e=>!q||(e.name+" "+e.type+" "+e.place).toLowerCase().includes(q))
                   .filter(e=>(!fType||e.type===fType)&&(!from||e.date>=from)&&(!to||e.date<=to))
                   .sort((a,b)=>isPast(a)-isPast(b)||(a.date+a.time).localeCompare(b.date+b.time));
  const label=role==="organizer"?"events":tab==="all"?"upcoming events":tab==="mine"?"events you're registered for":"favorite events";
  $("count").textContent=q?`${list.length} result${list.length!==1?"s":""} for “${$("q").value.trim()}”`:`${list.length} ${label}`;
  renderBell();
  if(!list.length){
    let msg="No events yet.";
    if(q||filtering) msg="No events match your search or filters. Try changing them.";
    else if(role==="attendee"&&tab==="mine") msg="You haven't registered for any events yet. Register from All events and they'll show up here.";
    else if(role==="attendee"&&tab==="fav") msg="No favorites yet. Tap the heart on any event to save it here.";
    $("grid").innerHTML=`<div class="empty">${msg}</div>`;return}
  $("grid").innerHTML=list.map(e=>role==="organizer"?organizerCard(e):attendeeCard(e)).join("");
}
function stub(e){const [,m,d]=e.date.split("-");return `<div class="stub"><div class="m">${MON[+m-1]}</div><div class="d">${+d}</div><div class="t">${esc(e.time)}</div></div>`}
function head(e){return `<span class="type">${esc(e.type)}</span><h3>${esc(e.name)}</h3><div class="place">${esc(e.place)}</div>`}
const ICON={
  heart:`<svg width="18" height="18" viewBox="0 0 24 24" stroke-width="2"><path d="M12 21s-7.5-4.6-9.5-9.2C1 8.3 3.3 5 6.6 5c2 0 3.4 1.1 4.4 2.5C12 6.1 13.4 5 15.4 5 18.7 5 21 8.3 21.5 11.8 19.5 16.4 12 21 12 21z"/></svg>`,
  share:`<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4"/></svg>`
};
// ===== US9 Rate an event after it has ended =====
function avgRating(e){const all=[...(e.ratings||[]),...(e.myRating?[e.myRating]:[])];return all.length?{avg:all.reduce((a,b)=>a+b,0)/all.length,n:all.length}:null}
function stars(e){
  let s=`<div class="rate"><span class="rate-label">${e.myRating?"Your rating":"How was it?"}</span><div class="stars" role="group" aria-label="Rate ${esc(e.name)}">`;
  for(let i=1;i<=5;i++) s+=`<button class="star ${e.myRating>=i?"on":""}" data-act="rate" data-id="${e.id}" data-val="${i}" aria-label="${i} star${i>1?"s":""}" aria-pressed="${e.myRating===i}">★</button>`;
  return s+`</div></div>`;
}

function attendeeCard(e){
  const left=e.seats-e.taken;
  const cls=isClosed(e)?"full":left<=e.seats*.1?"low":"";
  const past=isPast(e);
  const heart=past?"":`<button class="icon-btn fav ${e.fav?"on":""}" data-act="fav" data-id="${e.id}" aria-pressed="${!!e.fav}" aria-label="${e.fav?"Remove from favorites":"Save to favorites"}">${ICON.heart}</button>`;
  // ===== US14 Share an event link =====
  const share=past?"":`<button class="icon-btn" data-act="share" data-id="${e.id}" aria-label="Share event link">${ICON.share}</button>`;
  let row,extra="";
  if(past){
    row=`<span class="chip ended">Ended</span>${e.mine?`<span class="reg-done">✓ Attended</span>`:""}`;
    if(e.mine) extra=stars(e);
  }else{
    let btn;
    if(e.mine) btn=`<span class="reg-done">✓ Registered</span>`;
    else if(isClosed(e)) btn=`<button class="btn reg" disabled>Registration closed</button>`;
    else btn=`<button class="btn reg" data-act="register" data-id="${e.id}">Register</button>`;
    row=`<span class="seats ${cls}">${isClosed(e)?"No seats left":left+" / "+e.seats+" seats left"}</span>${btn}`;
    // ===== US5 Cancel my registration =====
    if(e.mine) extra=confirmCancelId===e.id
      ? `<div class="confirm"><span>Cancel your registration?</span><button class="btn danger small" data-act="cancel-yes" data-id="${e.id}">Yes, cancel</button><button class="btn ghost small" data-act="cancel-no">Keep it</button></div>`
      : `<button class="link-btn" data-act="cancel" data-id="${e.id}">Cancel registration</button>`;
  }
  const n=daysUntil(e);
  const soon=e.mine&&!past&&n<=3?`<span class="chip soon">${n===0?"Today":n===1?"Tomorrow":`In ${n} days`}</span>`:"";
  return `<article class="ticket ${past?"is-past":""}" id="event-${e.id}">${stub(e)}<div class="info"><div class="info-top"><span class="type">${esc(e.type)}</span>${soon}<span class="icons">${share}${heart}</span></div><h3>${esc(e.name)}</h3><div class="place">${esc(e.place)}</div>
    <div class="row">${row}</div>${extra}</div></article>`;
}

// ===== US11 View the number of registered attendees (Organizer card) =====
function organizerCard(e){
  const pct=Math.min(100,Math.round(e.taken/e.seats*100));
  const past=isPast(e);
  const chip=past?`<span class="chip ended">Ended</span>`:isClosed(e)?`<span class="chip closed">Registration closed</span>`:`<span class="chip open">Open</span>`;
  // US9: organizers see the average rating once the event has ended
  const r=avgRating(e);
  const rating=past?`<div class="avg">${r?`<span class="avg-star">★</span> <b>${r.avg.toFixed(1)}</b> / 5 · ${r.n} rating${r.n>1?"s":""}`:"No ratings yet"}</div>`:"";
  const actions=confirmDeleteId===e.id
    ? `<div class="confirm"><span>Delete this event?</span><button class="btn danger small" data-act="delete-yes" data-id="${e.id}">Delete</button><button class="btn ghost small" data-act="delete-no">Cancel</button></div>`
    : `<div class="org-actions">${past?"":`<button class="btn ghost small" data-act="edit" data-id="${e.id}">Edit</button>`}<button class="btn ghost small danger-text" data-act="delete" data-id="${e.id}">Delete</button></div>`;
  return `<article class="ticket ${past?"is-past":""}" id="event-${e.id}">${stub(e)}<div class="info">${head(e)}
    <div class="attend"><div class="attend-top"><span class="seats"><b>${e.taken}</b> / ${e.seats} registered</span>${chip}</div>
    <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div></div>
    ${rating}${actions}</div></article>`;
}

function toast(t){const el=$("toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2600)}
function setRole(r){role=r;confirmDeleteId=null;confirmCancelId=null;$("tabs").hidden=r!=="attendee";$("asAttendee").setAttribute("aria-pressed",r==="attendee");$("asOrganizer").setAttribute("aria-pressed",r==="organizer");$("newBtn").hidden=r!=="organizer";render()}
function setTab(t){tab=t;confirmCancelId=null;document.querySelectorAll("#tabs [data-tab]").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===t))}

// Panel is shared by US6 (create) and US10 (edit)
function openPanel(o,ev){
  $("panel").hidden=$("scrim").hidden=!o;
  if(!o){editingId=null;return}
  $("err").textContent="";$("fDate").min=today();
  if(ev){ // US10 Edit: fill the form with the current values
    editingId=ev.id;
    $("ph").textContent="Edit event";$("psub").textContent="Changes show up for attendees right away.";$("submitBtn").textContent="Save changes";
    $("fName").value=ev.name;$("fType").value=ev.type;$("fDate").value=ev.date;$("fTime").value=ev.time;$("fPlace").value=ev.place;$("fSeats").value=ev.seats;
  }else{
    editingId=null;
    $("ph").textContent="Create a new event";$("psub").textContent="Attendees will see it right away and can register.";$("submitBtn").textContent="Publish event";
    $("form").reset();$("fTime").value="18:00";$("fSeats").value=50;
  }
  $("fName").focus();
}

// ===== US2 Search: re-filter while typing =====
$("q").addEventListener("input",render);
// ===== US3 Filter: re-filter when type or dates change =====
["fltType","fltFrom","fltTo"].forEach(id=>$(id).addEventListener("change",render));
$("clearFlt").onclick=()=>{$("fltType").value="";$("fltFrom").value="";$("fltTo").value="";render()};
// ===== US7 / US13: switch between All events, My events and Favorites =====
$("tabs").addEventListener("click",ev=>{const b=ev.target.closest("button[data-tab]");if(!b)return;setTab(b.dataset.tab);render()});
$("asAttendee").onclick=()=>setRole("attendee");
$("asOrganizer").onclick=()=>setRole("organizer");
$("newBtn").onclick=()=>openPanel(true);
$("cancel").onclick=$("scrim").onclick=()=>openPanel(false);

// ===== US8: open / close the notifications list (opening marks them as read) =====
$("bell").onclick=ev=>{
  ev.stopPropagation();
  const open=$("notePanel").hidden;
  $("notePanel").hidden=!open;$("bell").setAttribute("aria-expanded",open);
  if(open){renderBell();notes.forEach(n=>n.read=true);save();$("bellBadge").hidden=true}
  else renderBell();
};
$("clearNotes").onclick=ev=>{ev.stopPropagation();notes=[];save();renderBell()};
document.addEventListener("click",ev=>{if(!$("notePanel").hidden&&!ev.target.closest("#notePanel")){$("notePanel").hidden=true;$("bell").setAttribute("aria-expanded","false");renderBell()}});

// ===== US14 Share: copy (or share) a direct link to one event =====
async function shareEvent(e){
  const url=location.href.split("#")[0]+"#event-"+e.id;
  const text=`${e.name} · ${niceDate(e)} at ${e.time}, ${e.place}`;
  try{ if(navigator.share){await navigator.share({title:e.name,text,url});return} }catch(err){ if(err&&err.name==="AbortError")return }
  try{await navigator.clipboard.writeText(url);toast("Link copied. Send it to your friends")}
  catch(err){$("shareUrl").value=url;$("shareBox").hidden=false;$("shareUrl").select()}
}
$("shareClose").onclick=()=>$("shareBox").hidden=true;

$("grid").addEventListener("click",ev=>{
  const b=ev.target.closest("button[data-act]");if(!b)return;
  const e=events.find(x=>x.id==b.dataset.id);
  switch(b.dataset.act){
    // ===== US4 Register for an event: reserve a seat (blocked by US12 when full) =====
    case "register":
      if(isClosed(e)){toast("Registration is closed. This event is full");render();return}
      e.taken++;e.mine=true;
      notify(`You're registered for ${e.name} on ${niceDate(e)} at ${e.time}. We'll remind you before it starts.`,"success");
      checkReminders();save();render();
      toast(isClosed(e)?`Seat reserved. ${e.name} is now full`:`Seat reserved for ${e.name}`);break;
    // ===== US13 Favorites: toggle the heart =====
    case "fav":
      e.fav=!e.fav;save();render();toast(e.fav?"Saved to favorites":"Removed from favorites");break;
    // ===== US14 Share =====
    case "share": shareEvent(e);break;
    // ===== US9 Rate =====
    case "rate":
      e.myRating=+b.dataset.val;save();render();toast(`Thanks! You rated ${e.name} ${e.myRating}/5`);break;
    // ===== US5 Cancel registration: free the seat for someone else =====
    case "cancel": confirmCancelId=e.id;render();break;
    case "cancel-no": confirmCancelId=null;render();break;
    case "cancel-yes":
      e.taken=Math.max(0,e.taken-1);e.mine=false;e.reminded=false;confirmCancelId=null;
      notify(`Your registration for ${e.name} was cancelled.`,"info");
      save();render();toast("Registration cancelled. Your seat is free for someone else");break;
    // ===== US10 Edit an existing event =====
    case "edit": openPanel(true,e);break;
    // ===== US15 Delete an event created by mistake =====
    case "delete": confirmDeleteId=e.id;render();break;
    case "delete-no": confirmDeleteId=null;render();break;
    case "delete-yes":
      if(e.mine) notify(`${e.name} on ${niceDate(e)} was cancelled by the organizer.`,"alert"); // US8: tell registered attendees
      events=events.filter(x=>x.id!==e.id);confirmDeleteId=null;save();render();toast("Event deleted");break;
  }
});

// ===== US6 Create a new event / US10 Save edits =====
$("form").addEventListener("submit",ev=>{
  ev.preventDefault();
  const name=$("fName").value.trim(),date=$("fDate").value,time=$("fTime").value,place=$("fPlace").value.trim(),seats=parseInt($("fSeats").value,10);
  const current=editingId?events.find(x=>x.id===editingId):null;
  if(!name||!date||!time||!place){$("err").textContent="Fill in all fields to save the event.";return}
  if(date<today()&&!(current&&current.date===date)){$("err").textContent="Pick today or a future date.";return}
  if(!(seats>=1)){$("err").textContent="Capacity must be at least 1 seat.";return}
  if(current&&seats<current.taken){$("err").textContent=`${current.taken} people are already registered, so capacity can't be lower than ${current.taken}.`;return}
  if(current){
    const moved=current.date!==date||current.time!==time||current.place!==place;
    Object.assign(current,{name,type:$("fType").value,date,time,place,seats});
    if(current.mine&&moved){current.reminded=false;notify(`${name} was updated: now ${niceDate(current)} at ${time}, ${place}.`,"alert")} // US8: tell registered attendees
    checkReminders();save();openPanel(false);render();toast("Changes saved");
  }else{
    events.push({id:Date.now(),name,type:$("fType").value,date,time,place,seats,taken:0,mine:false,ratings:[]});
    save();openPanel(false);render();toast("Event published");
  }
});
$("reset").onclick=()=>{events=seed();notes=[];confirmDeleteId=null;confirmCancelId=null;checkReminders();save();render();toast("Demo reset")};

// Start: send any due reminders, draw the page, and jump to a shared event link (US14)
checkReminders();save();render();
function openSharedLink(){
  const m=location.hash.match(/^#event-(\d+(?:\.\d+)?)$/);if(!m)return;
  const e=events.find(x=>String(x.id)===m[1]);
  if(!e){toast("That event is no longer available");return}
  setRole("attendee");setTab(isPast(e)?"mine":"all");$("q").value="";render();
  const el=$("event-"+e.id);if(!el)return;
  el.classList.add("highlight");el.scrollIntoView({block:"center",behavior:"smooth"});
  setTimeout(()=>el.classList.remove("highlight"),2600);
}
openSharedLink();
window.addEventListener("hashchange",openSharedLink);
