/* ===== Calculate Everything — app shell (mobile + desktop) =====
   UI-слой из дизайна Claude Design. Данные/compute берутся из движка
   window.CE через js/ui/registry-adapter.js (window.CALCS / CATS / fmt / raw).
   Отличия от чистого прототипа (адаптация под реальный движок):
     • compute может быть async (ленивый CAS-модуль) — useCalcState ждёт Promise;
     • steps / explain / formula приходят как HTML-строки — рендерим через dangerouslySetInnerHTML;
     • res.note показываем как подсказку в плейсхолдере результата;
     • parseHash принимает #/c/<id>, #/calc/<id> и голый #/<id> (старые ссылки). */
const { useState, useEffect, useRef, useCallback } = React;

/* ---------- tiny icon set ---------- */
const I = {
  search:  <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2"/><path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  chev:    <svg viewBox="0 0 24 24" fill="none"><path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  back:    <svg viewBox="0 0 24 24" fill="none"><path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  ext:     <svg viewBox="0 0 24 24" fill="none"><path d="M7 17 17 7M9 7h8v8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  starO:   <svg viewBox="0 0 24 24" fill="none"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
  starF:   <svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 17l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9L12 3.5Z"/></svg>,
  copy:    <svg viewBox="0 0 24 24" fill="none"><rect x="9" y="9" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.9"/><path d="M5 15V6a2 2 0 0 1 2-2h8" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round"/></svg>,
  check:   <svg viewBox="0 0 24 24" fill="none"><path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  sun:     <svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="2"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5 5l1.8 1.8M17.2 17.2 19 19M19 5l-1.8 1.8M6.8 17.2 5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  moon:    <svg viewBox="0 0 24 24" fill="none"><path d="M20 14.5A8 8 0 0 1 9.5 4 7.5 7.5 0 1 0 20 14.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/></svg>,
  home:    <svg viewBox="0 0 24 24" fill="none"><path d="M4 11.5 12 5l8 6.5M6 10v9h12v-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  grid:    <svg viewBox="0 0 24 24" fill="none"><rect x="4" y="4" width="6.5" height="6.5" rx="1.8" stroke="currentColor" strokeWidth="2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.8" stroke="currentColor" strokeWidth="2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.8" stroke="currentColor" strokeWidth="2"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.8" stroke="currentColor" strokeWidth="2"/></svg>,
  steps:   <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h10M4 12h16M4 17h7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
};

/* ---------- helpers ---------- */
const LS = {
  get:(k,d)=>{ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } },
  set:(k,v)=>{ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} },
};
const byId = (id)=> window.CALCS.find(c=>c.id===id);
function parseVals(fields, raw){
  const out={};
  (fields||[]).forEach(f=>{ const t=f.type||'num'; const v=raw[f.k];
    if(t==='num'||t==='int'){ const s=(v==null?'':String(v)).replace(',','.').trim(); out[f.k]= s===''?undefined:Number(s); }
    else if(t==='seg'||t==='select'){ out[f.k]= (v==null||v==='')? f.def : v; }
    else out[f.k]= v==null?'':v;
  });
  return out;
}
function initRaw(calc){ const r={}; (calc.fields||[]).forEach(f=>{ if(f.def!==undefined) r[f.k]=String(f.def); }); return r; }
function valText(o){ return (typeof o.value==='number'? fmt(o.value) : o.value) + (o.unit? ' '+o.unit : ''); }
function useMedia(q){ const [m,setM]=useState(()=>window.matchMedia(q).matches);
  useEffect(()=>{ const mq=window.matchMedia(q); const h=e=>setM(e.matches); mq.addEventListener('change',h); setM(mq.matches); return ()=>mq.removeEventListener('change',h); },[q]); return m; }

/* ---------- shared calculator logic + pieces ---------- */
function useCalcState(calc){
  const [raw,setRaw]=useState(()=>initRaw(calc));
  const [asyncRes,setAsyncRes]=useState(null);
  useEffect(()=>{ setRaw(initRaw(calc)); setAsyncRes(null); },[calc.id]);
  const setF=(k,v)=>setRaw(p=>({...p,[k]:v}));
  const baseParsed=parseVals(calc.fields,raw);
  const fields=calc.fieldsDyn?calc.fieldsDyn(baseParsed):calc.fields;
  const parsed=parseVals(fields,raw);

  // compute может вернуть объект (sync) или Promise (ленивый CAS-модуль)
  let sync=null, promise=null;
  if(calc.compute){ try{ const r=calc.compute(parsed); if(r&&typeof r.then==='function') promise=r; else sync=r; }catch(e){ sync=null; } }

  const sig=JSON.stringify(parsed);
  useEffect(()=>{
    if(!promise){ if(asyncRes!==null) setAsyncRes(null); return; }
    let alive=true; setAsyncRes(a=> (a&&a.__loading)?a:{__loading:true});
    Promise.resolve(promise)
      .then(r=>{ if(alive) setAsyncRes((window.CEnorm?window.CEnorm(r):r)||{outputs:null}); })
      .catch(e=>{ if(alive) setAsyncRes({outputs:null,error:String((e&&e.message)||e)}); });
    return ()=>{ alive=false; };
  },[sig, calc.id]); // eslint-disable-line

  const res = promise ? asyncRes : sync;
  const loading = !!promise && (!asyncRes || !!asyncRes.__loading);
  const hero=res&&res.outputs?(res.outputs.find(o=>o.primary)||res.outputs[0]):null;
  const rest=res&&res.outputs?res.outputs.filter(o=>o!==hero):[];
  return {raw,setF,fields,res,hero,rest,loading};
}
function copyVal(hero, showToast){ if(!hero) return; const txt= typeof hero.value==='number'? window.raw(hero.value):String(hero.value);
  try{ navigator.clipboard && navigator.clipboard.writeText(txt); }catch(e){} showToast('Результат скопирован'); }

function InputsCard({fields, raw, setF}){
  return (
    <div className="card">
      <div className="card-h">Данные</div>
      { fields.map(f=> <Field key={f.k} f={f} value={raw[f.k]!=null?raw[f.k]:(f.def!=null?String(f.def):'')} onChange={v=>setF(f.k,v)}/>) }
    </div>
  );
}
function ResultCard({hero, rest, res, loading, onCopy}){
  if(loading) return <div className="result placeholder">Загружаю математический модуль…</div>;
  if(res && res.error) return <div className="result placeholder">{res.error}</div>;
  if(!hero){
    const note = res && res.note;
    return note
      ? <div className="result placeholder" dangerouslySetInnerHTML={{__html:note}}/>
      : <div className="result placeholder">Заполните поля — результат появится здесь автоматически.</div>;
  }
  return (
    <div className="result">
      <div className="res-main">
        <div>
          <div className="res-lbl">{hero.label}</div>
          <div className="res-val">{typeof hero.value==='number'? fmt(hero.value): hero.value}{hero.unit && <span className="u">{hero.unit}</span>}</div>
        </div>
        <button className="copybtn" onClick={onCopy}>{I.copy} Копировать</button>
      </div>
      { rest.length>0 &&
        <div className={'res-extra'+(rest.length===1?' one':'')}>
          { rest.map((o,i)=> <div className="cell" key={i}><div className="k">{o.label}</div><div className="v mono">{valText(o)}</div></div>) }
        </div> }
    </div>
  );
}
function StepsCard({steps, open, setOpen}){
  const s=(steps||[]).filter(Boolean); if(!s.length) return null;
  return (
    <div className="steps">
      <button className={'steps-h'+(open?' open':'')} onClick={()=>setOpen(o=>!o)}>
        <span className="ic">{I.steps}</span> Пошаговое решение <span className="ar">{I.chev}</span>
      </button>
      { open && <div className="steps-body"><ol>{ s.map((x,i)=><li key={i}><span className="fx" dangerouslySetInnerHTML={{__html:x}}/></li>) }</ol></div> }
    </div>
  );
}
function Explain({html}){ if(!html) return null; return <div className="explain" dangerouslySetInnerHTML={{__html:html}}/>; }
function Faq({items}){
  if(!items || !items.length) return null;
  return (
    <div className="faq">
      <h2>Частые вопросы</h2>
      { items.map((qa,i)=>(
        <details className="faq-item" key={i}>
          <summary className="faq-q">{qa.q}</summary>
          <div className="faq-a" dangerouslySetInnerHTML={{__html:qa.a}}/>
        </details>
      )) }
    </div>
  );
}
function FormulaChip({html}){ if(!html) return null; return <div className="formula mono" dangerouslySetInnerHTML={{__html:html}}/>; }
/* Полная статья «теория за расчётом» (SEO + образование + воронка).
   HTML лежит в window.CE_ARTICLES[id] — загружается на страницах /calc/*.html
   (js/articles/*.js). На лёгкой главной статьи не подключены → компонент молча
   ничего не рисует, как и было; полный разбор живёт на странице калькулятора. */
function Article({id}){ const html=(window.CE_ARTICLES||{})[id]; if(!html) return null;
  return <article className="app-article" dangerouslySetInnerHTML={{__html:html}}/>; }

/* ---------- монетизация: воронка на репетиторство + футер ---------- */
function TutorCTA({cat}){
  if(!cat || !cat.tut) return null; // показываем только на предметах, где Vladimir репетитор
  return (
    <section className="app-cta">
      <div className="cta-h">Трудности с разделом «{cat.name}»?</div>
      <p>Я — Владимир, преподаю физику и математику 20+ лет (МГУ, IB/AP/SAT, Praxis 200/200). Разберём вашу задачу на бесплатной 20-минутной консультации.</p>
      <div className="cta-btns">
        <a className="cta-btn primary" href="https://tutor.podlevskikh.com" target="_blank" rel="noopener">🎓 Сайт репетитора</a>
        <a className="cta-btn" href="https://calendly.com/vladimir-podlevskikh/30min" target="_blank" rel="noopener">📅 Записаться</a>
        <a className="cta-btn" href="https://t.me/VladimirPodlevskikh" target="_blank" rel="noopener">✈️ Telegram</a>
        <a className="cta-btn" href="https://wa.me/37455873402" target="_blank" rel="noopener">💬 WhatsApp</a>
      </div>
    </section>
  );
}
function AppFooter(){
  return (
    <footer className="app-foot">
      <p>Calculate Everything · формула и пошаговое решение к каждому расчёту.</p>
      <p>Физику и математику ведёт <a href="https://t.me/VladimirPodlevskikh" target="_blank" rel="noopener">Владимир</a> — МГУ, IB/AP/SAT, 20+ лет.</p>
      <p>Готовишься к экзаменам? <a href="https://calc.podlevskikh.com/" target="_blank" rel="noopener">Калькулятор баллов ЕГЭ и ОГЭ ↗</a></p>
      <p className="foot-dom"><a href="https://calculators.podlevskikh.com/">calculators.podlevskikh.com</a></p>
    </footer>
  );
}

/* ====================================================================== */
function App(){
  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "accent": "#2a6fdb",
    "fontSize": 17,
    "radius": 16,
    "density": "regular"
  }/*EDITMODE-END*/;
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const isDesktop = useMedia('(min-width: 900px)');
  const [route, setRoute] = useState(parseHash());
  const [theme, setTheme] = useState(()=> LS.get('ce_theme','light'));
  const [favs, setFavs] = useState(()=> LS.get('ce_favs',[]));
  const [recents, setRecents] = useState(()=> LS.get('ce_recents',[]));
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState(null);
  const scrollRef = useRef(null);

  useEffect(()=>{ const f=()=>setRoute(parseHash()); window.addEventListener('hashchange',f); return ()=>window.removeEventListener('hashchange',f); },[]);
  useEffect(()=>{ document.documentElement.setAttribute('data-theme',theme); LS.set('ce_theme',theme); },[theme]);
  useEffect(()=>{ const r=document.documentElement.style;
    r.setProperty('--accent',t.accent); r.setProperty('--fs',t.fontSize+'px'); r.setProperty('--radius',t.radius+'px');
    r.setProperty('--gap',{compact:'.82',regular:'1',comfy:'1.22'}[t.density]||'1'); },[t]);
  // обновляем <title> для SEO/истории при навигации внутри приложения
  useEffect(()=>{ const c = route.v==='calc' && byId(route.id);
    document.title = c ? (c.title + ' — онлайн-калькулятор · Calculate Everything')
                       : 'Calculate Everything — калькуляторы: физика, математика, экономика, статистика'; },[route.v,route.id]);
  useEffect(()=>{ if(scrollRef.current) scrollRef.current.scrollTop=0; if(isDesktop) window.scrollTo(0,0); },[route.v,route.id,isDesktop]);

  const nav = (h)=>{ location.hash = h; };
  const toggleFav = useCallback((id)=>{ setFavs(prev=>{ const n = prev.includes(id)? prev.filter(x=>x!==id) : [id,...prev]; LS.set('ce_favs',n); return n; }); },[]);
  const pushRecent = useCallback((id)=>{ setRecents(prev=>{ const n=[id,...prev.filter(x=>x!==id)].slice(0,8); LS.set('ce_recents',n); return n; }); },[]);
  const showToast = useCallback((msg)=>{ setToast(msg); clearTimeout(window.__tt); window.__tt=setTimeout(()=>setToast(null),1600); },[]);

  const shared = {route, nav, theme, setTheme, query, setQuery, favs, toggleFav, recents, pushRecent, showToast, scrollRef};

  return (
    <>
      { isDesktop ? <DesktopApp {...shared}/> : <MobileShell {...shared}/> }
      <div className={'toast'+(toast?' show':'')}>{toast && I.check}{toast}</div>
      <TweaksPanel title="Tweaks">
        <TweakSection label="Оформление"/>
        <TweakColor label="Акцент" value={t.accent} onChange={v=>setTweak('accent',v)}
          options={['#2a6fdb','#1f8a5b','#d97757','#6b4fd8','#1b1a18']}/>
        <TweakToggle label="Тёмная тема" value={theme==='dark'} onChange={v=>setTheme(v?'dark':'light')}/>
        <TweakSection label="Типографика и плотность"/>
        <TweakSlider label="Размер текста" value={t.fontSize} min={15} max={19} step={1} unit="px" onChange={v=>setTweak('fontSize',v)}/>
        <TweakRadio label="Плотность" value={t.density} options={[{value:'compact',label:'Плотно'},{value:'regular',label:'Обычно'},{value:'comfy',label:'Просторно'}]} onChange={v=>setTweak('density',v)}/>
        <TweakSlider label="Скругление" value={t.radius} min={8} max={24} step={2} unit="px" onChange={v=>setTweak('radius',v)}/>
      </TweaksPanel>
    </>
  );
}

/* ====================================================================== */
/* ============================ MOBILE ================================== */
function MobileShell({route, nav, theme, setTheme, query, setQuery, favs, toggleFav, recents, pushRecent, showToast, scrollRef}){
  const onCalc = route.v==='calc';
  const calc = onCalc ? byId(route.id) : null;
  return (
    <div className="shell">
      { onCalc && calc
        ? <CalcScreenM calc={calc} nav={nav} fav={favs.includes(calc.id)} toggleFav={toggleFav} pushRecent={pushRecent} showToast={showToast} scrollRef={scrollRef}/>
        : <RootViewM route={route} nav={nav} theme={theme} setTheme={setTheme} query={query} setQuery={setQuery} favs={favs} toggleFav={toggleFav} recents={recents} scrollRef={scrollRef}/> }
      { !onCalc &&
        <nav className="tabbar">
          <button className={'tab'+(route.v==='home'?' on':'')} onClick={()=>nav('/')}>{I.home}<span>Главная</span></button>
          <button className={'tab'+(route.v==='all'?' on':'')} onClick={()=>nav('/all')}>{I.grid}<span>Все</span></button>
          <button className={'tab'+(route.v==='favs'?' on':'')} onClick={()=>nav('/favs')}>{I.starO}<span>Избранное</span></button>
        </nav> }
    </div>
  );
}

function RootViewM({route, nav, theme, setTheme, query, setQuery, favs, toggleFav, recents, scrollRef}){
  const q = query.trim().toLowerCase();
  const matches = q ? window.CALCS.filter(c=>{ const cat=catById(c.cat);
    return (c.title+' '+(c.sub||'')+' '+(c.desc||'')+' '+(cat?cat.name:'')).toLowerCase().includes(q); }) : [];
  const homeCats = window.CATS.filter(c=>c.tab==='home');
  const titleBig = route.v==='all' ? 'Все калькуляторы' : route.v==='favs' ? 'Избранное' : 'Калькуляторы';
  return (
    <>
      <header className="topbar flush">
        <div className="tb-title tb-big">{titleBig}</div>
        <button className="iconbtn" aria-label="Тема" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?I.sun:I.moon}</button>
      </header>
      <div className="scroll" ref={scrollRef}>
        <div className="page fadein" key={route.v}>
          { route.v!=='favs' &&
            <div className="search">{I.search}
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск калькулятора…" enterKeyHint="search"/>
              { query && <button className="clr" onClick={()=>setQuery('')} aria-label="Очистить">✕</button> }
            </div> }
          { q
            ? (matches.length ? <ListM calcs={matches} nav={nav} favs={favs} toggleFav={toggleFav}/>
                              : <div className="empty"><div className="big">🔍</div><div className="muted">Ничего не найдено по запросу «{query}»</div></div>)
            : route.v==='favs' ? <FavsM nav={nav} favs={favs} toggleFav={toggleFav} recents={recents}/>
            : route.v==='all'  ? <CatSectionsM cats={window.CATS} nav={nav} favs={favs} toggleFav={toggleFav} note="Полный каталог по разделам. Формула и пошаговое решение есть в каждом калькуляторе."/>
            : <HomeM nav={nav} favs={favs} toggleFav={toggleFav} recents={recents} cats={homeCats}/> }
          <AppFooter/>
        </div>
      </div>
    </>
  );
}
function HomeM({nav, favs, toggleFav, recents, cats}){
  const recentCalcs = recents.map(byId).filter(Boolean).slice(0,6);
  return (
    <>
      { recentCalcs.length>0 && <>
        <div className="sec"><h2>Недавние</h2></div>
        <div className="chips">{ recentCalcs.map(c=>{ const cat=catById(c.cat);
          return <button key={c.id} className="chip" onClick={()=>nav('/c/'+c.id)}><span className={'glyph '+cat.cls}>{cat.glyph}</span>{c.title}</button>; }) }</div>
      </> }
      <CatSectionsM cats={cats} nav={nav} favs={favs} toggleFav={toggleFav}/>
      <div className="subnote">Полный каталог — во вкладке «Все». Формула и пошаговое решение есть в каждом калькуляторе.</div>
    </>
  );
}
function FavsM({nav, favs, toggleFav, recents}){
  const favCalcs = favs.map(byId).filter(Boolean), recentCalcs = recents.map(byId).filter(Boolean);
  if(!favCalcs.length && !recentCalcs.length)
    return <div className="empty"><div className="big">{I.starO}</div><div className="muted" style={{marginTop:6}}>Здесь появятся избранные калькуляторы.<br/>Откройте любой и нажмите звёздочку.</div></div>;
  return (
    <>
      { favCalcs.length>0 && <><div className="sec"><h2>Избранное</h2><span className="count">{favCalcs.length}</span></div><ListM calcs={favCalcs} nav={nav} favs={favs} toggleFav={toggleFav}/></> }
      { recentCalcs.length>0 && <><div className="sec"><h2>Недавние</h2></div><ListM calcs={recentCalcs} nav={nav} favs={favs} toggleFav={toggleFav}/></> }
    </>
  );
}
function CatSectionsM({cats, nav, favs, toggleFav, note}){
  return (
    <>
      { cats.map(cat=>{ const calcs=window.CALCS.filter(c=>c.cat===cat.id); if(!calcs.length) return null;
        return <div key={cat.id}>
          <div className="sec"><span className={'glyph '+cat.cls}>{cat.glyph}</span><h2>{cat.name}</h2><span className="count">{calcs.length}</span></div>
          <ListM calcs={calcs} nav={nav} favs={favs} toggleFav={toggleFav}/>
        </div>; }) }
      { note && <div className="subnote">{note}</div> }
    </>
  );
}
function ListM({calcs, nav, favs, toggleFav}){
  return (
    <div className="list">
      { calcs.map(c=>{ const cat=catById(c.cat); const isFav=favs.includes(c.id);
        const open=()=> c.external ? window.open(c.external,'_blank','noopener') : nav('/c/'+c.id);
        return <button key={c.id} className="row" onClick={open}>
          <span className={'glyph '+cat.cls}>{cat.glyph}</span>
          <span className="tx"><b>{c.title}</b><span>{c.sub || c.desc}</span></span>
          { c.external ? <span className="ext">{I.ext}</span>
            : <><span className={'favbtn'+(isFav?' on':'')} role="button" aria-label="В избранное" onClick={(e)=>{e.stopPropagation();toggleFav(c.id);}}>{isFav?I.starF:I.starO}</span><span className="chev">{I.chev}</span></> }
        </button>; }) }
    </div>
  );
}
function CalcScreenM({calc, nav, fav, toggleFav, pushRecent, showToast, scrollRef}){
  const cat = catById(calc.cat);
  const {raw,setF,fields,res,hero,rest,loading} = useCalcState(calc);
  const [openSteps, setOpenSteps] = useState(false);
  useEffect(()=>{ pushRecent(calc.id); setOpenSteps(false); },[calc.id]);
  return (
    <>
      <header className="topbar">
        <button className="iconbtn ghost back" onClick={()=>goBack(nav)} aria-label="Назад">{I.back}</button>
        <div className="tb-title">{calc.title}</div>
        { !calc.external && <button className={'iconbtn'+(fav?'':' ghost')} onClick={()=>{toggleFav(calc.id);showToast(fav?'Убрано из избранного':'Добавлено в избранное');}} aria-label="Избранное" style={fav?{color:'#e8b23a'}:null}>{fav?I.starF:I.starO}</button> }
      </header>
      <div className="scroll" ref={scrollRef}>
        <div className="page fadein" key={calc.id}>
          <div className="calc-head">
            <span className={'glyph '+cat.cls}>{cat.glyph}</span>
            <h1>{calc.title}</h1><p>{calc.desc}</p>
            <FormulaChip html={res&&res.formula}/>
          </div>
          { calc.external
            ? <><a className="linkout" href={calc.external} target="_blank" rel="noopener">Открыть калькулятор {I.ext}</a><Explain html={calc.explain}/></>
            : <>
                <InputsCard fields={fields} raw={raw} setF={setF}/>
                <ResultCard hero={hero} rest={rest} res={res} loading={loading} onCopy={()=>copyVal(hero,showToast)}/>
                <StepsCard steps={res&&res.steps} open={openSteps} setOpen={setOpenSteps}/>
                <Explain html={calc.explain}/>
                <Article id={calc.id}/>
                <Faq items={calc.faq}/>
              </> }
          <TutorCTA cat={cat}/>
          <AppFooter/>
        </div>
      </div>
    </>
  );
}

/* ====================================================================== */
/* ============================ DESKTOP ================================= */
function DesktopApp({route, nav, theme, setTheme, query, setQuery, favs, toggleFav, recents, pushRecent, showToast}){
  const onCalc = route.v==='calc';
  const calc = onCalc ? byId(route.id) : null;
  const q = query.trim().toLowerCase();
  const matches = q ? window.CALCS.filter(c=>{ const cat=catById(c.cat);
    return (c.title+' '+(c.sub||'')+' '+(c.desc||'')+' '+(cat?cat.name:'')).toLowerCase().includes(q); }) : [];
  const homeCats = window.CATS.filter(c=>c.tab==='home');

  const goCat = (id)=>{ if(route.v!=='all') nav('/all');
    setTimeout(()=>{ const el=document.getElementById('cat-'+id); if(el){ window.scrollTo({top: el.getBoundingClientRect().top+window.scrollY-80, behavior:'smooth'}); } }, route.v!=='all'?90:0); };

  const navItem = (v,icon,label,count)=> (
    <button className={'dt-navbtn'+(route.v===v && !q?' on':'')} onClick={()=>{ setQuery(''); nav(v==='home'?'/':'/'+v); }}>
      {icon}<span>{label}</span>{count!=null && <span className="ct">{count}</span>}
    </button>
  );

  return (
    <div className="dt-shell">
      <aside className="dt-side">
        <div className="dt-brand"><span className="mk">=</span> Калькуляторы</div>
        <div className="search dt-search">{I.search}
          <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск…"/>
          { query && <button className="clr" onClick={()=>setQuery('')} aria-label="Очистить">✕</button> }
        </div>
        <nav className="dt-nav">
          { navItem('home', I.home, 'Главная') }
          { navItem('all', I.grid, 'Все калькуляторы', window.CALCS.length) }
          { navItem('favs', I.starO, 'Избранное', favs.length||null) }
        </nav>
        <div className="dt-sidecats">
          <div className="dt-sectitle">Разделы</div>
          { window.CATS.map(cat=>{ const n=window.CALCS.filter(c=>c.cat===cat.id).length;
            return <button key={cat.id} className="dt-catlink" onClick={()=>goCat(cat.id)}>
              <span className={'glyph '+cat.cls}>{cat.glyph}</span><span className="nm">{cat.name}</span><span className="ct">{n}</span>
            </button>; }) }
        </div>
        <div className="dt-side-foot">
          <button className="dt-navbtn" onClick={()=>setTheme(theme==='dark'?'light':'dark')}>
            {theme==='dark'?I.sun:I.moon}<span>{theme==='dark'?'Светлая тема':'Тёмная тема'}</span>
          </button>
        </div>
      </aside>

      <main className="dt-main">
        { onCalc && calc
          ? <CalcDetailD calc={calc} nav={nav} fav={favs.includes(calc.id)} toggleFav={toggleFav} pushRecent={pushRecent} showToast={showToast}/>
          : <div className="dt-content fadein" key={route.v+(q?'q':'')}>
              { q
                ? <><div className="sec"><h2>Найдено: {matches.length}</h2></div>{ matches.length? <CardGrid calcs={matches} nav={nav} favs={favs} toggleFav={toggleFav}/> : <div className="empty"><div className="big">🔍</div><div className="muted">Ничего не найдено по запросу «{query}»</div></div> }</>
                : route.v==='favs' ? <FavsD nav={nav} favs={favs} toggleFav={toggleFav} recents={recents}/>
                : route.v==='all'  ? <><h1 className="dt-h1">Все калькуляторы</h1><p className="dt-lead">Полный каталог по разделам.</p><SectionsD cats={window.CATS} nav={nav} favs={favs} toggleFav={toggleFav} note="Полный каталог по разделам. Формула и пошаговое решение есть в каждом калькуляторе."/></>
                : <HomeD nav={nav} favs={favs} toggleFav={toggleFav} recents={recents} cats={homeCats}/> }
              <AppFooter/>
            </div> }
      </main>
    </div>
  );
}

function HomeD({nav, favs, toggleFav, recents, cats}){
  const recentCalcs = recents.map(byId).filter(Boolean).slice(0,6);
  return (
    <>
      <h1 className="dt-h1">Калькуляторы для учёбы и экзаменов</h1>
      <p className="dt-lead">Школа · физика · математика · химия · статистика — с формулой и пошаговым решением к каждому. Бытовые, финансовые, IT и другие — во вкладке «Все калькуляторы».</p>
      { recentCalcs.length>0 && <><div className="sec"><h2>Недавние</h2></div><CardGrid calcs={recentCalcs} nav={nav} favs={favs} toggleFav={toggleFav}/></> }
      <SectionsD cats={cats} nav={nav} favs={favs} toggleFav={toggleFav}/>
    </>
  );
}
function FavsD({nav, favs, toggleFav, recents}){
  const favCalcs = favs.map(byId).filter(Boolean), recentCalcs = recents.map(byId).filter(Boolean);
  return (
    <>
      <h1 className="dt-h1">Избранное</h1>
      { favCalcs.length ? <CardGrid calcs={favCalcs} nav={nav} favs={favs} toggleFav={toggleFav}/>
        : <div className="empty"><div className="big">{I.starO}</div><div className="muted" style={{marginTop:6}}>Откройте любой калькулятор и нажмите звёздочку — он появится здесь.</div></div> }
      { recentCalcs.length>0 && <><div className="sec"><h2>Недавние</h2></div><CardGrid calcs={recentCalcs} nav={nav} favs={favs} toggleFav={toggleFav}/></> }
    </>
  );
}
function SectionsD({cats, nav, favs, toggleFav, note}){
  return (
    <>
      { cats.map(cat=>{ const calcs=window.CALCS.filter(c=>c.cat===cat.id); if(!calcs.length) return null;
        return <div key={cat.id} id={'cat-'+cat.id} className="dt-block">
          <div className="sec"><span className={'glyph '+cat.cls}>{cat.glyph}</span><h2>{cat.name}</h2><span className="count">{calcs.length}</span></div>
          <CardGrid calcs={calcs} nav={nav} favs={favs} toggleFav={toggleFav}/>
        </div>; }) }
      { note && <div className="subnote">{note}</div> }
    </>
  );
}
function CardGrid({calcs, nav, favs, toggleFav}){
  return (
    <div className="dt-grid">
      { calcs.map(c=>{ const cat=catById(c.cat); const isFav=favs.includes(c.id);
        const open=()=> c.external ? window.open(c.external,'_blank','noopener') : nav('/c/'+c.id);
        return <button key={c.id} className="card-calc" onClick={open}>
          <div className="cc-top">
            <span className={'glyph '+cat.cls}>{cat.glyph}</span>
            { c.external ? <span className="ext">{I.ext}</span>
              : <span className={'favbtn'+(isFav?' on':'')} role="button" aria-label="В избранное" onClick={(e)=>{e.stopPropagation();toggleFav(c.id);}}>{isFav?I.starF:I.starO}</span> }
          </div>
          <b>{c.title}</b>
          <span>{c.sub || c.desc}</span>
        </button>; }) }
    </div>
  );
}
function CalcDetailD({calc, nav, fav, toggleFav, pushRecent, showToast}){
  const cat = catById(calc.cat);
  const {raw,setF,fields,res,hero,rest,loading} = useCalcState(calc);
  const [openSteps, setOpenSteps] = useState(true);
  useEffect(()=>{ pushRecent(calc.id); setOpenSteps(true); },[calc.id]);
  return (
    <div className="dt-content fadein" key={calc.id}>
      <button className="dt-back" onClick={()=>goBack(nav)}>{I.back} Назад</button>
      <div className="dt-dhead">
        <span className={'glyph '+cat.cls}>{cat.glyph}</span>
        <div className="dt-dhead-tx"><h1>{calc.title}</h1><p>{calc.desc}</p></div>
        { !calc.external && <button className={'iconbtn'+(fav?'':' ghost')} onClick={()=>{toggleFav(calc.id);showToast(fav?'Убрано из избранного':'Добавлено в избранное');}} aria-label="Избранное" style={fav?{color:'#e8b23a'}:null}>{fav?I.starF:I.starO}</button> }
      </div>
      <FormulaChip html={res&&res.formula}/>
      { calc.external
        ? <><a className="linkout" href={calc.external} target="_blank" rel="noopener" style={{maxWidth:360}}>Открыть калькулятор {I.ext}</a><div style={{maxWidth:640}}><Explain html={calc.explain}/></div></>
        : <div className="dt-detail">
            <div className="dt-col"><InputsCard fields={fields} raw={raw} setF={setF}/></div>
            <div className="dt-col">
              <ResultCard hero={hero} rest={rest} res={res} loading={loading} onCopy={()=>copyVal(hero,showToast)}/>
              <StepsCard steps={res&&res.steps} open={openSteps} setOpen={setOpenSteps}/>
              <Explain html={calc.explain}/>
            </div>
          </div> }
      { !calc.external && <><Article id={calc.id}/><Faq items={calc.faq}/></> }
      <TutorCTA cat={cat}/>
      <AppFooter/>
    </div>
  );
}

/* ---------------- field renderer (shared) ----------------
   id={'in_'+f.k}: воспроизводит DOM-контракт старого движка — некоторые
   compute() читают свободный текст напрямую из DOM (например символьная
   производная: in_expr / in_vr). */
function Field({f, value, onChange}){
  const type = f.type||'num';
  const id = 'in_'+f.k;
  if(type==='seg')
    return <div className="field"><label>{f.label}</label>
      <div className="seg-wrap"><div className="seg">{ f.opts.map(o=><button key={o.v} className={(value||f.def)===o.v?'on':''} onClick={()=>onChange(o.v)}>{o.label}</button>) }</div></div></div>;
  if(type==='select')
    return <div className="field"><label>{f.label}</label>
      <div className="inwrap"><select id={id} value={value||f.def} onChange={e=>onChange(e.target.value)}>{ f.opts.map(o=><option key={o.v} value={o.v}>{o.label}</option>) }</select></div></div>;
  if(type==='list')
    return <div className="field col"><label>{f.label}</label>
      <textarea id={id} value={value} onChange={e=>onChange(e.target.value)} placeholder={f.ph} inputMode="decimal" spellCheck="false"/></div>;
  if(type==='expr')
    return <div className="field col"><label>{f.label} <small>{f.hint||'операторы + − * / ^, функции sin cos exp ln sqrt'}</small></label>
      <input id={id} className="mono" value={value} onChange={e=>onChange(e.target.value)} placeholder={f.ph} spellCheck="false" autoCapitalize="off"/></div>;
  if(type==='text')
    return <div className="field"><label>{f.label}</label>
      <div className="inwrap"><input id={id} value={value} placeholder={f.ph} onChange={e=>onChange(e.target.value)} spellCheck="false" autoCapitalize="off"/></div></div>;
  if(type==='date')
    return <div className="field"><label>{f.label}</label>
      <div className="inwrap"><input id={id} type="date" value={value} onChange={e=>onChange(e.target.value)}/></div></div>;
  return <div className="field"><label>{f.label}</label>
    <div className="inwrap"><input id={id} inputMode="decimal" value={value} placeholder={f.ph||'0'} onChange={e=>onChange(e.target.value)}/>{ f.unit && <span className="unit">{f.unit}</span> }</div></div>;
}

/* ---------------- routing ---------------- */
function parseHash(){
  const h = location.hash.replace(/^#\/?/,'');
  if(h.startsWith('c/')) return {v:'calc', id:decodeURIComponent(h.slice(2))};
  if(h.startsWith('calc/')) return {v:'calc', id:decodeURIComponent(h.slice(5))}; // старые ссылки
  if(h==='all') return {v:'all'};
  if(h==='favs') return {v:'favs'};
  if(h && byId(decodeURIComponent(h))) return {v:'calc', id:decodeURIComponent(h)}; // голый #/<id>
  // статическая страница /calc/<id>.html: пустой hash + <body data-calc="id">.
  // Монтируемся сразу на этот калькулятор — URL остаётся чистым (без #).
  if(!h){ const dc = document.body && document.body.dataset && document.body.dataset.calc;
    if(dc && byId(dc)) return {v:'calc', id:dc}; }
  return {v:'home'};
}
// «Назад»: внутри SPA — history.back; при прямом заходе на /calc/*.html (истории нет)
// уводим на настоящую главную «/», а не на #/ поверх текущего файла.
function goBack(nav){
  if(history.length>1){ history.back(); return; }
  if(document.body && document.body.dataset && document.body.dataset.calc){ location.href='/'; return; }
  nav('/');
}

ReactDOM.createRoot(document.getElementById('app')).render(<App/>);
