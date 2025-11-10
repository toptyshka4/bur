
(function(){
  const LS_KEY = 'formed_trains';
  const FLIP_PREFIX = 'wagon_flip:';
  const WEEK = ['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];

  function norm(n){ if(!n) return ''; const d=String(n).replace(/\D/g,''); return d.slice(-8).padStart(8,'0'); }
  function loadDB(){ return fetch('./data/wagons_2000.json', {cache:'no-store'}).then(r=>r.json()); }
  function buildIndex(db){ const m=new Map(); db.forEach(r=>{ if(r.number && r.number!=='Номер вагона') m.set(norm(r.number), r); }); return m; }
  function loadFormed(){ try{ return JSON.parse(localStorage.getItem(LS_KEY)||'[]'); }catch(e){ return []; } }
  function saveFormed(x){ localStorage.setItem(LS_KEY, JSON.stringify(x)); }

  function imgFor(rec, number){
    const model = String(rec?.['Модель вагона']||'одноэтажный').toLowerCase();
    const right = (localStorage.getItem(FLIP_PREFIX+norm(number))==='right');
    const dbl = model.includes('двух');
    if(dbl) return right?'assets/wagon_double_inverted.jpg':'assets/wagon_double.jpg';
    return right?'assets/wagon_single_inverted.jpg':'assets/wagon_single.jpg';
  }
  function parseHM(hm){ const m=String(hm||'').match(/^(\d{1,3}):(\d{2})$/); return {h:+(m?.[1]||0), m:+(m?.[2]||0)}; }

  // index.html integration
  function integrateMain(){
    function ensureBtn(){
      if(document.getElementById('btnFormed')) return;
      const bar = document.querySelector('#btnInventory')?.parentElement
        || document.querySelector('.nav, .toolbar, header .row, .top-panel, .header, #topbar, .actions')
        || document.body;
      const b = document.createElement('button');
      b.className='btn'; b.id='btnFormed'; b.textContent='Сформировать поезд'; b.style.marginLeft='8px';
      (bar.appendChild?bar:document.body).appendChild(b);
      b.addEventListener('click', ()=> window.open('./trains.html','_blank'));
    }
    ensureBtn();
    new MutationObserver(()=>ensureBtn()).observe(document.body,{childList:true,subtree:true});

    // Add "Добавить сформированный поезд" в модалку добавления, если есть
    const modal = document.getElementById('modalAdd');
    if(modal){
      const content = modal.querySelector('.row') || modal;
      if(content && !content.querySelector('#formed-select')){
        const wrap = document.createElement('div');
        wrap.style.cssText='width:100%; margin-top:8px;';
        wrap.innerHTML = `<div class="muted">Добавить сформированный поезд</div>
          <div class="row">
            <select id="formed-select" style="min-width:280px"></select>
            <button class="btn" id="btnAddFormedNow">Добавить сформированный поезд</button>
          </div>`;
        content.insertAdjacentElement('afterend', wrap);
        function fill(){
          const arr=loadFormed(); const sel=wrap.querySelector('#formed-select'); sel.innerHTML='';
          arr.forEach(t=>{
            const total=(t.consists||[]).reduce((s,c)=>s+(c.numbers||[]).length,0);
            const opt=document.createElement('option'); opt.value=t.id; opt.textContent=(t.name||'(без названия)')+` — ${total} ваг.`; sel.appendChild(opt);
          });
        }
        fill();
        wrap.querySelector('#btnAddFormedNow').addEventListener('click', ()=>{
          const arr=loadFormed(); const id=wrap.querySelector('#formed-select').value; const t=arr.find(x=>x.id===id);
          if(!t){ alert('Выберите поезд'); return; }
          const nameInput=document.getElementById('add-trainname');
          const numbersArea=document.getElementById('add-numbers');
          if(nameInput) nameInput.value = t.name || '';
          const nums=(t.consists||[]).flatMap(c=>c.numbers||[]);
          if(numbersArea) numbersArea.value = nums.join(', ');
          const ok=document.getElementById('add-ok'); // Ensure some track is selected before auto-pressing OK
          const trackSel = document.getElementById('add-track');
          if (trackSel && !trackSel.value && trackSel.options && trackSel.options.length>0){
            trackSel.selectedIndex = 0;
          }
          if(ok) ok.click();
        });
      }
    }
  }

  // trains.html
  function onTrains(){ return document.getElementById('formed-trains-page'); }

  async function buildConsistBlock(i){
    const div = document.createElement('div');
    div.className = 'panel';
    div.innerHTML = `
      <div class="head">
        <div class="row" style="gap:8px;">
          <div>Состав</div>
          <input data-consist-name placeholder="Состав ${i+1}" style="width:160px;">
          <div class="row">
            <div class="muted">День отправления</div>
            <select data-weekday>
              <option value="0">Пн</option><option value="1">Вт</option><option value="2">Ср</option><option value="3">Чт</option><option value="4">Пт</option><option value="5">Сб</option><option value="6">Вс</option>
            </select>
          </div>
          <span class="tag">Вагонов: <span data-count>0</span></span>
        </div>
        <button class="btn" data-del>Удалить состав</button>
      </div>
      <div class="body">
        <div class="row" style="gap:8px;align-items:flex-end;">
          <div style="flex:1"><div class="muted">Номера вагонов (через запятую)</div>
          <textarea data-numbers rows="2" placeholder="017-11111, 021-22222" style="width:100%"></textarea></div>
          <div>
            <div class="muted">Добавить вагон</div>
            <input data-add-one placeholder="017-11111">
            <div class="muted" style="font-size:12px;">Enter — добавить</div>
          </div>
          <button class="btn" data-preview>Проверить</button>
        </div>
        <div class="wagon-list" data-preview-list></div>
      </div>`;
    const tarea = div.querySelector('[data-numbers]');
    const cnt = div.querySelector('[data-count]');
    function updCount(){ const n=(tarea.value||'').split(/[,\s]+/).map(norm).filter(Boolean).length; cnt.textContent=n; }
    tarea.addEventListener('input', updCount);

    const list = div.querySelector('[data-preview-list]');
    div.querySelector('[data-preview]').addEventListener('click', async ()=>{
      const idx = buildIndex(await loadDB());
      list.innerHTML=''; const nums=(tarea.value||'').split(/[,\s]+/).map(norm).filter(Boolean);
      cnt.textContent = nums.length;
      nums.forEach((n,i)=>{
        const rec = idx.get(n);
        const card = document.createElement('div'); card.className='wagon-card'; card.draggable=true; card.dataset.number=n;
        card.innerHTML = `<button title="Удалить" data-remove style="border:none;background:transparent;font-size:16px;line-height:1;cursor:pointer;">×</button>`;
        if(rec){
          const src = imgFor(rec,n);
          card.innerHTML += `<img src="${src}"><div><div><b>${n}</b></div><div class="muted">${rec['Модель вагона']||''}${(localStorage.getItem(FLIP_PREFIX+n)==='right')?' · справа':' · слева'}</div></div>`;
        }else{
          card.innerHTML += `<div><b>${n}</b> — не найден</div>`;
        }
        card.querySelector('[data-remove]').addEventListener('click', ()=>{
          const arr=(tarea.value||'').split(/[,\s]+/).map(s=>s.trim()).filter(Boolean);
          arr.splice(i,1); tarea.value=arr.join(', '); updCount(); card.remove();
        });
        card.addEventListener('dragstart', e=> e.dataTransfer.setData('text/wagon', JSON.stringify({number:n})));
        card.addEventListener('dragover', e=> e.preventDefault());
        card.addEventListener('drop', e=>{
          e.preventDefault();
          const payload = JSON.parse(e.dataTransfer.getData('text/wagon')||'{}'); if(!payload.number) return;
          let arr=(tarea.value||'').split(/[,\s]+/).map(norm).filter(Boolean).filter(x=>x!==payload.number);
          const dropIndex = Array.from(list.children).indexOf(card);
          arr.splice(dropIndex,0,payload.number); tarea.value=arr.join(', '); updCount(); div.querySelector('[data-preview]').click();
        });
        list.appendChild(card);
      });
      list.addEventListener('dragover', e=> e.preventDefault());
      list.addEventListener('drop', e=>{
        const data=e.dataTransfer.getData('text/wagon'); if(!data) return;
        const p=JSON.parse(data); if(!p.number) return;
        let arr=(tarea.value||'').split(/[,\s]+/).map(norm).filter(Boolean).filter(x=>x!==p.number);
        arr.push(p.number); tarea.value=arr.join(', '); updCount(); div.querySelector('[data-preview]').click();
      });
    });

    div.querySelector('[data-add-one]').addEventListener('keydown', e=>{
      if(e.key==='Enter'){ e.preventDefault(); const v=norm(e.target.value); if(!v) return;
        const cur=tarea.value.trim(); tarea.value = cur?(cur+', '+v):v; e.target.value=''; updCount();
      }
    });
    div.querySelector('[data-del]').addEventListener('click', ()=> div.remove());
    return div;
  }

  async function renderTrainsPage(){
    const wrap = document.getElementById('ft-consists');
    if(!wrap) return;

    const btnAdd = document.getElementById('ft-add-consist');
    const btnSave = document.getElementById('ft-save');
    const btnSaveAs = document.getElementById('ft-save-as');
    const btnReset = document.getElementById('ft-reset');
    const list = document.getElementById('ft-list');
    const targetSel = document.getElementById('ft-target-consist');
    const editIndicator = document.getElementById('edit-indicator');

    let currentEditId = null;
    function updateTargetSelect(){
      targetSel.innerHTML='';
      Array.from(wrap.children).forEach((panel,i)=>{
        const name = panel.querySelector('[data-consist-name]').value || ('Состав ' + (i+1));
        const opt = document.createElement('option'); opt.value=String(i); opt.textContent=name; targetSel.appendChild(opt);
      });
    }

    btnAdd.addEventListener('click', async ()=>{
      wrap.appendChild(await buildConsistBlock(wrap.children.length));
      updateTargetSelect();
    });
    wrap.appendChild(await buildConsistBlock(0)); updateTargetSelect();

    function getNums(panel){ return (panel.querySelector('[data-numbers]').value||'').split(/[,\s]+/).map(norm).filter(Boolean); }
    function setNums(panel, nums){ panel.querySelector('[data-numbers]').value = nums.join(', '); const cnt=panel.querySelector('[data-count]'); if(cnt) cnt.textContent=nums.length; }

    function collectTrain(){
      const t = {
        id: currentEditId || ('t'+Date.now()),
        name: document.getElementById('ft-name').value.trim(),
        message: document.getElementById('ft-msg').value.trim(),
        arrive: document.getElementById('ft-arr').value,
        depart: document.getElementById('ft-dep').value,
        freq: document.getElementById('ft-freq').value,
        turnover: document.getElementById('ft-turnover').value,
        consists: []
      };
      Array.from(wrap.children).forEach((panel,i)=>{
        const cname = panel.querySelector('[data-consist-name]').value.trim() || ('Состав ' + (i+1));
        const nums = getNums(panel);
        const weekday = Number(panel.querySelector('[data-weekday]').value||'0');
        t.consists.push({ name: cname, numbers: nums, weekday });
      });
      return t;
    }

    function fillForm(t){
      currentEditId = t.id; editIndicator.textContent = 'Редактирование: ' + (t.name||t.id);
      document.getElementById('ft-name').value = t.name||'';
      document.getElementById('ft-msg').value = t.message||'';
      document.getElementById('ft-arr').value = t.arrive||'';
      document.getElementById('ft-dep').value = t.depart||'';
      document.getElementById('ft-freq').value = t.freq||'daily';
      document.getElementById('ft-turnover').value = t.turnover||'24:00';
      wrap.innerHTML='';
      (t.consists||[]).forEach(async (c,i)=>{
        const block = await buildConsistBlock(i); wrap.appendChild(block);
        block.querySelector('[data-consist-name]').value = c.name||('Состав '+(i+1));
        block.querySelector('[data-weekday]').value = String(c.weekday ?? 0);
        setNums(block, (c.numbers||[]));
      });
      updateTargetSelect();
    }

    function clearForm(){
      currentEditId=null; editIndicator.textContent='';
      ['ft-name','ft-msg','ft-arr','ft-dep'].forEach(id=> document.getElementById(id).value='');
      document.getElementById('ft-freq').value='daily';
      document.getElementById('ft-turnover').value='24:00';
      wrap.innerHTML=''; (async()=>{ wrap.appendChild(await buildConsistBlock(0)); updateTargetSelect(); })();
    }

    btnSave.addEventListener('click', ()=>{
      const t=collectTrain(); const arr=loadFormed(); const i=arr.findIndex(x=>x.id===t.id);
      if(i>=0) arr[i]=t; else arr.push(t); saveFormed(arr); renderList(); alert('Сохранено');
    });
    btnSaveAs.addEventListener('click', ()=>{
      const t=collectTrain(); t.id='t'+Date.now(); const arr=loadFormed(); arr.push(t); saveFormed(arr); renderList(); alert('Сохранено как новый');
    });
    btnReset.addEventListener('click', clearForm);

    // Search
    let idxCache=null, dbCache=null;
    async function ensureDB(){ if(!dbCache){ dbCache=await loadDB(); idxCache=buildIndex(dbCache);} return idxCache; }
    const inputSearch = document.getElementById('ft-search');
    const results = document.getElementById('ft-search-results');
    inputSearch.addEventListener('input', async ()=>{
      const q = inputSearch.value.replace(/\D/g,''); results.innerHTML=''; if(q.length<2) return;
      const idx = await ensureDB(); const matches = Array.from(idx.keys()).filter(n=> n.includes(q)).slice(0, 30);
      matches.forEach(n=>{
        const rec = idx.get(n); const src = imgFor(rec, n);
        const card = document.createElement('div'); card.className='wagon-card'; card.draggable=true; card.dataset.number=n;
        card.innerHTML = `<img src="${src}"><div><div><b>${n}</b></div><div class="muted">${rec['Модель вагона']||''}${(localStorage.getItem(FLIP_PREFIX+n)==='right')?' · справа':' · слева'}</div></div><button class="btn" data-add value="${n}">+ в состав</button>`;
        card.addEventListener('dragstart', e=> e.dataTransfer.setData('text/wagon', JSON.stringify({number:n})));
        card.querySelector('[data-add]').addEventListener('click', ()=>{
          const targetIdx = Number(document.getElementById('ft-target-consist').value||'0');
          const panel = document.getElementById('ft-consists').children[targetIdx]; if(!panel) return;
          const area = panel.querySelector('[data-numbers]'); const cur=area.value.trim(); area.value = cur?(cur+', '+n):n;
          const cnt = panel.querySelector('[data-count]'); if(cnt) cnt.textContent = (cur?cur.split(/[,\s]+/).filter(Boolean).length:0)+1;
        });
        results.appendChild(card);
      });
    });

    function renderScheduleCell(train, consist){
      const cell = document.createElement('div'); cell.className='cell';
      const depHM=(train.depart||'00:00').split(':').map(Number); const turn=parseHM(train.turnover);
      const now=new Date(); const todayDow=(now.getDay()+6)%7; const delta = (consist.weekday - todayDow + 7)%7;
      const dep=new Date(now.getFullYear(),now.getMonth(),now.getDate()+delta, depHM[0]||0, depHM[1]||0,0,0);
      const arr=new Date(dep.getTime() + (turn.h*60+turn.m)*60*1000);
      const fmtD=d=> d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit',year:'numeric'});
      const fmtT=d=> d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'});
      cell.innerHTML = `<div><b>${consist.name||''}</b></div><div class="muted">${WEEK[consist.weekday||0]} · Отпр: ${fmtD(dep)} ${fmtT(dep)} · Приб: ${fmtD(arr)} ${fmtT(arr)}</div><div class="thumbs" data-thumbs></div>`;
      return cell;
    }

    function renderWeeklyTable(train, mountEl){
      const wrap = document.createElement('div'); wrap.className='weekly';
      const table = document.createElement('table'); table.style.cssText='width:100%; border-collapse:collapse; font-size:13px; border:1px solid #e5e7eb;';
      const thead=document.createElement('thead'); const trh=document.createElement('tr');
      const now = new Date(); const days = Array.from({length:7}, (_,i)=> new Date(now.getFullYear(), now.getMonth(), now.getDate()+i));
      function th(txt){ const th=document.createElement('th'); th.textContent=txt; th.style.cssText='text-align:center;padding:8px;border-bottom:1px solid #e5e7eb;background:#f3f4f6;'; return th; }
      trh.appendChild(Object.assign(document.createElement('th'), {textContent:'Состав', style:'text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;background:#f3f4f6;'}));
      days.forEach(d=> trh.appendChild(th(`${WEEK[(d.getDay()+6)%7]} ${d.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'})}`)));
      thead.appendChild(trh); table.appendChild(thead);
      const tbody=document.createElement('tbody');
      train.consists.forEach(c=>{
        const tr=document.createElement('tr');
        const tdName=document.createElement('td'); tdName.textContent=c.name||'Состав'; tdName.style.cssText='padding:8px;border-bottom:1px solid #e5e7eb;'; tr.appendChild(tdName);
        days.forEach(d=>{
          const td=document.createElement('td'); td.style.cssText='padding:8px;border-bottom:1px solid #e5e7eb; text-align:center; vertical-align:top;';
          const dow=(d.getDay()+6)%7;
          if(train.freq==='daily' || dow===Number(c.weekday||0)){
            const depParts=(train.depart||'00:00').split(':').map(Number);
            const dep=new Date(d.getFullYear(),d.getMonth(),d.getDate(), depParts[0]||0, depParts[1]||0,0,0);
            const t=parseHM(train.turnover); const arr=new Date(dep.getTime() + (t.h*60+t.m)*60*1000);
            const fmtT=x=> x.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}); const fmtD=x=> x.toLocaleDateString('ru-RU',{day:'2-digit',month:'2-digit'});
            td.innerHTML = `<div><b>Отпр ${fmtT(dep)}</b></div><div class="muted">Приб ${fmtD(arr)} ${fmtT(arr)}</div>`;
          }else{ td.innerHTML='<div class="muted">—</div>'; }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      table.appendChild(tbody); wrap.appendChild(table); mountEl.appendChild(wrap); return wrap;
    }

    function renderList(){
      const arr = loadFormed(); list.innerHTML='';
      const topBar = document.createElement('div'); topBar.className='row'; topBar.style.cssText='justify-content:flex-end; margin-bottom:8px;';
      topBar.innerHTML = `<button class="btn" id="btnToggleWeek">Показать неделю</button><button class="btn" id="btnPrint">Печать</button><button class="btn" id="btnExport">Экспорт в PDF</button>`;
      list.appendChild(topBar);
      let showWeek=false;

      if(!arr.length){ list.innerHTML += '<div class="muted">Пока нет сохранённых поездов.</div>'; return; }
      arr.forEach(t=>{
        const panel=document.createElement('div'); panel.className='panel print-section'; panel.dataset.train=t.id;
        const head=document.createElement('div'); head.className='head';
        head.innerHTML = `<div><b>${t.name||'(без названия)'}</b> — ${t.consists.length} состав(ов)</div>
          <div class="row"><span class="tag">Частота: ${t.freq==='daily'?'ежедневно':'по дням'}</span><span class="tag">Приб: ${t.arrive||'—'}</span><span class="tag">Отпр: ${t.depart||'—'}</span><span class="tag">Оборот: ${t.turnover||'—'}</span>
          <button class="btn" data-inline>Составы в строку</button><button class="btn" data-open>Открыть/редактировать</button><button class="btn" data-del>Удалить</button></div>`;
        const body=document.createElement('div'); body.className='body';
        const grid=document.createElement('div'); grid.className='sched';
        t.consists.forEach(c=> grid.appendChild(renderScheduleCell(t,c)));
        body.appendChild(grid);
        const weeklyWrap = document.createElement('div'); weeklyWrap.className='weekly-wrap'; weeklyWrap.style.display='none'; body.appendChild(weeklyWrap);
        body.appendChild(Object.assign(document.createElement('div'), {className:'inline-mount'}));
        panel.appendChild(head); panel.appendChild(body);

        head.querySelector('[data-del]').addEventListener('click', ()=>{ const a=loadFormed().filter(x=>x.id!==t.id); saveFormed(a); renderList(); });
        head.querySelector('[data-open]').addEventListener('click', ()=> fillForm(t));
        head.querySelector('[data-inline]').addEventListener('click', ()=> renderTrainInlineRow(t, body.querySelector('.inline-mount')));

        list.appendChild(panel);
      });

      (async()=>{
        const idx = buildIndex(await loadDB());
        document.querySelectorAll('.sched .cell').forEach(cell=>{
          const panel=cell.closest('.panel'); const t=loadFormed().find(x=>x.id===panel.dataset.train);
          const i=Array.from(cell.parentElement.children).indexOf(cell);
          const c=t.consists[i]; const thumbs=cell.querySelector('[data-thumbs]'); if(!thumbs) return; thumbs.innerHTML='';
          (c.numbers||[]).slice(0,12).forEach(n=>{
            const rec=idx.get(n); const src=imgFor(rec,n);
            const img=document.createElement('img'); img.src=src; img.alt=n; img.style.height='28px'; img.style.border='1px solid #e5e7eb'; img.style.borderRadius='6px'; img.style.margin='2px';
            thumbs.appendChild(img);
          });
        });
      })();

      const btnWeek=document.getElementById('btnToggleWeek');
      btnWeek.addEventListener('click', ()=>{
        showWeek=!showWeek; btnWeek.textContent = showWeek?'Скрыть неделю':'Показать неделю';
        document.querySelectorAll('.panel.print-section').forEach(panel=>{
          const weekly=panel.querySelector('.weekly-wrap'); const sched=panel.querySelector('.sched');
          if(showWeek){
            weekly.style.display='block';
            if(!weekly.dataset.rendered){
              const t=loadFormed().find(x=>x.id===panel.dataset.train);
              weekly.innerHTML=''; renderWeeklyTable(t, weekly); weekly.dataset.rendered='1';
            }
          } else { weekly.style.display='none'; }
        });
      });
      document.getElementById('btnPrint').addEventListener('click', ()=> window.print());
      document.getElementById('btnExport').addEventListener('click', ()=>{
        const win=window.open('','_blank');
        const html = `<html><head><meta charset="utf-8"><title>Экспорт поездов</title>
        <style>body{font:12px system-ui;padding:16px}.panel{border:1px solid #e5e7eb;border-radius:12px;margin:12px 0;padding:12px}.head{font-weight:700;margin-bottom:8px}
        table{width:100%;border-collapse:collapse;font-size:12px;border:1px solid #e5e7eb}th,td{border-bottom:1px solid #e5e7eb;padding:6px;text-align:left}th{background:#f3f4f6}</style>
        </head><body>` + document.getElementById('ft-list').innerHTML + `<script>window.onload=function(){window.print();}</script></body></html>`;
        win.document.write(html); win.document.close();
      });
    }

    // Inline row view + calendar
    const EXC_PREFIX='formed_exc:';
    function saveExc(trainId, idx, obj){ localStorage.setItem(EXC_PREFIX+trainId+':'+idx, JSON.stringify(obj||{})); }
    function loadExc(trainId, idx){ try{ return JSON.parse(localStorage.getItem(EXC_PREFIX+trainId+':'+idx)||'{}'); }catch(e){ return {}; } }
    function ymd(d){ return d.toISOString().slice(0,10); }
    function daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }

    function buildCalendar(train, consIdx, mount, monthDate){
      const titleEl=document.getElementById('calTitle'); const grid=document.getElementById('calGrid');
      const exc=loadExc(train.id, consIdx); const d0=new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const y=d0.getFullYear(), m=d0.getMonth(); titleEl.textContent=d0.toLocaleDateString('ru-RU',{month:'long',year:'numeric'});
      const wrap=document.createElement('div'); wrap.className='calendar-grid';
      const week=['Пн','Вт','Ср','Чт','Пт','Сб','Вс']; week.forEach(w=>{ const h=document.createElement('div'); h.className='muted'; h.textContent=w; wrap.appendChild(h); });
      const depHM=(train.depart||'00:00').split(':').map(Number); const turn=parseHM(train.turnover); const depW=Number(train.consists[consIdx]?.weekday||0);
      const dowStart=(new Date(y,m,1).getDay()+6)%7; for(let i=0;i<dowStart;i++){ const b=document.createElement('div'); b.className='day muted'; b.textContent=''; wrap.appendChild(b); }
      for(let day=1; day<=daysInMonth(y,m); day++){
        const cellDate=new Date(y,m,day, depHM[0]||0, depHM[1]||0,0,0); const dwd=(cellDate.getDay()+6)%7;
        const dEl=document.createElement('div'); dEl.className='day'; dEl.textContent=String(day).padStart(2,'0');
        const key=ymd(cellDate); const isDep=(train.freq==='daily'||dwd===depW); if(isDep) dEl.classList.add('dep');
        if(exc[key]==='exclude') dEl.classList.add('excl');
        dEl.addEventListener('click', ()=>{
          const map=loadExc(train.id, consIdx); map[key]=(map[key]==='exclude')?undefined:'exclude'; if(map[key]===undefined) delete map[key];
          saveExc(train.id, consIdx, map); buildCalendar(train, consIdx, mount, new Date(y,m,1));
        });
        wrap.appendChild(dEl);
      }
      grid.innerHTML=''; grid.appendChild(wrap);
      Array.from(wrap.querySelectorAll('.day.dep')).forEach(depEl=>{
        const day=+depEl.textContent; const cellDate=new Date(y,m,day, depHM[0]||0, depHM[1]||0,0,0);
        const key=ymd(cellDate); if(exc[key]==='exclude') return;
        const arr=new Date(cellDate.getTime() + (turn.h*60+turn.m)*60*1000);
        if(arr.getFullYear()===y && arr.getMonth()===m){
          const arrCell=Array.from(wrap.querySelectorAll('.day')).find(el=> +el.textContent===arr.getDate());
          if(arrCell) arrCell.classList.add('arr');
        }
      });
    }

    function showCalendar(train, consIdx){
      const modal=document.getElementById('calModal'); const prev=document.getElementById('calPrev'); const next=document.getElementById('calNext'); const close=document.getElementById('calClose'); const grid=document.getElementById('calGrid');
      let monthDate=new Date(); function render(){ buildCalendar(train, consIdx, grid, monthDate); } render();
      prev.onclick=()=>{ monthDate=new Date(monthDate.getFullYear(), monthDate.getMonth()-1, 1); render(); };
      next.onclick=()=>{ monthDate=new Date(monthDate.getFullYear(), monthDate.getMonth()+1, 1); render(); };
      close.onclick=()=> modal.classList.add('hidden');
      modal.classList.remove('hidden'); modal.addEventListener('click', e=>{ if(e.target===modal) modal.classList.add('hidden'); });
    }

    async function renderTrainInlineRow(train, mountEl){
      const idx = buildIndex(await loadDB()); const row=document.createElement('div'); row.className='consists-row';
      train.consists.forEach((c,i)=>{
        const box=document.createElement('div'); box.className='consist-inline';
        box.innerHTML = `<div class="title">${c.name||('Состав '+(i+1))}</div>
          <div class="wagons" data-w></div>
          <div class="row" style="justify-content:flex-end; margin-top:6px;"><button class="btn" data-cal>Календарь</button></div>`;
        const cont=box.querySelector('[data-w]');
        (c.numbers||[]).forEach(n=>{
          const rec=idx.get(n); const src=imgFor(rec,n); const el=document.createElement('div'); el.className='w';
          el.innerHTML = `<img src="${src}"><div>${n}</div>`; cont.appendChild(el);
        });
        box.querySelector('[data-cal]').addEventListener('click', ()=> showCalendar(train, i));
        row.appendChild(box);
      });
      mountEl.innerHTML=''; mountEl.appendChild(row);
    }

    renderList(); // initial
  }

  if(onTrains()){
    document.addEventListener('DOMContentLoaded', renderTrainsPage);
  }else{
    document.addEventListener('DOMContentLoaded', integrateMain);
  }
})();
