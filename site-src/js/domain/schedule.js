export function scheduleWindow(dep,ret){const a=new Date(dep),b=new Date(ret);return !isNaN(a)&&!isNaN(b)&&b>a?(b-a)/60000:null}
