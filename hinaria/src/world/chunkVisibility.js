/**
 * Lightweight 16x16 draw-group streaming: retains instanced geometry/GPU assets
 * and all original collision data. Only toggles VISIBILITY of far render chunks.
 * Full asynchronous geometry streaming can be implemented later if profiling warrants it.
 */
import * as THREE from 'three';
import { gameState } from '../core/gameState.js';
const CHUNK=16;
const keyOf=(x,z)=>`${Math.floor(x/CHUNK)},${Math.floor(z/CHUNK)}`;
let previousKey='', previousWide=false;

export function registerChunkVisual(object,x,z){
  if(!object)return null;
  if(!gameState.worldChunks)gameState.worldChunks=new Map();
  const key=keyOf(x,z);
  let group=gameState.worldChunks.get(key);
  if(!group){
    group=new THREE.Group(); group.name=`world-chunk-${key}`;
    gameState.worldChunks.set(key,group); gameState.scene.add(group);
  }
  group.add(object);
  return group;
}
export function updateChunkVisibility(x,z,cinema=false){
  const map=gameState.worldChunks;
  if(!map || !map.size || !Number.isFinite(x) || !Number.isFinite(z))return;
  const disabled=typeof location!=='undefined' && new URLSearchParams(location.search).get('stream')==='0';
  const wide=!!cinema||disabled;
  const cx=Math.floor(x/CHUNK),cz=Math.floor(z/CHUNK),key=`${cx},${cz}`;
  if(previousKey===key && previousWide===wide)return;
  previousKey=key;previousWide=wide;
  let count=0;
  for(const [chunkKey,group] of map){
    const [gx,gz]=chunkKey.split(',').map(Number);
    group.visible=wide||(Math.abs(gx-cx)<=1 && Math.abs(gz-cz)<=1);
    if(group.visible)count++;
  }
  gameState.activeChunkCount=count;
}
