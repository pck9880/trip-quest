import { TOP_REGIONS, PLACE_CATEGORIES } from '../data/selection-taxonomy.js';
import { resolveRegion, regionChildren } from '../services/live-place-search.js';
import { $, setText } from '../core/dom.js';

export function createQuestSelector({state,setStep,syncCategoriesUI,travelService}){
  let level1=null,level2=null,level3=null;
  let level2Items=[],level3Items=[];
  let progressTimer=null;
  let progressValue=0;
  let regionReady=false;
  let prepareToken=0;

  function option(value,label=value){return '<option value="'+value.replaceAll('"','&quot;')+'">'+label+'</option>'}

  function renderProgress({stateName='idle',value=0,title='REGION READY',text=''}={}){
    progressValue=Math.max(0,Math.min(100,Number(value)||0));
    const wrap=$('#regionLoadStatus'),bar=$('#regionLoadBar'),pct=$('#regionLoadPercent');
    if(wrap)wrap.dataset.state=stateName;
    if(bar)bar.style.width=progressValue+'%';
    if(pct)pct.textContent=Math.round(progressValue)+'%';
    setText('#regionLoadTitle',title);
    setText('#regionLoadText',text);
  }
  function stopProgress(){
    if(progressTimer){clearInterval(progressTimer);progressTimer=null}
  }
  function beginProgress(title,text){
    stopProgress();
    progressValue=7;
    renderProgress({stateName:'loading',value:progressValue,title,text});
    progressTimer=setInterval(()=>{
      if(progressValue>=88)return;
      const step=progressValue<35?7:progressValue<65?5:3;
      progressValue=Math.min(88,progressValue+step);
      renderProgress({stateName:'loading',value:progressValue,title,text});
    },130);
  }
  function bumpProgress(value,title,text){
    progressValue=Math.max(progressValue,value);
    renderProgress({stateName:'loading',value:progressValue,title,text});
  }
  async function finishProgress(title,text){
    stopProgress();
    renderProgress({stateName:'done',value:100,title,text});
    await new Promise(r=>setTimeout(r,180));
  }
  function failProgress(text){
    stopProgress();
    renderProgress({stateName:'error',value:0,title:'REGION ERROR',text});
  }
  function idleProgress(text='시·도 → 시·군·구 → 읍·면·동까지 선택하세요.'){
    stopProgress();
    renderProgress({stateName:'idle',value:0,title:'REGION READY',text});
  }
  function waitForLocalProgress(text='읍·면·동을 선택하면 장소 분석을 시작합니다.'){
    stopProgress();
    renderProgress({stateName:'idle',value:0,title:'REGION READY',text});
  }
  async function prepareSelectedRegion(){
    if(!level1||!level2||!level3||!travelService?.prepareRegion)return false;
    const token=++prepareToken;
    regionReady=false;
    const go=$('#regionContinueBtn');if(go)go.disabled=true;
    renderProgress({stateName:'loading',value:4,title:'REGION SEARCH',text:level3.name+' 장소 데이터를 준비하고 있습니다.'});
    try{
      const prepared=await travelService.prepareRegion({
        regionBoundary:level3,
        regionPath:[level1.name,level2.name,level3.name],
        categories:PLACE_CATEGORIES.map(x=>x.id),
        facilities:[]
      },{
        onProgress:info=>{
          if(token!==prepareToken)return;
          const value=Math.max(4,Math.min(100,Number(info?.value)||0));
          const title=value>=100?'REGION READY':'REGION SEARCH';
          const count=Number(info?.count)||0;
          const suffix=count&&value>=42?' · '+count+'곳 확인':'';
          renderProgress({stateName:value>=100?'done':'loading',value,title,text:(info?.text||'장소 데이터를 분석하고 있습니다.')+suffix});
        }
      });
      if(token!==prepareToken)return false;
      regionReady=true;
      const count=prepared?.items?.length||0;
      renderProgress({
        stateName:'done',
        value:100,
        title:'REGION READY',
        text:level3.name+' 장소 분석 완료 · '+count+'곳 준비'
      });
      if(go)go.disabled=false;
      return true;
    }catch(e){
      if(token!==prepareToken)return false;
      regionReady=false;
      failProgress(e?.message||'선택 지역의 장소 분석에 실패했습니다.');
      if(go)go.disabled=true;
      return false;
    }
  }

  function renderStatic(){
    const p=$('#regionLevel1');
    p.innerHTML='<option value="">시·도 선택</option>'+TOP_REGIONS.map(x=>option(x)).join('');
    $('#placeChoices').innerHTML=PLACE_CATEGORIES.map(x=>'<button type="button" data-value="'+x.id+'">'+x.label+'</button>').join('');
    syncCategoriesUI();updateSummary();idleProgress();
  }
  function currentBoundary(){return level3||level2||level1||null}
  function updateState(){
    state.regionBoundary=currentBoundary();
    state.regionBoundaries=[level1,level2,level3].filter(Boolean);
    state.regionPath=[level1?.name,level2?.name,level3?.name].filter(Boolean);
    const go=$('#regionContinueBtn');if(go)go.disabled=!(state.regionBoundary&&regionReady);
    updateSummary();
    if(state.step===1)setStep(1);
  }
  function updateSummary(){
    const region=(state.regionPath||[]).join(' › ')||'지역 미선택';
    const cats=(state.categories||[]).join(' · ')||'플레이스 미선택';
    setText('#selectionSummary',region+' / '+cats);
  }

  async function loadLevel2(){
    const el=$('#regionLevel2'),local=$('#regionLevel3');
    level2=null;level3=null;level2Items=[];level3Items=[];
    el.disabled=true;local.disabled=true;
    el.innerHTML='<option value="">시·군·구 준비</option>';
    local.innerHTML='<option value="">읍·면·동 전체</option>';
    waitForLocalProgress('시·군·구 목록을 불러오는 중입니다.');
    try{
      level2Items=await regionChildren(level1,6);
      el.innerHTML='<option value="">시·군·구 전체</option>'+level2Items.map((x,i)=>option(String(i),x.name)).join('');
      el.disabled=false;
      if(!level2Items.length)await loadLevel3(level1,false);
      else waitForLocalProgress('시·군·구를 선택하세요.');
    }catch(e){
      failProgress(e?.message||'시·군·구 정보를 불러오지 못했습니다.');
      el.innerHTML='<option value="">시·군·구 전체</option>';
      el.disabled=false;
    }
    updateState();
  }

  async function loadLevel3(parent,withProgress=true){
    const el=$('#regionLevel3');
    level3=null;level3Items=[];el.disabled=true;
    el.innerHTML='<option value="">읍·면·동 준비</option>';
    if(withProgress)waitForLocalProgress(parent.name+' 읍·면·동 목록을 불러오는 중입니다.');
    try{
      level3Items=await regionChildren(parent,8);
      el.innerHTML='<option value="">읍·면·동 선택</option>'+level3Items.map((x,i)=>option(String(i),x.name)).join('');
      if(withProgress)waitForLocalProgress('읍·면·동을 선택하면 장소 분석을 시작합니다.');
    }catch(e){
      if(withProgress)failProgress(e?.message||'읍·면·동 정보를 불러오지 못했습니다.');
      el.innerHTML='<option value="">읍·면·동 전체</option>';
    }
    el.disabled=false;updateState();
  }

  async function onLevel1(){
    const name=$('#regionLevel1').value;
    level1=level2=level3=null;
    regionReady=false;prepareToken++;
    $('#regionContinueBtn').disabled=true;
    if(!name){idleProgress();updateState();return}
    $('#regionLevel2').disabled=true;$('#regionLevel3').disabled=true;
    $('#regionLevel2').innerHTML='<option value="">시·군·구 준비</option>';
    $('#regionLevel3').innerHTML='<option value="">읍·면·동 전체</option>';
    waitForLocalProgress(name+' 행정구역을 확인하고 있습니다.');
    try{
      level1=await resolveRegion(name);
      await loadLevel2();
    }catch(e){
      failProgress(e?.message||'지역 정보를 불러오지 못했습니다.');
    }
    updateState();
  }

  async function onLevel2(){
    const v=$('#regionLevel2').value;
    level2=v===''?null:level2Items[Number(v)]||null;level3=null;
    regionReady=false;prepareToken++;
    if(level2){
      await loadLevel3(level2,true);
    }else{
      $('#regionLevel3').innerHTML='<option value="">읍·면·동 선택</option>';
      $('#regionLevel3').disabled=true;
      waitForLocalProgress('시·군·구를 선택하세요.');
    }
    updateState();
  }

  async function onLevel3(){
    const v=$('#regionLevel3').value;
    level3=v===''?null:level3Items[Number(v)]||null;
    regionReady=false;prepareToken++;
    updateState();
    if(!level3){
      waitForLocalProgress('읍·면·동을 선택하면 장소 분석을 시작합니다.');
      return;
    }
    await prepareSelectedRegion();
    updateState();
  }

  function bind(){
    renderStatic();
    $('#regionLevel1').addEventListener('change',onLevel1);
    $('#regionLevel2').addEventListener('change',onLevel2);
    $('#regionLevel3').addEventListener('change',onLevel3);
    $('#regionContinueBtn').addEventListener('click',()=>{if(state.regionBoundary&&regionReady)setStep(2)});
    $('#placeChoices').addEventListener('click',e=>{
      const b=e.target.closest('button[data-value]');if(!b)return;
      const v=b.dataset.value,arr=new Set(state.categories||[]);
      arr.has(v)?arr.delete(v):arr.add(v);state.categories=[...arr];syncCategoriesUI();updateSummary();setStep(2);
    });
  }

  function reset(){
    stopProgress();
    level1=level2=level3=null;level2Items=[];level3Items=[];
    regionReady=false;prepareToken++;
    state.regionBoundary=null;state.regionBoundaries=[];state.regionPath=[];state.categories=[];state.facilities=[];
    if($('#regionLevel1'))$('#regionLevel1').value='';
    if($('#regionLevel2')){$('#regionLevel2').innerHTML='<option value="">시·군·구 전체</option>';$('#regionLevel2').disabled=true}
    if($('#regionLevel3')){$('#regionLevel3').innerHTML='<option value="">읍·면·동 전체</option>';$('#regionLevel3').disabled=true}
    if($('#regionContinueBtn'))$('#regionContinueBtn').disabled=true;
    syncCategoriesUI();updateSummary();idleProgress();
  }
  return {bind,reset,updateSummary};
}
