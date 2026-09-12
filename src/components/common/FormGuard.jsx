import { useEffect,useRef } from 'react'
import { useUnsavedChanges } from './UnsavedChangesProvider'
export default function FormGuard({id,label,value,onDiscard,children}){const guard=useUnsavedChanges(),initial=useRef(JSON.stringify(value));useEffect(()=>{JSON.stringify(value)===initial.current?guard?.markClean(id):guard?.markDirty(id,label);return()=>guard?.markClean(id)},[value]);return children({requestClose:()=>guard?.confirmDiscard(onDiscard,label),markSaved:next=>{initial.current=JSON.stringify(next);guard?.markClean(id)}})}
