
(function(){
  const FLIP_PREFIX = 'wagon_flip:'; // wagon_flip:<номер> = 'left'|'right'
  const PW = '0000';

  function normalize(num){
    if(!num) return '';
    const d = String(num).replace(/\D/g,'');
    return d.slice(-8).padStart(8,'0');
  }

  function setFlip(number, side){
    localStorage.setItem(FLIP_PREFIX + normalize(number), side);
  }
  function getFlip(number){
    return localStorage.getItem(FLIP_PREFIX + normalize(number));
  }

  function refreshImages(){
    const mapSrc = {
      'одноэтажный:left': 'assets/wagon_single.jpg',
      'одноэтажный:right': 'assets/wagon_single_inverted.jpg',
      'двухэтажный:left': 'assets/wagon_double.jpg',
      'двухэтажный:right': 'assets/wagon_double_inverted.jpg',
      'буревестник:left': 'assets/wagon_burevestnik.jpg',
      'буревестник:right': 'assets/wagon_burevestnik_inverted.jpg'

    };
    document.querySelectorAll('[data-wagon]').forEach(el=>{
      const num = normalize(el.getAttribute('data-wagon'));
      const model = (el.getAttribute('data-model')||'').toLowerCase();
      const side = getFlip(num)==='right' ? 'right' : 'left';
      const src = mapSrc[model+':'+side];
      const img = el.querySelector('img') || el;
      if(src && img && img.tagName === 'IMG') img.src = src;
      el.setAttribute('data-side', side);
    });
  }

  function tryAttachToEditModal(){
    const modal = document.querySelector('.modal, [role="dialog"], .dialog');
    if(!modal || modal.__flipBound) return;
    const title = (modal.querySelector('.head, .title, h2, h3')||{}).textContent||'';
    if(!/редакт/i.test(title||'')) return;

    const numInput = modal.querySelector('input[id*="num"], input[name*="num"], input[id*="номер"], input[name*="номер"]');
    if(!numInput) return;
    const number = normalize(numInput.value);
    if(!number) return;

    const host = modal.querySelector('.content, .body, form') || modal;
    const row = document.createElement('div');
    row.className = 'row';
    row.style.cssText='margin-top:8px;gap:8px;align-items:center;';
    row.innerHTML = `<input type="password" placeholder="Пароль" style="width:120px" data-pw>
      <button class="btn" data-flip>Перевернуть вагон</button>
      <span class="muted" data-state></span>`;
    host.appendChild(row);

    const state = row.querySelector('[data-state]');
    const btn = row.querySelector('[data-flip]');
    const pw = row.querySelector('[data-pw]');

    function updateBadge(){
      const side = getFlip(number)==='right' ? 'right' : 'left';
      state.textContent = 'Рабочая сторона: ' + (side==='right'?'справа':'слева');
    }
    updateBadge();

    btn.addEventListener('click', ()=>{
      if((pw.value||'') !== PW){ alert('Неверный пароль'); return; }
      const cur = getFlip(number)==='right' ? 'right' : 'left';
      const next = (cur==='right') ? 'left' : 'right';
      setFlip(number, next);
      updateBadge();
      refreshImages();
      alert('Сторона обновлена: теперь ' + (next==='right'?'справа':'слева'));
    });

    modal.__flipBound = true;
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    refreshImages();
    const mo = new MutationObserver(()=>{
      refreshImages();
      tryAttachToEditModal();
    });
    mo.observe(document.body, {childList:true, subtree:true});
  });

  window.__flip = { setFlip, getFlip, refreshImages };
})();
