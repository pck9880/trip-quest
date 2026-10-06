import { TOP_REGIONS, PLACE_CATEGORIES } from '../data/selection-taxonomy.js';
import { localRegionChildren } from '../services/national-place-store.js';
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
  function waitForLocalProgress(text='지역을 선택하세요.'){
    stopProgress();
    renderProgress({stateName:'idle',value:0,title:'REGION READY',text});
  }
  function localBoundary(name,path,adminLevel){
    return {
      name,displayName:path.join(' '),osmType:'local',osmId:null,
      adminLevel,lat:null,lng:null,bbox:null,local:true,path:[...path]
    };
  }
  function markRegionReady(boundary){
    regionReady=!!boundary;
    const go=$('#regionContinueBtn');
    if(go)go.disabled=!regionReady;
    if(regionReady){
      renderProgress({
        stateName:'done',value:100,title:'REGION READY',
        text:(state.regionPath||[]).join(' › ')+' · 지역 설정 완료'
      });
    }else idleProgress();
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
    try{
      const names=await localRegionChildren([level1.name]);
      level2Items=names.map(name=>localBoundary(name,[level1.name,name],6));
      el.innerHTML='<option value="">시·군·구 전체</option>'+level2Items.map((x,i)=>option(String(i),x.name)).join('');
      el.disabled=false;
      markRegionReady(level1);
    }catch(e){
      el.innerHTML='<option value="">시·군·구 전체</option>';
      el.disabled=false;
      markRegionReady(level1);
    }
    updateState();
  }

  async function loadLevel3(parent){
    const el=$('#regionLevel3');
    level3=null;level3Items=[];el.disabled=true;
    el.innerHTML='<option value="">읍·면·동 준비</option>';
    try{
      const names=await localRegionChildren([level1.name,parent.name]);
      level3Items=names.map(name=>localBoundary(name,[level1.name,parent.name,name],8));
      el.innerHTML='<option value="">읍·면·동 전체</option>'+level3Items.map((x,i)=>option(String(i),x.name)).join('');
    }catch(e){
      el.innerHTML='<option value="">읍·면·동 전체</option>';
    }
    el.disabled=false;
    markRegionReady(parent);
    updateState();
  }

  async function onLevel1(){
    const name=$('#regionLevel1').value;
    level1=level2=level3=null;
    regionReady=false;prepareToken++;
    $('#regionContinueBtn').disabled=true;
    if(!name){idleProgress();updateState();return}
    level1=localBoundary(name,[name],4);
    updateState();
    await loadLevel2();
  }

  async function onLevel2(){
    const v=$('#regionLevel2').value;
    level2=v===''?null:level2Items[Number(v)]||null;level3=null;
    regionReady=false;prepareToken++;
    updateState();
    if(level2){
      await loadLevel3(level2);
    }else{
      $('#regionLevel3').innerHTML='<option value="">읍·면·동 전체</option>';
      $('#regionLevel3').disabled=true;
      markRegionReady(level1);
      updateState();
    }
  }

  async function onLevel3(){
    const v=$('#regionLevel3').value;
    level3=v===''?null:level3Items[Number(v)]||null;
    regionReady=false;prepareToken++;
    updateState();
    markRegionReady(level3||level2||level1);
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
