from pathlib import Path
import shutil
root=Path.cwd();patch=Path(__file__).parent
for rel in ['src/features/exercises/ExercisesPage.jsx','src/features/exercises/ExercisesPage.css','src/features/habits/HabitBinaryHeatmap.jsx','src/features/fasting/FastingPage.css','src/styles/responsive-overrides.css']:
 src=patch/rel;dst=root/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
# Wire global responsive CSS.
main=root/'src/main.jsx';text=main.read_text()
imp="import './styles/responsive-overrides.css'\n"
if imp not in text:text=text.replace("import'./styles.css';", "import'./styles.css';\n"+imp).replace("import './styles.css'", "import './styles.css'\n"+imp)
main.write_text(text)
# Enhance current Fasting JSX with legend and stage narratives after the fasting grid.
page=root/'src/features/fasting/FastingPage.jsx';text=page.read_text()
old='<div className="fast-heat">{Array.from({length:84},(_,i)=><i key={i} className={i%9===0?\'empty\':i%5===0?\'exceeded\':i%3===0?\'complete\':\'partial\'}/>)}</div>'
new='<div className="fast-heat-wrap"><div className="fast-heat">{Array.from({length:84},(_,i)=><i key={i} className={i%9===0?\'empty\':i%5===0?\'exceeded\':i%3===0?\'complete\':\'partial\'}/>)}</div></div><div className="fast-legend"><span><i className="empty"/>No fast</span><span><i className="partial"/>Partial</span><span><i className="complete"/>Target met</span><span><i className="exceeded"/>Exceeded</span></div>'
text=text.replace(old,new)
needle='</div>{editor&&<FastEditor'
narrative='</div><section className="fast-stage-narrative"><article><small>0–4h</small><h4>Fed state</h4><p>Digestion and recent-meal energy use remain dominant. This is an educational estimate, not a measured biological state.</p></article><article><small>4–12h</small><h4>Glycogen phase</h4><p>Stored carbohydrate continues supporting energy needs as insulin generally trends down.</p></article><article><small>12–24h</small><h4>Metabolic switch estimate</h4><p>Fat contribution may gradually increase. Timing varies considerably between people and days.</p></article><article><small>24–48h</small><h4>Extended fasting</h4><p>Longer fasts require additional care with hydration, symptoms, medication, and individual health context.</p></article><article><small>48h+</small><h4>Long-duration fast</h4><p>FitLife records time only and does not verify ketosis, autophagy, or immune effects.</p></article></section>{editor&&<FastEditor'
text=text.replace(needle,narrative)
page.write_text(text)
print('Consolidated Exercises, Fasting, Habits asset, and responsive refinement applied.')
