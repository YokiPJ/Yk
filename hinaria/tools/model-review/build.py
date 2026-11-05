from pathlib import Path
import re
out=Path(__file__).resolve().parent;root=out.parent.parent
base=lambda p:(out/'baseline'/p).read_text(encoding='utf-8')
current=lambda p:(root/p).read_text(encoding='utf-8')
clean=lambda s:re.sub(r'^import .*;\s*$', '',s,flags=re.M).replace('export function ','function ').replace('export class ','class ').replace('export const ','const ')
wrap=lambda s:'(function(){\n'+s+'\n})();\n'
core=(out.parent/'motion-3d/vendor/three.module.min.js').read_text(encoding='utf-8');m=re.search(r'export\s*\{([^}]*)\}\s*;?\s*$',core)
pairs=[]
for item in m[1].split(','):
 n=re.split(r'\s+as\s+',item.strip());pairs.append(n[-1]+':'+n[0])
scripts=[wrap(core[:m.start()]+'\nwindow.THREE={'+','.join(pairs)+'};'),'window.ModelAudit={before:{},after:{}};']
controls=(out.parent/'motion-3d/vendor/OrbitControls.js').read_text(encoding='utf-8');controls=re.sub(r"import\s*\{([^}]*)\}\s*from\s*'three';",r'const {\1}=THREE;',controls)
scripts.append(wrap(controls.replace('export { OrbitControls };','window.ZeroOrbitControls=OrbitControls;')))
helpers=['markEquipment','fitHeldWeapon','fitShield','groundRig','finalizeVisualRig']
scripts.append(wrap(clean(current('src/player/equipmentSockets.js'))+'\nModelAudit.equipment={'+','.join(helpers)+'};'))
for kind,read in [('before',base),('after',current)]:
 src=clean(read('src/player/replayAxeModel.js'))
 if kind=='after':src='const {markEquipment,fitHeldWeapon}=ModelAudit.equipment;\n'+src
 scripts.append(wrap(src+'\nModelAudit.'+kind+'Axe=attachReplayAxe;'+ ('\nModelAudit.makeReplayAxe=makeReplayAxe;' if kind=='after' else '')))
scripts.append(wrap('const {markEquipment}=ModelAudit.equipment;const makeReplayAxe=ModelAudit.makeReplayAxe;\n'+clean(current('src/player/weaponModels.js'))+'\nModelAudit.weapons=IMPROVED_WEAPON_FACTORIES;'))
for kind,read in [('before',base),('after',current)]:
 scripts.append(wrap(clean(read('src/modelsV2/batch.js'))+'\nModelAudit.'+kind+'Batch=batchArticulatedModel;'))
 for name in ['Cavaleiro','Paladino','Feiticeiro','Druida','Bram','Yoki','Bandido','Esqueleto','Troll','Orc','Troll_Anciao','Rei_dos_Orcs']:
  src=clean(read('src/modelsV2/'+name+'.js'))
  if kind=='after':src='const {markEquipment,finalizeVisualRig}=ModelAudit.equipment;\n'+src
  scripts.append(wrap(src+'\nModelAudit.'+kind+'["'+name+'"]=createModel;'))
 scripts.append(wrap(clean(read('src/player/characterAnimator.js'))+'\nModelAudit.'+kind+'Animator=CharacterAnimator;'))
index=current('src/modelsV2/index.js');index=re.sub(r"import \{createModel as (\w+)\} from './(\w+)\.js';",r'const \1=ModelAudit.after["\2"];',index);index=clean(index)
index='const batchArticulatedModel=ModelAudit.afterBatch;const IMPROVED_WEAPON_FACTORIES=ModelAudit.weapons;const {fitHeldWeapon}=ModelAudit.equipment;\n'+index
scripts.append(wrap(index+'\nModelAudit.build=createCharacterVisualV2;'))
bundle='\n'.join(scripts);(out/'bundled.js').write_text(bundle,encoding='utf-8')
html=(out/'index.template.html').read_text(encoding='utf-8').replace('__BUNDLE__',bundle).replace('__APP__',(out/'app.js').read_text(encoding='utf-8')).replace('__LICENSE__',(out.parent/'motion-3d/vendor/THREE-LICENSE.txt').read_text(encoding='utf-8'))
(out/'HINARIA_MODELOS_ANTES_DEPOIS.html').write_text(html,encoding='utf-8')
print('Review HTML:',len(html.encode()),'bytes')
