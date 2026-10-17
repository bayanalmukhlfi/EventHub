// ===== Data: sample events + saving in the browser (localStorage) =====
const KEY="eventhub-sprint1";
const seed=()=>{const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return x.toISOString().slice(0,10)};return[
 {id:1,name:"AI in Education Workshop",desc:"Hands-on session on using AI tools to support teaching and learning.",type:"Workshop",date:d(4),time:"10:00",place:"PNU, College of CCIS",seats:40,taken:31,mine:false},
 {id:2,name:"Riyadh Season Food Festival",desc:"Taste dishes from top local restaurants with live cooking stations.",type:"Social",date:d(7),time:"19:00",place:"Boulevard City, Riyadh",seats:300,taken:120,mine:false},
 {id:3,name:"Cybersecurity Awareness Day",desc:"Talks and demos on staying safe online, from phishing to strong passwords.",type:"Conference",date:d(10),time:"09:00",place:"KAFD Conference Center",seats:150,taken:149,mine:false},
 {id:4,name:"Women's 5K Fun Run",desc:"A friendly 5K run for all fitness levels. Water and medals at the finish.",type:"Sports",date:d(14),time:"06:30",place:"Wadi Hanifa Trail",seats:200,taken:58,mine:false},
 {id:5,name:"Saudi Design Week Exhibition",desc:"Explore work from Saudi designers across product, fashion and graphic design.",type:"Exhibition",date:d(20),time:"16:00",place:"JAX District, Diriyah",seats:500,taken:210,mine:false}]};
let events;
try{events=JSON.parse(localStorage.getItem(KEY))||seed()}catch(e){events=seed()}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(events))}catch(e){}};
let role="attendee";
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ===== US1 Browse events + US2 Search: draw the event cards, filtered by the search box =====
function render(){
  const q=$("q").value.trim().toLowerCase();
  const list=events.filter(e=>!q||(e.name+" "+(e.desc||"")+" "+e.type+" "+e.place).toLowerCase().includes(q))
                   .sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
  $("count").textContent=q?`${list.length} result${list.length!==1?"s":""} for “${$("q").value.trim()}”`:`${list.length} upcoming events`;
  if(!list.length){$("grid").innerHTML=`<div class="empty">${q?"No results found. Try another name or keyword.":"No events available. Check back soon for new events."}</div>`;return}
  $("grid").innerHTML=list.map(e=>{
    const [y,m,d]=e.date.split("-");const left=e.seats-e.taken;
    const cls=left<=0?"full":left<=e.seats*.1?"low":"";
    let btn;
    if(role==="organizer") btn=`<span class="seats">${e.taken} registered</span>`;
    else if(e.mine) btn=`<button class="btn reg done" disabled>✓ Registered</button>`;
    else btn=`<button class="btn reg" data-id="${e.id}" ${left<=0?"disabled":""}>${left<=0?"Full":"Register"}</button>`;
    return `<article class="ticket">
      <div class="stub"><div class="m">${MON[+m-1]}</div><div class="d">${+d}</div><div class="t">${esc(e.time)}</div></div>
      <div class="info"><span class="type">${esc(e.type)}</span><h3>${esc(e.name)}</h3>${e.desc?`<p class="desc">${esc(e.desc)}</p>`:""}<div class="place">${esc(e.place)}</div>
      <div class="row"><span class="seats ${cls}">${left<=0?"No seats left":left+" / "+e.seats+" seats left"}</span>${btn}</div></div>
    </article>`}).join("");
}
function toast(t){const el=$("toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2200)}
function setRole(r){role=r;$("asAttendee").setAttribute("aria-pressed",r==="attendee");$("asOrganizer").setAttribute("aria-pressed",r==="organizer");$("newBtn").hidden=r!=="organizer";render()}
function openPanel(o){$("panel").hidden=$("scrim").hidden=!o;if(o){$("err").textContent="";$("fDate").min=new Date().toISOString().slice(0,10);$("fName").focus()}}

// ===== US2 Search: re-filter while typing =====
$("q").addEventListener("input",render);
$("asAttendee").onclick=()=>setRole("attendee");
$("asOrganizer").onclick=()=>setRole("organizer");
$("newBtn").onclick=()=>openPanel(true);
$("cancel").onclick=$("scrim").onclick=()=>openPanel(false);
// ===== US4 Register for an event: reserve a seat =====
$("grid").addEventListener("click",ev=>{
  const b=ev.target.closest("button[data-id]");if(!b)return;
  const e=events.find(x=>x.id==b.dataset.id);
  if(e.taken>=e.seats){toast("This event is full");return}
  e.taken++;e.mine=true;save();render();toast(`Seat reserved for ${e.name}`);
});
// ===== US6 Create a new event (Organizer) =====
$("form").addEventListener("submit",ev=>{
  ev.preventDefault();
  const name=$("fName").value.trim(),desc=$("fDesc").value.trim(),date=$("fDate").value,time=$("fTime").value,place=$("fPlace").value.trim(),seats=parseInt($("fSeats").value,10);
  if(!name||!desc||!date||!time||!place){$("err").textContent="Fill in all fields to publish the event.";return}
  if(date<new Date().toISOString().slice(0,10)){$("err").textContent="Pick today or a future date.";return}
  if(!(seats>=1)){$("err").textContent="Capacity must be at least 1 seat.";return}
  events.push({id:Date.now(),name,desc,type:$("fType").value,date,time,place,seats,taken:0,mine:false});
  save();$("form").reset();$("fTime").value="18:00";$("fSeats").value=50;openPanel(false);render();toast("Event published");
});
$("form").addEventListener("input",()=>$("err").textContent=""); // hide the error once the organizer fixes the form
$("reset").onclick=()=>{events=seed();save();render();toast("Demo reset")};
render();
