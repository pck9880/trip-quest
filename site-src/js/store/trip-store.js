const INITIAL_SECTIONS={
  navigation:{step:1},
  origin:{current:null},
  search:{
    minKm:0,
    targetKm:100,
    direction:'전체',
    categories:['관광지'],
    recommendations:[],
    resultSort:'recommend',
    lastSearchMode:'ai',
    lastAIMessage:'',
    activeDistanceBand:null,
    searchMode:'travel',
    searchRegion:null,
    localRadiusKm:2,
    placeResults:[]
  },
  selection:{
    selected:null,
    selectedCourse:null,
    selectedCourseData:null
  },
  runtime:{
    config:null,
    aiBusy:false,
    installPrompt:null,
    sharedTrip:null,
    sharedPending:false
  }
};

const FIELD_MAP={
  step:['navigation','step'],
  origin:['origin','current'],
  minKm:['search','minKm'],
  targetKm:['search','targetKm'],
  direction:['search','direction'],
  categories:['search','categories'],
  recommendations:['search','recommendations'],
  resultSort:['search','resultSort'],
  lastSearchMode:['search','lastSearchMode'],
  lastAIMessage:['search','lastAIMessage'],
  activeDistanceBand:['search','activeDistanceBand'],
  searchMode:['search','searchMode'],
  searchRegion:['search','searchRegion'],
  localRadiusKm:['search','localRadiusKm'],
  placeResults:['search','placeResults'],
  selected:['selection','selected'],
  selectedCourse:['selection','selectedCourse'],
  selectedCourseData:['selection','selectedCourseData'],
  config:['runtime','config'],
  aiBusy:['runtime','aiBusy'],
  installPrompt:['runtime','installPrompt'],
  sharedTrip:['runtime','sharedTrip'],
  sharedPending:['runtime','sharedPending']
};

function cloneInitial(){
  return {
    navigation:{...INITIAL_SECTIONS.navigation},
    origin:{...INITIAL_SECTIONS.origin},
    search:{...INITIAL_SECTIONS.search,categories:[...INITIAL_SECTIONS.search.categories],recommendations:[],placeResults:[]},
    selection:{...INITIAL_SECTIONS.selection},
    runtime:{...INITIAL_SECTIONS.runtime}
  };
}

export function createTripStore(seed={}){
  const sections=cloneInitial();

  const state=new Proxy({},{
    get(_target,prop){
      if(prop===Symbol.toStringTag)return 'TripQuestState';
      const path=FIELD_MAP[prop];
      if(!path)return undefined;
      return sections[path[0]][path[1]];
    },
    set(_target,prop,value){
      const path=FIELD_MAP[prop];
      if(!path)throw new Error('Unknown trip state field: '+String(prop));
      sections[path[0]][path[1]]=value;
      return true;
    },
    ownKeys(){return Object.keys(FIELD_MAP)},
    getOwnPropertyDescriptor(_target,prop){
      return FIELD_MAP[prop]?{enumerable:true,configurable:true}:undefined;
    }
  });

  function update(patch={}){
    for(const [key,value] of Object.entries(patch)){
      if(FIELD_MAP[key])state[key]=value;
    }
    return state;
  }

  function resetJourney(){
    update({
      step:1,
      minKm:INITIAL_SECTIONS.search.minKm,
      targetKm:INITIAL_SECTIONS.search.targetKm,
      direction:INITIAL_SECTIONS.search.direction,
      categories:[...INITIAL_SECTIONS.search.categories],
      recommendations:[],
      resultSort:INITIAL_SECTIONS.search.resultSort,
      lastSearchMode:INITIAL_SECTIONS.search.lastSearchMode,
      lastAIMessage:INITIAL_SECTIONS.search.lastAIMessage,
      activeDistanceBand:null,
      searchMode:INITIAL_SECTIONS.search.searchMode,
      searchRegion:null,
      localRadiusKm:INITIAL_SECTIONS.search.localRadiusKm,
      placeResults:[],
      selected:null,
      selectedCourse:null,
      selectedCourseData:null,
      aiBusy:false,
      sharedPending:false
    });
    return state;
  }

  function snapshot(){
    return Object.fromEntries(Object.keys(FIELD_MAP).map(key=>[key,state[key]]));
  }

  update(seed);
  return {state,sections,update,resetJourney,snapshot};
}
