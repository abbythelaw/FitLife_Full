from pathlib import Path
import shutil
root=Path.cwd();patch=Path(__file__).parent
for rel in ['src/features/media','src/features/sports']:
 src=patch/rel;dst=root/rel;dst.mkdir(parents=True,exist_ok=True)
 for f in src.iterdir():shutil.copy2(f,dst/f.name)
for rel in ['src/features/log-history/LogHistoryEnhancements.jsx','src/features/log-history/phase-03-history.css','supabase/phase-03-sports.sql']:
 src=patch/rel;dst=root/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
app=root/'src/App.jsx';text=app.read_text()
imp="import SportsPage from './features/sports/SportsPage'\n"
if imp not in text:
 lines=text.splitlines(True);idx=0
 while idx<len(lines) and lines[idx].lstrip().startswith('import'):idx+=1
 lines.insert(idx,imp);text=''.join(lines)
text=text.replace('sports:<Sports/>','sports:<SportsPage/>',1).replace('sports: <Sports />','sports: <SportsPage />',1)
app.write_text(text)
# Grateful compact two-column journal refinement
css=root/'src/features/grateful/GratefulPage.css'
if css.exists():
 s=css.read_text();s+='\n@media(min-width:900px){.gratitude-journal{grid-template-columns:repeat(2,minmax(0,1fr))}.gratitude-journal article{min-height:210px}}\n';css.write_text(s)
print('Phase 3 applied: Sports connected, shared media installed, history enhancements copied.')
