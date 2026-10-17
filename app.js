// ===== Data: sample events + saving in the browser (localStorage) =====
const KEY="eventhub-sprint1";
const seed=()=>{const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};return[
 {id:1,name:"AI in Education Workshop",type:"Workshop",date:d(4),time:"10:00",place:"PNU, College of CCIS",seats:40,taken:31,mine:false},
 {id:2,name:"Riyadh Season Food Festival",type:"Social",date:d(7),time:"19:00",place:"Boulevard City, Riyadh",seats:300,taken:120,mine:false},
 {id:3,name:"Cybersecurity Awareness Day",type:"Conference",date:d(10),time:"09:00",place:"KAFD Conference Center",seats:150,taken:149,mine:false},
 {id:4,name:"Women's 5K Fun Run",type:"Sports",date:d(14),time:"06:30",place:"Wadi Hanifa Trail",seats:200,taken:58,mine:false},
 {id:5,name:"Saudi Design Week Exhibition",type:"Exhibition",date:d(20),time:"16:00",place:"JAX District, Diriyah",seats:500,taken:210,mine:false}]};
let events;
try{events=JSON.parse(localStorage.getItem(KEY))||seed()}catch(e){events=seed()}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(events))}catch(e){}};
let role="attendee";
let editingId=null;      // US10: id of the event being edited (null = creating a new one)
let confirmDeleteId=null; // US15: id of the event waiting for delete confirmation
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const today=()=>new Date().toISOString().slice(0,10);

// ===== US12 Close registration when the event reaches full capacity =====
const isClosed=e=>e.taken>=e.seats;

// ===== US1 Browse events + US2 Search: draw the event cards, filtered by the search box =====
function render(){
  const q=$("q").value.trim().toLowerCase();
  const list=events.filter(e=>!q||(e.name+" "+e.type+" "+e.place).toLowerCase().includes(q))
                   .sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  $("count").textContent=q?`${list.length} result${list.length!==1?"s":""} for “${$("q").value.trim()}”`:`${list.length} upcoming events`;
  if(!list.length){$("grid").innerHTML=`<div class="empty">${q?"No events match your search. Try another name or keyword.":"No events yet."}</div>`;return}
  $("grid").innerHTML=list.map(e=>role==="organizer"?organizerCard(e):attendeeCard(e)).join("");
}
function stub(e){const [,m,d]=e.date.split("-");return `<div class="stub"><div class="m">${MON[+m-1]}</div><div class="d">${+d}</div><div class="t">${esc(e.time)}</div></div>`}
function head(e){return `<span class="type">${esc(e.type)}</span><h3>${esc(e.name)}</h3><div class="place">${esc(e.place)}</div>`}

function attendeeCard(e){
  const left=e.seats-e.taken;
  const cls=isClosed(e)?"full":left<=e.seats*.1?"low":"";
  let btn;
  if(e.mine) btn=`<button class="btn reg done" disabled>✓ Registered</button>`;
  else if(isClosed(e)) btn=`<button class="btn reg" disabled>Registration closed</button>`;
  else btn=`<button class="btn reg" data-act="register" data-id="${e.id}">Register</button>`;
  return `<article class="ticket">${stub(e)}<div class="info">${head(e)}
    <div class="row"><span class="seats ${cls}">${isClosed(e)?"No seats left":left+" / "+e.seats+" seats left"}</span>${btn}</div></div></article>`;
}

// ===== US11 View the number of registered attendees (Organizer card) =====
function organizerCard(e){
  const pct=Math.min(100,Math.round(e.taken/e.seats*100));
  const chip=isClosed(e)?`<span class="chip closed">Registration closed</span>`:`<span class="chip open">Open</span>`;
  const actions=confirmDeleteId===e.id
    ? `<div class="confirm"><span>Delete this event?</span><button class="btn danger small" data-act="delete-yes" data-id="${e.id}">Delete</button><button class="btn ghost small" data-act="delete-no">Cancel</button></div>`
    : `<div class="org-actions"><button class="btn ghost small" data-act="edit" data-id="${e.id}">Edit</button><button class="btn ghost small danger-text" data-act="delete" data-id="${e.id}">Delete</button></div>`;
  return `<article class="ticket">${stub(e)}<div class="info">${head(e)}
    <div class="attend"><div class="attend-top"><span class="seats"><b>${e.taken}</b> / ${e.seats} registered</span>${chip}</div>
    <div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100"><span style="width:${pct}%"></span></div></div>
    ${actions}</div></article>`;
}

function toast(t){const el=$("toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2200)}
function setRole(r){role=r;confirmDeleteId=null;$("asAttendee").setAttribute("aria-pressed",r==="attendee");$("asOrganizer").setAttribute("aria-pressed",r==="organizer");$("newBtn").hidden=r!=="organizer";render()}

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
$("asAttendee").onclick=()=>setRole("attendee");
$("asOrganizer").onclick=()=>setRole("organizer");
$("newBtn").onclick=()=>openPanel(true);
$("cancel").onclick=$("scrim").onclick=()=>openPanel(false);

$("grid").addEventListener("click",ev=>{
  const b=ev.target.closest("button[data-act]");if(!b)return;
  const e=events.find(x=>x.id==b.dataset.id);
  switch(b.dataset.act){
    // ===== US4 Register for an event: reserve a seat (blocked by US12 when full) =====
    case "register":
      if(isClosed(e)){toast("Registration is closed. This event is full");render();return}
      e.taken++;e.mine=true;save();render();
      toast(isClosed(e)?`Seat reserved. ${e.name} is now full`:`Seat reserved for ${e.name}`);break;
    // ===== US10 Edit an existing event =====
    case "edit": openPanel(true,e);break;
    // ===== US15 Delete an event created by mistake =====
    case "delete": confirmDeleteId=e.id;render();break;
    case "delete-no": confirmDeleteId=null;render();break;
    case "delete-yes":
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
    Object.assign(current,{name,type:$("fType").value,date,time,place,seats});
    save();openPanel(false);render();toast("Changes saved");
  }else{
    events.push({id:Date.now(),name,type:$("fType").value,date,time,place,seats,taken:0,mine:false});
    save();openPanel(false);render();toast("Event published");
  }
});
$("reset").onclick=()=>{events=seed();confirmDeleteId=null;save();render();toast("Demo reset")};
render();
