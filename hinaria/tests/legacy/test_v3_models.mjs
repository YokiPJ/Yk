// Node-only mesh-construction smoke test. The project uses Three.js CDN in the
// browser; this miniature scene-graph stand-in exercises the constructors and
// rig structure without claiming to validate visuals or WebGL rendering.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

class V {
    constructor(x=0,y=0,z=0) { this.x=x; this.y=y; this.z=z; }
    set(x,y,z) { this.x=x; this.y=y; this.z=z; return this; }
    setScalar(s) { return this.set(s,s,s); }
}
class G {
    constructor(...args) { this.args=args; }
    clone() { return new G(...this.args); }
    scale() { return this; }
    translate() { return this; }
    rotateX() { return this; }
    rotateY() { return this; }
    rotateZ() { return this; }
}
class Obj {
    constructor() { this.position=new V(); this.rotation=new V(); this.scale=new V(1,1,1); this.children=[]; this.userData={}; }
    add(c) { assert.ok(c instanceof Obj); this.children.push(c); c.parent=this; }
    traverse(fn) { fn(this); for(const x of this.children) x.traverse(fn); }
}
class Group extends Obj {}
class Mesh extends Obj { constructor(geometry, material) { super();this.geometry=geometry;this.material=material; } }
class Material { constructor(o={}) { Object.assign(this,o); this.userData={}; } }
const THREE = { Group, Mesh, MeshLambertMaterial:Material, MeshBasicMaterial:Material,
    SphereGeometry:G, CylinderGeometry:G, ConeGeometry:G, BoxGeometry:G,
    TorusGeometry:G, OctahedronGeometry:G, CircleGeometry:G };
const gameState={ FT: [] };
const read=(path)=>readFileSync(new URL(path,import.meta.url),'utf8')
    .replace(/^import .*;\s*$/gm,'')
    .replaceAll('export function ','function ')
    .replaceAll('export const ','const ');
const models=read('./src/player/characterModels.js');
const weapons=read('./src/player/weaponModels.js');
const context={THREE,gameState,MATERIALS:{},console}; vm.createContext(context);
vm.runInContext(models+'\n'+weapons+ '\nthis.getFactories=()=>({buildImprovedRig,attachWeaponToRig,attachShieldToRig,IMPROVED_WEAPON_FACTORIES});',context);
const {buildImprovedRig,attachWeaponToRig,attachShieldToRig,IMPROVED_WEAPON_FACTORIES}=context.getFactories();
for (const role of ['knight','ranger','mage','druid','blacksmith','sage','bandit','skeleton','troll','orc']) {
    const avatar=buildImprovedRig({role,skin:0xe2ba93,hair:0x4a3224,cloth:0x4c587b,armor:1,cape:0x832e37});
    const r=avatar.userData.r;
    assert.ok(r?.unit && r.head && r.armL && r.armR && r.legs.length===2, `${role} has full rig`);
    assert.ok(avatar.children.includes(r.unit));
    assert.ok(r.cape, `${role} has cape`);
    const weapon=IMPROVED_WEAPON_FACTORIES.sword();
    attachWeaponToRig(r,weapon);
    assert.strictEqual(r.weapon,weapon);
    attachShieldToRig(r,IMPROVED_WEAPON_FACTORIES.shield());
    let count=0;avatar.traverse(()=>count++);
    assert.ok(count>18, `${role} should be a composite mesh`);
    console.log(`OK: ${role.padEnd(12)} (${count} scene nodes)`);
}
for (const [name,fn] of Object.entries(IMPROVED_WEAPON_FACTORIES)) {
    assert.ok(fn() instanceof Obj, `weapon ${name} constructs`);
}
console.log('PASS: 10 humanoid roles + 7 weapon factories build usable rigs');
