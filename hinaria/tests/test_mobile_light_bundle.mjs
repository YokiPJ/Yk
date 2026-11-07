/** Execute the shipped light-budget code after Chrome 80 minification/lowering. */
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import * as THREE from 'three';

const compiled=await build({entryPoints:[fileURLToPath(new URL('../src/world/worldRenderBudget.js',import.meta.url))],bundle:true,platform:'browser',format:'iife',globalName:'WorldLighting',target:['chrome80'],minify:true,write:false,legalComments:'none'});
let clockCalls=0;
const clock={now(){assert.equal(this,clock,'performance.now retains its receiver after lowering');clockCalls++;return 150;}};
const context={performance:clock};
runInNewContext(compiled.outputFiles[0].text,context);
const scene=new THREE.Scene(),source=new THREE.PointLight(0xffaa44,2,8);
source.userData.worldLocalLight=true;scene.add(source);
const budget=context.WorldLighting.createWorldLightBudget(scene,{maxLights:2});
budget.update(0,0);assert.equal(clockCalls,1);
assert.equal(budget.diagnostics().active,1);
budget.update(0,0,300);assert.equal(clockCalls,1,'explicit fixture clock bypasses performance.now');
assert.equal(budget.diagnostics().slots,2);
budget.dispose();assert.equal(source.visible,true);
console.log('PASS Android bundle: Chrome 80 light-budget clock executes with bound receiver and no leaked temporary.');
