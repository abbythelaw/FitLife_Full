export const deviceLayoutKey=mode=>`fitlife-dashboard-layout-${mode}`
export function loadDeviceLayout(mode,fallback=[]){try{return JSON.parse(localStorage.getItem(deviceLayoutKey(mode)))||fallback}catch{return fallback}}
export function saveDeviceLayout(mode,layout){localStorage.setItem(deviceLayoutKey(mode),JSON.stringify(layout));window.dispatchEvent(new CustomEvent('fitlife:dashboard-layout-changed',{detail:{mode,layout}}))}
export function resetDeviceLayout(mode){localStorage.removeItem(deviceLayoutKey(mode))}
