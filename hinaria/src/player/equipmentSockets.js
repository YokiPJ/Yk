/** Shared grip, armor and bind-pose fitting for the actual game rigs. */
import * as THREE from 'three';

export function markEquipment(object,kind,grip=[0,0,0],axis='forwardZ'){
    object.userData.equipment={kind,grip:[...grip],axis};
    return object;
}

export function ensureHandGrip(rig,side='right'){
    const arm=side==='right'?rig.armR:rig.armL;
    if(!arm)return null;
    const key=side==='right'?'rightHandGrip':'leftHandGrip';
    let socket=rig[key];
    if(!socket||socket.parent!==arm){
        socket=arm.children.find(c=>c.name===(side==='right'?'RightHandGrip':'LeftHandGrip'));
        if(!socket){socket=new THREE.Group();socket.name=side==='right'?'RightHandGrip':'LeftHandGrip';arm.add(socket)}
        rig[key]=socket;
    }
    socket.position.set(...(rig.handOffset||[0,-.85,0]));
    socket.rotation.set(0,0,0);
    return socket;
}

/** Remove retired equipment without disposing materials still used by the body. */
export function retireEquipment(rig,object){
    if(!object)return;
    object.removeFromParent();
    const usedGeometry=new Set(),usedMaterial=new Set();
    rig.unit?.traverse(o=>{
        if(o.geometry)usedGeometry.add(o.geometry);
        for(const m of Array.isArray(o.material)?o.material:[o.material])if(m)usedMaterial.add(m);
    });
    const geos=new Set(),mats=new Set();
    object.traverse(o=>{
        if(o.geometry&&!usedGeometry.has(o.geometry))geos.add(o.geometry);
        for(const m of Array.isArray(o.material)?o.material:[o.material])if(m&&!usedMaterial.has(m))mats.add(m);
    });
    geos.forEach(g=>g.dispose());mats.forEach(m=>m.dispose());
}

export function fitHeldWeapon(rig,weapon,{scale=1}={}){
    if(!rig?.armR||!weapon)return false;
    if(rig.weapon&&rig.weapon!==weapon)retireEquipment(rig,rig.weapon);
    const socket=ensureHandGrip(rig),meta=weapon.userData.equipment||{kind:'sword',grip:[0,0,0],axis:'forwardZ'};
    socket.add(weapon);
    const side=Math.sign(rig.armR.position.x)||1,kind=meta.kind;
    if(Array.isArray(scale))weapon.scale.set(...scale);else weapon.scale.setScalar(scale);
    if(meta.axis==='downY')weapon.rotation.set(-.95,0,side*.10);
    else if(meta.axis==='bow')weapon.rotation.set(.60,0,0);
    else if(meta.axis==='upY')weapon.rotation.set(.35,kind.includes('axe')&&side>0?Math.PI:0,-side*.18);
    else if(kind==='staff'||kind==='club'||kind==='hammer'||kind.includes('axe'))
        weapon.rotation.set(-Math.PI/2+.35,kind.includes('axe')&&side>0?Math.PI:0,-side*.16);
    else weapon.rotation.set(.14,0,side*.08);
    // The true center of the handle coincides with the palm in every pose.
    const grip=new THREE.Vector3(...meta.grip).multiply(weapon.scale).applyQuaternion(weapon.quaternion);
    weapon.position.copy(grip).multiplyScalar(-1);
    weapon.name=weapon.name||'Equipped_'+kind;
    rig.weapon=weapon;rig.aim=kind==='bow';
    if(rig.aim&&rig.shield){retireEquipment(rig,rig.shield);rig.shield=null;}
    meta.restQuaternion=weapon.quaternion.toArray();weapon.userData.equipment=meta;
    bindWeaponPose(rig);
    rig.fitSupport=rig.aim?(draw,alpha)=>fitBowSupport(rig,draw,alpha):null;
    rig.sw=kind==='sword'?2.1:kind.includes('axe')?1.8:kind==='staff'?1.1:1.6;
    if(rig.supportTarget)rig.supportTarget.removeFromParent();
    rig.supportTarget=null;
    if(rig.aim){
        rig.supportTarget=new THREE.Object3D();rig.supportTarget.name='BowStringTarget';
        rig.supportTarget.position.set(0,0,.014);weapon.add(rig.supportTarget);
    }
    return true;
}

export function fitShield(rig,shield){
    if(!rig?.armL||!shield)return;
    if(rig.shield&&rig.shield!==shield)retireEquipment(rig,rig.shield);
    let socket=rig.armL.children.find(c=>c.name==='LeftForearmShield');
    if(!socket){socket=new THREE.Group();socket.name='LeftForearmShield';rig.armL.add(socket)}
    const y=rig.visualKind==='classic'?-.48:rig.visualKind==='king'?-.58:-.52;
    socket.position.set(0,y,rig.visualKind==='classic'?.13:.21);
    socket.rotation.set(0,0,0);socket.add(shield);shield.position.set(0,0,0);
    shield.rotation.set(0,-Math.sign(rig.armL.position.x)*.08,0);
    rig.shield=shield;
}

export function groundRig(rig){
    if(!rig?.unit?.updateWorldMatrix||!rig.legs?.length)return;
    rig.unit.position.y=0;rig.unit.updateWorldMatrix(true,true);
    const inverse=rig.unit.matrixWorld.clone().invert();
    const point=new THREE.Vector3();let minimum=Infinity;
    for(const leg of rig.legs)leg.traverse(o=>{
        if(!o.geometry?.attributes?.position)return;
        const p=o.geometry.attributes.position;
        for(let i=0;i<p.count;i++){
            point.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld).applyMatrix4(inverse);
            minimum=Math.min(minimum,point.y);
        }
    });
    if(Number.isFinite(minimum)){rig.bindY=-minimum;rig.unit.position.y=rig.bindY}
}

export function applyArmor(rig,level){
    if(!Number.isInteger(level)||level<0||level>3)return;
    const styles=[
        {color:0x607a85,metalness:.04,roughness:.92},
        {color:0x795238,metalness:.02,roughness:.9},
        {color:0x8798a7,metalness:.52,roughness:.62},
        {color:0xd5dfe8,metalness:.75,roughness:.3}
    ];
    const style=styles[level],clones=new Map();
    const excluded=new Set();
    for(const gear of [rig.weapon,rig.shield])gear?.traverse(o=>excluded.add(o));
    rig.unit.traverse(o=>{
        const m=o.material;
        if(excluded.has(o)||!m?.isMeshStandardMaterial||m.metalness<.45||m.color.b<m.color.r*.7)return;
        if(!clones.has(m)){
            const next=m.clone();next.color.setHex(style.color);next.metalness=style.metalness;next.roughness=style.roughness;
            clones.set(m,next);
        }
        o.material=clones.get(m);
    });
    if(level>=2){
        const material=new THREE.MeshStandardMaterial({...style,flatShading:true});
        for(const arm of [rig.armR,rig.armL]){
            const shell=new THREE.Mesh(new THREE.SphereGeometry(1,10,7),material);
            shell.name=level===3?'PlatePauldron':'ChainShoulder';
            shell.scale.set(level===3?.27:.23,level===3?.08:.045,.25);
            shell.position.set(Math.sign(arm.position.x)*.05,.08,.025);
            shell.castShadow=true;shell.receiveShadow=true;arm.add(shell);
        }
    }
    rig.armorLevel=level;
}

export function finalizeVisualRig(root,options={}){
    const rig=root.userData.r;
    rig.visualKind=options.kind||'v2';
    rig.handOffset=options.handOffset||[0,-.75,.105];
    if(options.weapon)rig.weapon=options.weapon;
    if(options.shield)rig.shield=options.shield;
    rig.capes=(options.capes||[]).filter(Boolean);
    rig.capeRest=.08;
    for(const cape of rig.capes){
        cape.position.z=rig.role==='orc'||rig.role==='troll'||rig.role==='elder'||rig.role==='replayOrc'?-.43:-.34;
        cape.rotation.x=rig.capeRest;
        for(const mesh of cape.children)if(mesh.isMesh)mesh.rotation.x=0;
    }
    if(rig.weapon)fitHeldWeapon(rig,rig.weapon);
    if(rig.shield)fitShield(rig,rig.shield);
    applyArmor(rig,options.armor);
    groundRig(rig);
    return root;
}

const supportCache=new WeakMap();
/** Aiming pose uses the actual string point, not two unrelated shoulder angles. */
export function fitBowSupport(rig,draw=0,alpha=1){
    if(!rig.aim||!rig.supportTarget||!rig.armL?.getWorldPosition)return;
    let cache=supportCache.get(rig);
    if(!cache){
        cache={target:new THREE.Vector3(),shoulder:new THREE.Vector3(),direction:new THREE.Vector3(),
            parent:new THREE.Quaternion(),rotation:new THREE.Quaternion(),base:new THREE.Vector3()};
        supportCache.set(rig,cache);
    }
    rig.supportTarget.position.z=.014-.12*draw;
    rig.supportTarget.getWorldPosition(cache.target);rig.armL.getWorldPosition(cache.shoulder);
    cache.direction.subVectors(cache.target,cache.shoulder).normalize();
    rig.armL.parent.getWorldQuaternion(cache.parent);cache.direction.applyQuaternion(cache.parent.invert());
    const palm=ensureHandGrip(rig,'left').position;
    cache.rotation.setFromUnitVectors(cache.base.copy(palm).normalize(),cache.direction);
    rig.armL.quaternion.copy(cache.rotation);
}

const weaponPoseCache=new WeakMap();
export function bindWeaponPose(rig){
    const weapon=rig.weapon,meta=weapon?.userData?.equipment;if(!meta)return;
    const upright=meta.axis==='upY'||(meta.axis==='forwardZ'&&!['sword','bow','shield'].includes(meta.kind));
    rig.uprightWeapon=upright;rig.weaponKind=meta.kind;
    const cache={weapon,base:new THREE.Quaternion().fromArray(meta.restQuaternion||weapon.quaternion.toArray()),
        delta:new THREE.Quaternion(),goal:new THREE.Quaternion(),axis:new THREE.Vector3(1,0,0),grip:new THREE.Vector3(...meta.grip),point:new THREE.Vector3()};
    weaponPoseCache.set(rig,cache);
    rig.fitWeapon=(strike,alpha)=>{
        const c=weaponPoseCache.get(rig);if(!c||c.weapon!==rig.weapon)return;
        c.delta.setFromAxisAngle(c.axis,upright?(meta.kind==='staff'?.7:2.7)*strike:0);
        c.goal.multiplyQuaternions(c.delta,c.base);weapon.quaternion.slerp(c.goal,alpha);
        c.point.copy(c.grip).multiply(weapon.scale).applyQuaternion(weapon.quaternion);
        weapon.position.copy(c.point).multiplyScalar(-1);
    };
}
