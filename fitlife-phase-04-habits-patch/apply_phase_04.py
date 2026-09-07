from pathlib import Path
import shutil
root=Path.cwd();patch=Path(__file__).parent
for rel in ['src/features/habits']:
 src=patch/rel;dst=root/rel;dst.mkdir(parents=True,exist_ok=True)
 for f in src.iterdir():shutil.copy2(f,dst/f.name)
for rel in ['src/features/log-history/timeline.css','src/features/media/FocalPointEditor.jsx','src/features/media/focal.css','supabase/phase-04-habits.sql']:
 src=patch/rel;dst=root/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
app=root/'src/App.jsx';text=app.read_text()
imp="import HabitsPage from './features/habits/HabitsPage'\n"
if imp not in text:
 lines=text.splitlines(True);idx=0
 while idx<len(lines) and lines[idx].lstrip().startswith('import'):idx+=1
 lines.insert(idx,imp);text=''.join(lines)
text=text.replace('habits:<Habits/>','habits:<HabitsPage/>',1).replace('habits: <Habits />','habits: <HabitsPage />',1)
app.write_text(text)
print('Phase 4 Habits applied. HabitsPage is connected. Timeline and focal-point components copied.')
