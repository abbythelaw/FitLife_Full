from pathlib import Path
import shutil
root=Path.cwd();patch=Path(__file__).parent
for rel in ['src/features/media/imagePersistence.js','src/features/media/MediaEditor.jsx','src/features/media/MediaCarousel.jsx','src/features/sports/sportsStore.js','src/features/log-history/LogHistoryPage.jsx','supabase/phase-03-storage-policies.sql']:
 src=patch/rel;dst=root/rel;dst.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(src,dst)
print('Media persistence and grouped Log History fix applied.')
