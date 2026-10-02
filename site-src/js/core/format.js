export function fmtWon(n){return `${Math.round(n||0).toLocaleString('ko-KR')}원`}

export function fmtMin(m){const h=Math.floor((m||0)/60),min=Math.round((m||0)%60);return h?`${h}시간 ${min}분`:`${min}분`}

export function fmtKm(k){return `${(k||0).toFixed(1)} km`}
