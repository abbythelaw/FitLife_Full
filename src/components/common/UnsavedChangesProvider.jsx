import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import './UnsavedChanges.css'

const Context = createContext(null)
export function UnsavedChangesProvider({ children }) {
  const dirty = useRef(new Map())
  const [dialog, setDialog] = useState(null)
  const [, redraw] = useState(0)
  const markDirty = useCallback((id, label = 'This form') => { dirty.current.set(id, label); redraw(x => x + 1) }, [])
  const markClean = useCallback(id => { dirty.current.delete(id); redraw(x => x + 1) }, [])
  const hasUnsaved = useCallback(() => dirty.current.size > 0, [])
  const confirmDiscard = useCallback((action, label) => {
    if (!hasUnsaved()) { action?.(); return Promise.resolve(true) }
    return new Promise(resolve => setDialog({ action, resolve, label: label || [...dirty.current.values()][0] }))
  }, [hasUnsaved])
  useEffect(() => {
    const beforeUnload = event => { if (hasUnsaved()) { event.preventDefault(); event.returnValue = '' } }
    window.addEventListener('beforeunload', beforeUnload)
    window.fitlifeUnsavedChanges = { markDirty, markClean, hasUnsaved, confirmDiscard }
    return () => window.removeEventListener('beforeunload', beforeUnload)
  }, [markDirty, markClean, hasUnsaved, confirmDiscard])
  const value = useMemo(() => ({ markDirty, markClean, hasUnsaved, confirmDiscard }), [markDirty, markClean, hasUnsaved, confirmDiscard])
  return <Context.Provider value={value}>{children}{dialog && <div className="fl-unsaved-layer"><button className="fl-unsaved-backdrop" onClick={() => { dialog.resolve(false); setDialog(null) }}/><section className="fl-unsaved-dialog"><small>UNSAVED CHANGES</small><h2>Discard unsaved changes?</h2><p>{dialog.label} has changes that have not been saved.</p><div><button onClick={() => { dialog.resolve(false); setDialog(null) }}>Keep editing</button><button className="danger" onClick={() => { dirty.current.clear(); dialog.action?.(); dialog.resolve(true); setDialog(null); redraw(x => x + 1) }}>Discard changes</button></div></section></div>}</Context.Provider>
}
export function useUnsavedChanges() { return useContext(Context) || window.fitlifeUnsavedChanges }
export function useDirtyForm(id, initialValue) {
  const context = useUnsavedChanges()
  const initial = useRef(JSON.stringify(initialValue))
  return {
    check(value, label) { JSON.stringify(value) === initial.current ? context?.markClean(id) : context?.markDirty(id, label) },
    saved(value) { initial.current = JSON.stringify(value); context?.markClean(id) },
    clean() { context?.markClean(id) },
  }
}
