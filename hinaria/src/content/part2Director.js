/** Story encounters are created only while their actual objective needs them. */
import { PART2_SPAWNS, part2SpawnTarget } from './part2.js';

export function createPart2Director({state,quests,spawnEnemy,zones=PART2_SPAWNS}) {
  let elapsed=1;
  return {
    reset(){elapsed=1;},
    tick(dt){
      if(!(dt>0)||state.flow!=='PLAYING')return;
      elapsed+=dt;if(elapsed<1)return;elapsed=0;
      const progress=JSON.parse(quests.serialize());
      for(const zone of zones){
        const desired=part2SpawnTarget(zone,progress);
        if(!desired||(zone.bossId&&state.defeatedBosses.has(zone.bossId)))continue;
        const living=state.ents.filter(enemy=>enemy.zd===zone&&enemy.hp>0).length;
        const pending=state.enemyRespawns.filter(item=>item.zone===zone).length;
        for(let index=living+pending;index<desired;index++){
          if(!spawnEnemy(zone.k,zone))break;
        }
      }
    }
  };
}
