// assets/js/flip-enhanced-toggle.js
(function(){
  const pass   = document.getElementById('ctx-flip-pass');
  const toggle = document.getElementById('ctx-flip-toggle');
  const label  = document.getElementById('ctx-flip-label');
  const numEl  = document.getElementById('ctx-number');
  const wrap   = document.querySelector('#flip-controls label');

  function updateLabel(flipped){
    if (label) label.textContent = flipped ? 'Нерабочая сторона →' : 'Рабочая сторона ←';
  }
  function norm(n){ return String(n||'').replace(/\D/g,'').slice(-8).padStart(8,'0'); }
  function normalizedNum(){ return numEl ? norm(numEl.value) : ''; }

  function _get(){
    try{ const map = JSON.parse(localStorage.getItem('wagonFlipByNumber'))||{}; return !!(map[normalizedNum()]===1); }catch(_){ return false; }
  }
  function _set(v){
    try{ const map = JSON.parse(localStorage.getItem('wagonFlipByNumber'))||{}; map[normalizedNum()] = v?1:0; localStorage.setItem('wagonFlipByNumber', JSON.stringify(map)); }catch(_){}
  }

  function applyFromStorage(){
    const flipped = _get();
    if (toggle) toggle.checked = flipped;
    updateLabel(flipped);
  }

  function armUI(armed){
    if (toggle) toggle.disabled = !armed;
    if (wrap) wrap.classList.toggle('armed', !!armed);
  }

  function disarmAfterFlip(){
    if (pass){
      pass.value='';
      pass.classList.add('disabled');
      setTimeout(()=>pass.classList.remove('disabled'),200);
    }
    armUI(false);
  }

  function activate(){
    const ok = (pass && String(pass.value||'').trim()==='0000');
    armUI(ok);
  }

  if (pass){
    ['input','change','keyup','blur','paste'].forEach(ev=> pass.addEventListener(ev, activate));
    activate();
  }

  if (toggle){
    toggle.addEventListener('change', ()=>{
      const num = normalizedNum();
      if (!num) return;
      const flipped = !!toggle.checked;
      _set(flipped);
      updateLabel(flipped);

      document.querySelectorAll('[data-number]').forEach(root=>{
        const raw = root.getAttribute('data-number')||'';
        if (norm(raw)===num){
          root.setAttribute('data-working-side', flipped?'right':'left');
        }
      });

      try { window.__wagonFlipBridgeApply && window.__wagonFlipBridgeApply(); } catch(e){}
      try { saveAll && saveAll(); } catch(e){}
      try { hydrate && hydrate(); } catch(e){}

      disarmAfterFlip();
    });
  }

  document.addEventListener('DOMContentLoaded', applyFromStorage);
})();