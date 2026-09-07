from pathlib import Path
import shutil
root=Path.cwd(); patch=Path(__file__).parent
for rel in ['src/features/grateful','src/lib/supabaseClient.js','supabase/phase-02-grateful.sql']:
    src=patch/rel; dst=root/rel
    if src.is_dir():
        dst.mkdir(parents=True,exist_ok=True)
        for f in src.iterdir(): shutil.copy2(f,dst/f.name)
    else:
        dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dst)
app=root/'src/App.jsx'; text=app.read_text(encoding='utf-8')
imp="import GratefulPage from './features/grateful/GratefulPage'\n"
if imp not in text:
    lines=text.splitlines(True); idx=0
    while idx<len(lines) and lines[idx].lstrip().startswith('import'): idx+=1
    lines.insert(idx,imp); text=''.join(lines)
text=text.replace('grateful:<Gratitude/>','grateful:<GratefulPage/>',1)
text=text.replace('grateful: <Gratitude />','grateful: <GratefulPage />',1)
app.write_text(text,encoding='utf-8')
print('Phase 2 applied. GratefulPage is connected.')
