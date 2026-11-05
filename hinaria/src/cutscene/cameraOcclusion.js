/** Camera safety for HINÁRIA boss cinematics. No Three dependency / no per-frame allocation of meshes.
 * This is an approximate world-space obstruction test, not destructive mesh hiding.
 */
export function clearBossView(position, target, obstacles = [], heightAt = () => 0) {
  const output = position.slice();
  const dx = position[0]-target[0], dz=position[2]-target[2];
  const dist = Math.hypot(dx,dz);
  if (dist < 1) return output;
  const candidates = obstacles.filter(o => o && ['rock','srock','cliff','pillar','wall','pine','oak','dead'].includes(o.t) &&
      Math.hypot(o.x-target[0],o.z-target[2]) < dist+3);
  if (!candidates.length) return output;
  // Candidate camera angles: try elevation, lateral orbit, then pull in.
  // This remains a conservative obstacle approximation; collision grids are unchanged.
  const configs = [[1,0,0],[1,1.2,0],[1,-1.2,0],[.9,2.2,1],[.9,-2.2,1],[.76,0,2.8],[.68,1.8,4.5],[.53,-1.8,5.6],[.4,0,6.5]];
  const obstaclesBetween = (cam) => {
    let blocked=0;
    for(const o of candidates){
      const uX=cam[0]-target[0],uZ=cam[2]-target[2],len2=uX*uX+uZ*uZ;
      const q=len2>0?Math.max(0,Math.min(1,((o.x-target[0])*uX+(o.z-target[2])*uZ)/len2)):0;
      if(q<.09||q>.99)continue;
      const x=target[0]+q*uX,z=target[2]+q*uZ;
      const radius=o.t==='cliff'?1.25:o.t==='pine'||o.t==='oak'?0.65:o.t==='rock'?0.9:.5;
      if(Math.hypot(x-o.x,z-o.z)>radius)continue;
      const surface=heightAt(o.x,o.z)+(o.t==='cliff'?Math.max(2.5,2.2*(o.sy||1)):o.t==='pine'||o.t==='oak'?3.4:o.t==='rock'?1.5*(o.s||1):1.5);
      const rayY=target[1]+q*(cam[1]-target[1]);
      if(rayY<surface+.3)blocked++;
    }
    return blocked;
  };
  if (!obstaclesBetween(output)) return output;
  let winner=output,best=Infinity;
  const sideX=dz/(dist||1),sideZ=-dx/(dist||1);
  for(const [scale,side,extraY] of configs){
    const c=[target[0]+dx*scale+sideX*side,position[1]+extraY,target[2]+dz*scale+sideZ*side];
    const score=obstaclesBetween(c)*100 + (1-scale)*8 + Math.abs(side)*.4 + extraY*.45;
    if(score<best){winner=c;best=score;}
    if(score<10)break;
  }
  return winner;
}
