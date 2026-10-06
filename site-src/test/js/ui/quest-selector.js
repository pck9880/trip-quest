import { TOP_REGIONS, PLACE_CATEGORIES, FACILITY_FILTERS } from '../data/selection-taxonomy.js';
import { resolveRegion, regionChildren } from '../services/live-place-search.js';
import { $, all, setText } from '../core/dom.js';

export function createQuestSelector({state,setStep,syncCategoriesUI,syncFacilitiesUI}){
  let level1=null,level2=null,level3=null;
  let level2Items=[],level3Items=[];

  function option(value,label=value){return '<option value="'+value.replaceAll('"','&quot;')+'">'+label+'</option>'}
  function renderStatic(){
    const p=$('#regionLevel1');
    p.innerHTML='<option value="">시·도 선택</option>'+TOP_REGIONS.map(x=>option(x)).join('');
    $('#placeChoices').innerHTML=PLACE_CATEGORIES.map(x=>'<button type="button" data-value="'+x.id+'">'+x.label+'</button>').join('');
    $('#facilityChoices').innerHTML=FACILITY_FILTERS.map(x=>'<button type="button" data-value="'+x.id+'">'+x.label+'</button>').join('');
    syncCategoriesUI();syncFacilitiesUI();updateSummary();
  }
  function currentBoundary(){return level3||level2||level1||null}
  function updateState(){
    state.regionBoundary=currentBoundary();
    state.regionPath=[level1?.name,level2?.name,level3?.name].filter(Boolean);
    updateSummary();
    if(state.step===1)setStep(1);
  }
  function updateSummary(){
    const region=(state.regionPath||[]).join(' › ')||'지역 미선택';
    const cats=(state.categories||[]).join(' · ')||'플레이스 미선택';
    const fac=(state.facilities||[]).map(x=>FACILITY_FILTERS.find(f=>f.id===x)?.label||x).join(' · ')||'부가조건 없음';
    setText('#selectionSummary',region+' / '+cats+' / '+fac);
  }
  async function loadLevel2(){
    const el=$('#regionLevel2'),local=$('#regionLevel3');
    level2=null;level3=null;level2Items=[];level3Items=[];
    el.disabled=true;local.disabled=true;
    el.innerHTML='<option value="">불러오는 중…</option>';
    local.innerHTML='<option value="">읍·면·동 전체</option>';
    try{
      level2Items=await regionChildren(level1,6);
      el.innerHTML='<option value="">시·군·구 전체</option>'+level2Items.map((x,i)=>option(String(i),x.name)).join('');
      el.disabled=false;
      if(!level2Items.length)await loadLevel3(level1);
    }catch{
      el.innerHTML='<option value="">시·군·구 전체</option>';
      el.disabled=false;
      await loadLevel3(level1);
    }
    updateState();
  }
  async function loadLevel3(parent){
    const el=$('#regionLevel3');
    level3=null;level3Items=[];el.disabled=true;el.innerHTML='<option value="">불러오는 중…</option>';
    try{
      level3Items=await regionChildren(parent,8);
      el.innerHTML='<option value="">읍·면·동 전체</option>'+level3Items.map((x,i)=>option(String(i),x.name)).join('');
    }catch{el.innerHTML='<option value="">읍·면·동 전체</option>'}
    el.disabled=false;updateState();
  }
  async function onLevel1(){
    const name=$('#regionLevel1').value;
    level1=level2=level3=null;
    if(!name){updateState();return}
    $('#regionLevel2').disabled=true;$('#regionLevel3').disabled=true;
    setText('#regionLoadStatus','행정구역 경계를 확인하고 있습니다…');
    try{level1=await resolveRegion(name);await loadLevel2();setText('#regionLoadStatus','원하는 범위까지만 선택하면 됩니다.')}
    catch(e){setText('#regionLoadStatus',e.message||'지역 정보를 불러오지 못했습니다.')}
    updateState();
  }
  async function onLevel2(){
    const v=$('#regionLevel2').value;
    level2=v===''?null:level2Items[Number(v)]||null;level3=null;
    if(level2)await loadLevel3(level2);
    else if(level1)await loadLevel3(level1);
    updateState();
  }
  function onLevel3(){
    const v=$('#regionLevel3').value;
    level3=v===''?null:level3Items[Number(v)]||null;updateState();
  }
  function bind(){
    renderStatic();
    $('#regionLevel1').addEventListener('change',onLevel1);
    $('#regionLevel2').addEventListener('change',onLevel2);
    $('#regionLevel3').addEventListener('change',onLevel3);
    $('#placeChoices').addEventListener('click',e=>{
      const b=e.target.closest('button[data-value]');if(!b)return;
      const v=b.dataset.value,arr=new Set(state.categories||[]);
      arr.has(v)?arr.delete(v):arr.add(v);state.categories=[...arr];syncCategoriesUI();updateSummary();setStep(2);
    });
    $('#facilityChoices').addEventListener('click',e=>{
      const b=e.target.closest('button[data-value]');if(!b)return;
      const v=b.dataset.value,arr=new Set(state.facilities||[]);
      if(v==='indoor'&&arr.has('outdoor'))arr.delete('outdoor');
      if(v==='outdoor'&&arr.has('indoor'))arr.delete('indoor');
      arr.has(v)?arr.delete(v):arr.add(v);state.facilities=[...arr];syncFacilitiesUI();updateSummary();setStep(3);
    });
  }
  function reset(){
    level1=level2=level3=null;level2Items=[];level3Items=[];
    state.regionBoundary=null;state.regionPath=[];state.categories=[];state.facilities=[];
    if($('#regionLevel1'))$('#regionLevel1').value='';
    if($('#regionLevel2')){$('#regionLevel2').innerHTML='<option value="">시·군·구 전체</option>';$('#regionLevel2').disabled=true}
    if($('#regionLevel3')){$('#regionLevel3').innerHTML='<option value="">읍·면·동 전체</option>';$('#regionLevel3').disabled=true}
    syncCategoriesUI();syncFacilitiesUI();updateSummary();
  }
  return {bind,reset,updateSummary};
}
