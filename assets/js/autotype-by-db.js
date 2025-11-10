
(function(){
  const DB_URL = './data/wagons_2000.json';
  let byNum = null;
  function norm(input){ const d=String(input||'').replace(/\D/g,''); const last8=d.slice(-8); return last8.padStart(8,'0'); }
  function deriveTypeFromModel(modelRaw){
    const s = String(modelRaw||'').toLowerCase();
    if (!s) return null;
    if (s.includes('буревестник') || s.includes('burevestnik')) return 'буревестник';
    if (/\b(double|двухэтаж|2-?этаж|двух\s*эт)\b/i.test(s)) return 'двухэтажный';
    if (s.includes('двухэтаж') || s.includes('2-этаж') || s.includes('2 этаж') || s.includes('2этаж')) return 'двухэтажный';
    return 'одноэтажный';
  }
  function toStorageKey(t){ if(t==='двухэтажный') return 'double'; if(t==='буревестник') return 'burevestnik'; return 'single'; }
  function buildMap(list){
    const m=new Map();
    (list||[]).forEach(r=>{
      const rawNum = (r.number !== undefined ? r.number : r['Номер']);
      const model = r['Модель вагона'] || r['Модель'] || r['Model'] || r['Тип_вагона'] || r['Тип вагона'];
      if (rawNum !== undefined) m.set(norm(rawNum), { model, rec:r });
    });
    return m;
  }
  function ensure(){
    if (byNum) return Promise.resolve();
    return fetch(DB_URL,{cache:'no-store'}).then(r=>r.json()).then(data=>{ byNum=buildMap(data); }).catch(()=>{ byNum=new Map(); });
  }
  function autoTypeByNumber(number){
    if(!byNum) return null;
    const row = byNum.get(norm(number));
    if(!row) return null;
    return toStorageKey(deriveTypeFromModel(row.model));
  }
  async function autoTypeByNumberAsync(number){ await ensure(); return autoTypeByNumber(number); }
  window.__autoTypeEnsure = ensure;
  window.__autoTypeByNumber = autoTypeByNumber;
  window.__autoTypeByNumberAsync = autoTypeByNumberAsync;
  document.addEventListener('DOMContentLoaded', ensure);
})();
