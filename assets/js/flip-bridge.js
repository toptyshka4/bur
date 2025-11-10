// assets/js/flip-bridge.js — model-safe: only sets data-working-side, does NOT touch img.src
(function(){
  function normKey(n){ return String(n||'').replace(/\D/g,'').slice(-8).padStart(8,'0'); }
  function getMap(){
    try { return JSON.parse(localStorage.getItem('wagonFlipByNumber')) || {}; } catch(_){ return {}; }
  }
  function applyAll(){
    const map = getMap();
    let changed = false;
    document.querySelectorAll('[data-number]').forEach(root=>{
      const num = root.getAttribute('data-number');
      if (!num) return;
      const flipped = map[normKey(num)] === 1;
      const side = flipped ? 'right' : 'left';
      if (root.getAttribute('data-working-side') !== side){
        root.setAttribute('data-working-side', side); // триггерит MutationObserver в wagon.module.js
        changed = true;
      }
    });
    // Если ничего не поменяли атрибутом (все совпало), можно мягко подсказать модулю обновиться,
    // но без прямого вмешательства в src — просто сгенерим событие.
    if (!changed){
      try {
        const evt = new Event('wagon-flip-apply', { bubbles: true });
        document.dispatchEvent(evt);
      } catch(e){}
    }
  }

  // Первичные прогонки
  document.addEventListener('DOMContentLoaded', applyAll);
  window.addEventListener('load', applyAll);

  // При изменении localStorage из другой вкладки
  window.addEventListener('storage', function(e){
    if (e.key === 'wagonFlipByNumber') applyAll();
  });

  // Подхватываем отложенные/динамические изменения DOM (hydrate, загрузка БД, drag&drop)
  const mo = new MutationObserver((muts)=>{
    for (const m of muts){
      if (m.type === 'childList' || (m.type==='attributes' && (m.attributeName === 'data-number' || m.attributeName === 'data-model'))){
        if (!mo._raf){
          mo._raf = requestAnimationFrame(()=>{ mo._raf = null; applyAll(); });
        }
        break;
      }
    }
  });
  mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['data-number','data-model'] });

  // Публичный хук (можно вызвать после вашей hydrate())
  window.__wagonFlipBridgeApply = applyAll;
})();
