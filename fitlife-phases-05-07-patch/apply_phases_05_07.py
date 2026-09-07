from pathlib import Path
import shutil
root=Path.cwd();patch=Path(__file__).parent
for folder in ['src/features/fasting','src/features/exercises','src/features/health']:
 src=patch/folder;dst=root/folder;dst.mkdir(parents=True,exist_ok=True)
 for f in src.iterdir():shutil.copy2(f,dst/f.name)
shutil.copy2(patch/'supabase/phases-05-07.sql',root/'supabase/phases-05-07.sql')
app=root/'src/App.jsx';text=app.read_text()
imports=["import FastingPage from './features/fasting/FastingPage'\n","import ExercisesPage from './features/exercises/ExercisesPage'\n","import HealthMetricsPage from './features/health/HealthMetricsPage'\n"]
for imp in imports:
 if imp not in text:
  lines=text.splitlines(True);i=0
  while i<len(lines) and lines[i].lstrip().startswith('import'):i+=1
  lines.insert(i,imp);text=''.join(lines)
text=text.replace('fasting:<Fasting/>','fasting:<FastingPage/>',1).replace('exercises:<Exercises/>','exercises:<ExercisesPage/>',1).replace('health:<Health/>','health:<HealthMetricsPage/>',1)
app.write_text(text)
print('Phases 5-7 applied: Fasting, Exercises, and Health Metrics connected.')
