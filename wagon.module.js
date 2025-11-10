/*! wagon.module.js — Production UI for wagon tooltips & badges (no layout impact, fixed) */
(function(global){
  const WagonUI = {};
  const _state = {
    dataUrl: './data/wagons_2000.json',
    youngYear: 2018,
    cellSelector: '.wagon, [data-number]',
    typeToAsset: {
      'одноэтажный': './assets/wagon_single.jpg',
      'двухэтажный': './assets/wagon_double.jpg',
      'буревестник': './assets/wagon_burevestnik.jpg'
    },
    modelToTypeRules: null,
    debug: false
  };

  function log(){ if(_state.debug) console.log.apply(console, arguments); }

  // Resolve image by type with optional inversion flag.
  function resolveAssetByType(typeName, el){
    if (!typeName) return null;
    const type = String(typeName).toLowerCase();
    let path = _state.typeToAsset[type] || null;
    if (!path) return null;
    let node = el, inverted = false;
    while (node && node !== document.body){
      const ds = node.dataset || {};
      if (ds.side === 'invert' || ds.flip === '1' || ds.inverted === '1' || ds.workingSide === 'right') { inverted = true; break; }
      if (node.classList && (node.classList.contains('is-inverted') || node.classList.contains('flip-h'))) { inverted = true; break; }
      node = node.parentElement;
    }
    if (inverted){
      const dot = path.lastIndexOf('.');
      const invPath = dot>0 ? path.slice(0,dot) + '_inverted' + path.slice(dot) : path + '_inverted';
      return invPath;
    }
    return path;
  }

  const db = {
    byNumber: new Map(),
    byId: new Map(),
    loaded: false
  };

  let tooltipEl = null;
  const initialized = new WeakSet();

  // === Нормализация номера: всегда '########' ===
  function normalizeWagonNumber(input) {
    const digits = String(input ?? '').replace(/\D/g, '');
    const last8 = digits.slice(-8);
    return last8.padStart(8, '0');
  }

  async function loadData(){
    if (db.loaded) return;
    try {
      const resp = await fetch(_state.dataUrl, { cache: 'no-store' });
      if (!resp.ok) throw new Error('Не удалось загрузить базу вагонов: '+_state.dataUrl);
      const data = await resp.json();
      data.forEach(r => {
        if (r.id !== undefined && r.id !== null) db.byId.set(String(r.id), r);
        const rawNum = (r.number !== undefined ? r.number : r['Номер']);
        if (rawNum !== undefined) db.byNumber.set(normalizeWagonNumber(rawNum), r);
      });
      db.loaded = true;
      log('DB loaded:', db.byNumber.size, 'records');
    } catch (e){
      console.error('Ошибка загрузки данных:', e);
    }
  }

  function ensureTooltip(){
    if (tooltipEl) return;
    tooltipEl = document.createElement('div');
    tooltipEl.className = 'wagon-tooltip';
    tooltipEl.style.display = 'none';
    document.body.appendChild(tooltipEl);
  }

  function buildHTML(rec){
    const rows=[
      ['Тип вагона', rec['Тип вагона']],
      ['Кол-во мест', rec['Кол-во мест']],
      ['ЭЧТК', rec['ЭЧТК']],
      ['УКВ', rec['УКВ']],
      ['Переход р/с', rec['Переход р/с']],
      ['Переход н/с', rec['Переход н/с']],
      ['Сцепка р/с', rec['Сцепка р/с']],
      ['Сцепка н/с', rec['Сцепка н/с']],
      ['Постройка', rec['Постройка']],
      ['Модель вагона', rec['Модель вагона']]
    ];
    const shownNumber = normalizeWagonNumber(rec.number ?? rec['Номер'] ?? '');
    let html = `<div class="title">Вагон №${shownNumber}</div>`;
    for(const [k,v] of rows){ 
      html += `<div class="row"><div class="k">${k}</div><div class="v">${v || '—'}</div></div>`; 
    }
    return html;
  }

  function positionTooltip(evt, anchor){
    const pad = 10;
    let x = (evt && (evt.clientX || evt.pageX)) || 0;
    let y = (evt && (evt.clientY || evt.pageY)) || 0;
    if (!x && anchor) { 
      const r = anchor.getBoundingClientRect(); 
      x = r.right; 
      y = r.top; 
    }
    const tt = tooltipEl.getBoundingClientRect();
    let l = x + 16, t = y + 16;
    if (l + tt.width > window.innerWidth - pad) l = x - tt.width - 16;
    if (t + tt.height > window.innerHeight - pad) t = y - tt.height - 16;
    tooltipEl.style.left = l + 'px';
    tooltipEl.style.top = t + 'px';
  }

  function showTooltip(rec, evt, anchor){
    ensureTooltip();
    tooltipEl.innerHTML = buildHTML(rec);
    tooltipEl.style.display = 'block';
    positionTooltip(evt, anchor);
  }

  function hideTooltip(){ if (tooltipEl) tooltipEl.style.display = 'none'; }

  function getKeyFromEl(el){
    const id = el.getAttribute('data-wagon-id');
    const num = el.getAttribute('data-number');
    if (id) return { type: 'id', value: String(id) };
    if (num) return { type: 'number', value: normalizeWagonNumber(num) };

    const numEl = el.querySelector('.num');
    if (numEl) {
      const divs = numEl.querySelectorAll('div');
      if (divs.length >= 2) {
        const part1 = (divs[0].textContent || '').trim();
        const part2 = (divs[1].textContent || '').trim();
        if (part1 && part2) {
          const normalized = normalizeWagonNumber(part1 + part2);
          return { type: 'number', value: normalized };
        }
      }
      const fullText = (numEl.textContent || '').replace(/\s+/g, '');
      if (fullText) {
        const normalized = normalizeWagonNumber(fullText);
        if (normalized) return { type: 'number', value: normalized };
      }
    }

    const txt = el.textContent || '';
    const m = txt.match(/(\d{3})[-\s]*(\d{5})/);
    if (m){
      const normalized = normalizeWagonNumber(m[1] + m[2]);
      return { type: 'number', value: normalized };
    }

    const img = el.querySelector('img');
    if (img && img.src){
      const m2 = img.src.match(/(\d{8})(?:\.\w+)?$/);
      if (m2) {
        const normalized = normalizeWagonNumber(m2[1]);
        return { type: 'number', value: normalized };
      }
    }
    return null;
  }

  function getRecByKey(key){
    if (!key) return null;
    if (key.type === 'id') return db.byId.get(String(key.value)) || null;
    if (key.type === 'number') return db.byNumber.get(normalizeWagonNumber(key.value)) || null;
    return null;
  }

  function clearBadges(root){
    root.querySelectorAll(':scope > .wagon-badge').forEach(n => n.remove());
  }

  function applyBadges(root, rec){
    clearBadges(root);
    const isYoung = Number(rec['Постройка']) >= _state.youngYear;
    const hasH = String(rec['Переход р/с']).toUpperCase() === 'HUBNER' || 
                 String(rec['Переход н/с']).toUpperCase() === 'HUBNER';
    if (isYoung){
      const s = document.createElement('div'); 
      s.className = 'wagon-badge star'; 
      s.textContent = '★'; 
      root.appendChild(s);
    }
    if (hasH){
      const h = document.createElement('div'); 
      h.className = 'wagon-badge huebner'; 
      h.textContent = 'Х'; 
      root.appendChild(h);
    }
  }

  // Определяем одно/двухэтажный вагон по строке модели.
  function deriveTypeFromModel(modelRaw){
    const s = String(modelRaw || '').toLowerCase();

    if (Array.isArray(_state.modelToTypeRules)) {
      for (const rule of _state.modelToTypeRules){
        if (!rule || !rule.type || !rule.test) continue;
        const ok = (rule.test instanceof RegExp) ? rule.test.test(s) : s.includes(String(rule.test).toLowerCase());
        if (ok) return rule.type;
      }
    }

    if (
      s.includes('двухэтаж') ||
      s.includes('2-этаж')   ||
      s.includes('2 этаж')   ||
      s.includes('2этаж')    ||
      /\b2\s*эт/i.test(s)    ||
      /\bдвух\s*эт/i.test(s)
    ){
      return 'двухэтажный';
    }
    // По умолчанию считаем одноэтажным
    return 'одноэтажный';
  }

  // === Восстановленная нормальная функция ===
  function setIconByType(root, rec){
    const img = root.querySelector('img');
    if (!img) return;

    const model = rec['Модель вагона'] || rec['Модель'] || rec['Model'];
    const floorType = deriveTypeFromModel(model);
    const src = resolveAssetByType(floorType, root) || _state.typeToAsset[floorType];
    if (src && img.getAttribute('src') !== src) img.src = src;

    const sideRaw = (root.dataset.workingSide || root.dataset.side || '').toLowerCase();
    const workingRight = sideRaw === 'right';

    const legacyFlip =
      root.classList.contains('flip-h') ||
      root.dataset.flip === '1' ||
      root.dataset.inverted === '1' ||
      root.dataset.side === 'invert';

    const assetAlreadyInverted = /_inverted\.(png|jpe?g|webp|svg)$/i.test(src || img.src);
    const needFlip = !assetAlreadyInverted && (workingRight || legacyFlip);

    img.style.transform = needFlip ? 'scaleX(-1)' : 'scaleX(1)';
    img.style.transition = 'transform 0.3s ease';
  }

  function notify(msg){
    let d = document.getElementById('wagon-notify');
    if(!d){
      d = document.createElement('div'); 
      d.id = 'wagon-notify';
      Object.assign(d.style, {
        position: 'fixed', right: '16px', bottom: '16px', maxWidth: '360px',
        padding: '12px 14px', borderRadius: '10px', background: '#111', color: '#fff',
        font: '14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Arial',
        boxShadow: '0 10px 20px rgba(0,0,0,.35)', zIndex: 10000
      });
      document.body.appendChild(d);
    }
    d.innerHTML = msg + '<div style="opacity:.75;margin-top:6px">Добавьте запись в <code>' + _state.dataUrl + '</code> (обязательно «Модель вагона»).</div>';
    d.style.display = 'block';
    clearTimeout(d._t); 
    d._t = setTimeout(() => { d.style.display = 'none'; }, 4500);
  }

  function markMissing(root, key){
    root.classList.add('wagon-root');
    root.setAttribute('tabindex', '0');
    root.addEventListener('mouseenter', () => notify('Нет данных по вагону '+(key? JSON.stringify(key.value):'')));
  }

  function enhance(root){
    if (initialized.has(root)) return;
    initialized.add(root);
    root.classList.add('wagon-root');

    const key = getKeyFromEl(root);
    const rec = getRecByKey(key);
    if (!rec){ markMissing(root, key); root.addEventListener('mouseleave', hideTooltip); return; }

    applyBadges(root, rec);
    setIconByType(root, rec);

    root.addEventListener('mouseenter', e => showTooltip(rec, e, root));
    root.addEventListener('mousemove', e => showTooltip(rec, e, root));
    root.addEventListener('mouseleave', hideTooltip);
    root.setAttribute('tabindex', '0');
    root.addEventListener('focus', e => showTooltip(rec, e, root));
    root.addEventListener('blur', hideTooltip);
  }

  function scan(){
    const elements = document.querySelectorAll(_state.cellSelector);
    elements.forEach(enhance);
  }

  function observe(){
    const mo = new MutationObserver(muts => {
      for (const m of muts){
        if (m.type === 'attributes') {
          const n = m.target;
          if (n.matches && n.matches(_state.cellSelector)) {
            const key = getKeyFromEl(n);
            const rec = getRecByKey(key);
            if (rec) setIconByType(n, rec);
          }
        }
        if (m.addedNodes){
          m.addedNodes.forEach(n => {
            if (!(n instanceof HTMLElement)) return;
            if (n.matches && n.matches(_state.cellSelector)) enhance(n);
            n.querySelectorAll && n.querySelectorAll(_state.cellSelector).forEach(enhance);
          });
        }
      }
    });

    mo.observe(document.documentElement, { 
      childList: true, 
      subtree: true, 
      attributes: true,
      attributeFilter: ['class','data-side','data-flip','data-inverted','data-working-side','data-number','data-wagon-id']
    });
  }

  WagonUI.init = async function init(options){
    Object.assign(_state, options || {});
    await loadData();
    scan();
    observe();
  };

  // auto-init if script tag has data-auto-init
  function auto(){
    const scriptEl = document.currentScript;
    if (scriptEl && scriptEl.dataset.autoInit !== undefined){
      WagonUI.init({
        dataUrl: scriptEl.dataset.dataUrl || _state.dataUrl,
        youngYear: scriptEl.dataset.youngYear ? Number(scriptEl.dataset.youngYear) : _state.youngYear,
        cellSelector: scriptEl.dataset.cellSelector || _state.cellSelector
      });
    }
  }
  try{ auto(); }catch(e){}

  global.WagonUI = WagonUI;
})(window);
