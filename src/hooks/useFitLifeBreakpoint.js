import { useEffect,useState } from 'react'
export const breakpoints={phone:0,tabletPortrait:768,tabletLandscape:1024,desktop:1366,wide:1720}
const mode=w=>w<768?'phone':w<1024?'tabletPortrait':w<1366?'tabletLandscape':w<1720?'desktop':'wide'
export default function useFitLifeBreakpoint(){const[state,setState]=useState(()=>({mode:mode(innerWidth),width:innerWidth,height:innerHeight}));useEffect(()=>{const update=()=>setState({mode:mode(innerWidth),width:innerWidth,height:innerHeight});addEventListener('resize',update);addEventListener('orientationchange',update);return()=>{removeEventListener('resize',update);removeEventListener('orientationchange',update)}},[]);return state}
