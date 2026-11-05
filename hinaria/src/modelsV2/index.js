/** Optional V2 visual factories; use original gameplay and existing animator. */
import {createModel as makeCavaleiro} from './Cavaleiro.js';
import {createModel as makePaladino} from './Paladino.js';
import {createModel as makeFeiticeiro} from './Feiticeiro.js';
import {createModel as makeDruida} from './Druida.js';
import {createModel as makeBram} from './Bram.js';
import {createModel as makeYoki} from './Yoki.js';
import {createModel as makeBandido} from './Bandido.js';
import {createModel as makeEsqueleto} from './Esqueleto.js';
import {createModel as makeTroll} from './Troll.js';
import {createModel as makeOrc} from './Orc.js';
import {createModel as makeTroll_Anciao} from './Troll_Anciao.js';
import {createModel as makeRei_dos_Orcs} from './Rei_dos_Orcs.js';
import {batchArticulatedModel} from './batch.js';
import {IMPROVED_WEAPON_FACTORIES} from '../player/weaponModels.js';
import {fitHeldWeapon} from '../player/equipmentSockets.js';
const factories={'kn':makeCavaleiro,'pa':makePaladino,'so':makeFeiticeiro,'dr':makeDruida,'blacksmith':makeBram,'sage':makeYoki,'bandit':makeBandido,'skeleton':makeEsqueleto,'troll':makeTroll,'orc':makeOrc,'troll_ancient':makeTroll_Anciao,'orc_king':makeRei_dos_Orcs};

export function createCharacterVisualV2(id, options={}){
 if(typeof window!=='undefined' && (window.HINARIA_MODELOS_V2===false || new URLSearchParams(window.location.search).get('visual')==='classico'))return null;
 const factory=factories[id];if(!factory)return null;
 try {
   const root=factory(options),requested=options.weaponModel;
   // Upgrade meshes are equipped before batching, retaining the hand socket.
   if(requested && requested!=='replay_axe' && requested.includes('_') && IMPROVED_WEAPON_FACTORIES[requested]){
     const weapon=IMPROVED_WEAPON_FACTORIES[requested]();
     const kind=weapon.userData.equipment.kind;
     fitHeldWeapon(root.userData.r,weapon,{scale:kind==='bow'?[1,2.3,1.3]:kind==='staff'?1.75:1.28});
   }
   return batchArticulatedModel(root);
 } catch(error) { console.error('[HINÁRIA MODELOS V2]',id,error); return null; }
}
