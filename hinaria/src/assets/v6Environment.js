/**
 * HINÁRIA V6 environment catalogue.
 * New stylized silhouettes drawn in a single vertex-colored mesh per type;
 * the existing chunk InstancedMesh renderer remains intact.
 * The helper receives the original composite builder to avoid a second
 * mesh/material pipeline and keep draw calls low.
 */
export function installV6Environment(THREE, catalogue, composite) {
    const box = (x,y,z) => new THREE.BoxGeometry(x,y,z);
    const cone = (r,h,n=7) => new THREE.ConeGeometry(r,h,n);
    const cyl = (rt,rb,h,n=8) => new THREE.CylinderGeometry(rt,rb,h,n);
    const ico = (r,detail=0) => new THREE.IcosahedronGeometry(r,detail);
    const part = (g,c,x=0,y=0,z=0,rot) => [g,c,[x,y,z],rot];
    const set = (type, parts) => {
        const prior = catalogue[type];
        catalogue[type] = composite(parts);
        prior?.dispose?.();
    };
    const bark = 0x65503c, barkLight=0x947452, needles=0x315b4d;
    // V7.5: broad, layered crowns rather than tall narrow cones.
    // All variants still use the original instancing and collision type names.
    set('pine', [
        part(cyl(.19,.28,1.12,8),bark,0,.59,0),
        part(cone(.84,.99,8),0x284f43,0,1.00,0),
        part(ico(.69,0),0x356c55,0,1.35,0),
        part(cone(.68,.83,8),0x37745c,0,1.76,0),
        part(ico(.56,0),0x4a8869,0,1.93,0),
        part(cone(.45,.76,8),0x649774,0,2.31,0),
        part(ico(.22,0),0x82aa82,0,2.58,0)
    ]);
    set('oak', [
        part(cyl(.25,.34,1.48,9),bark,0,.76,0),
        part(cyl(.13,.20,.82,6),barkLight,.28,1.37,0,[0,0,-.62]),
        part(cyl(.13,.18,.81,6),barkLight,-.28,1.33,.05,[0,0,.63]),
        part(ico(.76,1),0x376b45,0,1.73,-.06),
        part(ico(.66,1),0x548854,.48,1.85,.12),
        part(ico(.63,1),0x3c7949,-.49,1.86,-.08),
        part(ico(.51,1),0x609761,0,2.18,.37),
        part(ico(.55,1),0x76a76b,0,2.32,-.22),
        part(ico(.40,0),0x92b478,.24,2.37,.1)
    ]);
    set('dead', [
        part(cyl(.055,.24,2.23,7),0x716353,0,1.13,0),
        part(cone(.22,.55,6),0x897460,0,2.41,0),
        part(cyl(.04,.09,1.14,6),0x716353,.4,1.71,0,[0,0,-.77]),
        part(cyl(.04,.10,1.03,6),0x897460,-.43,1.74,-.08,[0,0,.74]),
        part(cyl(.03,.07,.72,5),0x64564a,.18,2.0,.31,[.65,0,-.3])
    ]);
    set('bush', [
        part(ico(.39,1),0x396d45,-.25,.36,0),part(ico(.37,1),0x548950,.22,.34,.08),
        part(ico(.31,1),0x69a36b,0,.52,-.11),part(ico(.08),0xe7c06d,-.25,.55,.25)
    ]);
    set('rock', [part(ico(.42,0),0x838c8d,0,.32,0),part(ico(.34,0),0x626e74,.36,.2,.12),part(ico(.23),0xa2a6a0,-.2,.27,.27)]);
    set('srock',[part(ico(.2,0),0x858d88,0,.13,0),part(ico(.1,0),0x666d69,.18,.085,.04)]);
    set('cliff',[part(ico(.8,0),0x66706f,0,.63,0),part(ico(.63,0),0x84908d,.46,.46,.12),part(ico(.47,0),0x9da5a2,-.32,.81,-.24)]);
    set('fence',[
        part(box(.16,.95,.16),0x5d4032,-.47,.48,0),part(box(.16,.95,.16),0x5d4032,.47,.48,0),
        part(cone(.135,.24,4),0x826044,-.47,1.06,0,[0,.785,0]),part(cone(.135,.24,4),0x826044,.47,1.06,0,[0,.785,0]),
        part(box(1,.13,.1),0xa0784e,0,.69,0),part(box(1,.13,.1),0xa0784e,0,.29,0),
        part(box(.09,.09,.14),0x43372c,0,.69,0)
    ]);
    set('barrel',[
        part(cyl(.26,.24,.63,10),0x8f643c,0,.33,0),
        part(cyl(.29,.29,.09,10),0x484c4d,0,.17,0),
        part(cyl(.29,.29,.09,10),0x484c4d,0,.51,0),
        part(cyl(.24,.24,.045,10),0xad8457,0,.65,0),
        part(box(.025,.45,.03),0x6a472e,.21,.33,.12)
    ]);
    set('crate',[
        part(box(.68,.64,.68),0x9c7045,0,.32,0),part(box(.72,.07,.72),0x65472f,0,.63,0),
        part(box(.72,.08,.72),0x65472f,0,.04,0),
        part(box(.095,.56,.045),0x5b4030,-.24,.32,.36),part(box(.095,.56,.045),0x5b4030,.24,.32,.36),
        part(box(.73,.07,.055),0xc19a65,0,.32,.37,[0,0,-.65])
    ]);
    set('lamp',[
        part(cyl(.05,.085,1.7,8),0x4b3d34,0,.85,0),
        part(cyl(.21,.14,.35,6),0xb88b3b,0,1.75,0),
        part(ico(.19,1),0xffda83,0,1.78,0),
        part(cone(.36,.28,6),0x514239,0,2.1,0),
        part(ico(.07),0xe7b35a,0,2.29,0)
    ]);
    // V7 village lantern: stone foot, sculpted timber/bronze post, bright glass
    // and a protective six-sided hood. The old torches are not used in town.
    set('lantern',[
        part(cyl(.16,.21,.21,8),0x8f8980,0,.12,0),
        part(cyl(.11,.14,1.55,8),0x654b36,0,.92,0),
        part(cyl(.22,.17,.12,8),0xb89a5c,0,1.74,0),
        part(cyl(.22,.22,.47,6),0xf9da96,0,1.99,0),
        part(cyl(.29,.24,.13,6),0x3b3936,0,2.27,0),
        part(cone(.38,.33,6),0x5e4237,0,2.48,0),
        part(ico(.065),0xf9d87e,0,2.67,0),
        ...[0,1,2,3,4,5].map(i=>part(box(.055,.48,.06),0x735b40,
            Math.cos(i*Math.PI/3)*.23,1.99,Math.sin(i*Math.PI/3)*.23,[0,-i*Math.PI/3,0]))
    ]);
    // Low, nonblocking planter prevents decoration from looking like map clutter.
    // V7.7: hand-painted-looking block colours (NO noise texture on props).
    // Low pots, a little visible soil and distinct leaves/flowers; not the
    // black-streaked balls which used to be in front of the market.
    set('flowerbed',[
        part(cyl(.43,.51,.31,9),0xb68c64,0,.16,0),
        part(cyl(.40,.41,.06,9),0xd9b48a,0,.31,0),
        part(cyl(.35,.35,.042,9),0x584933,0,.33,0),
        part(ico(.21,0),0x498253,-.17,.44,-.08),
        part(ico(.24,0),0x62a366,.16,.45,.05),
        part(ico(.14,0),0x438050,0,.56,-.14),
        ...[[-.17,.48,.13,0xf4c77a],[.16,.54,.17,0xe68b9b],[.04,.60,-.16,0xa8a5f3]]
            .map(([x,y,z,c])=>part(ico(.075,0),c,x,y,z))
    ]);
    set('basket',[
        // Woven goods basket, stylized solid straw rims instead of dark noise.
        part(cyl(.32,.26,.34,9),0xb89158,0,.19,0),
        part(cyl(.36,.36,.065,9),0xe3be7f,0,.37,0),
        part(cyl(.29,.29,.04,9),0x80623d,0,.402,0),
        ...[0,1,2,3,4,5,6,7].map(i=>{
            const a=i*Math.PI/4;
            return part(box(.075,.28,.075),i%2?0x9a7548:0xd2aa70,
                Math.cos(a)*.28,.22,Math.sin(a)*.28,[0,-a,0]);
        }),
        part(ico(.17,0),0x9fbd65,-.10,.51,0),
        part(ico(.16,0),0xd5ad56,.12,.52,.06),
        part(ico(.14,0),0x688e4e,.03,.54,-.12)
    ]);
    set('sack',[
        part(cyl(.23,.28,.42,7),0xcab18b,-.12,.23,.02),
        part(cone(.23,.19,7),0xab906a,-.12,.50,.02),
        part(box(.31,.065,.31),0x8d6b43,-.12,.40,.02),
        part(cyl(.18,.21,.34,7),0xbca07c,.24,.20,-.05),
        part(cone(.16,.16,7),0xdcc49a,.24,.45,-.05)
    ]);
    set('planter',[
        part(box(.85,.26,.49),0x987049,0,.15,0),
        part(box(.91,.08,.55),0xcba779,0,.28,0),
        part(box(.74,.05,.35),0x57492f,0,.335,0),
        ...[-.24,0,.24].flatMap((x,i)=>[
            part(cyl(.035,.045,.29,5),0x49774b,x,.47,0),
            part(ico(.15,0),i===1?0x76a967:0x4d8751,x,.57,0),
            part(ico(.064,0),i===1?0xf2bd83:0xe28da0,x,.7,.06)
        ])
    ]);
    set('well',[
        // Stone ring with raised rim and timber roof on substantial legs.
        part(cyl(.72,.83,.62,10),0x8e948c,0,.32,0),
        part(cyl(.60,.60,.085,10),0xb9bcb1,0,.66,0),
        part(cyl(.47,.47,.038,10),0x406e78,0,.70,0),
        ...[[-.68,0],[.68,0]].map(([x,z])=>part(box(.15,1.65,.16),0x77543b,x,1.39,z)),
        part(box(1.52,.16,.2),0x8c6844,0,2.18,0),
        part(box(1.67,.18,1.28),0x765b49,0,2.37,0),
        part(box(.13,.16,1.4),0xb38a5b,0,2.47,0),
        part(cyl(.13,.13,.45,8),0xba9666,0,1.93,0),
        part(cyl(.07,.07,.58,8),0x65513b,0,1.48,0)
    ]);
    set('stall',[
        // Hefty tabletop + apron and four structural legs.
        part(box(2.06,.23,1.17),0x775236,0,.68,0),
        part(box(2.24,.13,1.27),0xb58955,0,.88,0),
        ...[-.88,.88].flatMap(x=>[-.42,.42].map(z=>
            part(box(.14,1.92,.14),0x6b4e35,x,1.02,z))),
        // Warm striped canvas roof with dimensional edge/fringe.
        part(box(2.39,.19,1.49),0xc9ab76,0,2.12,0),
        ...[-.77,-.26,.26,.77].map((x,i)=>
            part(box(.34,.035,1.49),i%2?0x71856b:0xe9c995,x,2.236,0)),
        part(box(2.5,.13,.12),0x705137,0,2.1,.73),
        part(box(2.5,.13,.12),0x705137,0,2.1,-.73),
        part(box(.14,.25,1.54),0x735238,-1.18,2.0,0),
        part(box(.14,.25,1.54),0x735238,1.18,2.0,0),
        // Small, readable produce rather than black speckled cylinders.
        part(box(.82,.17,.5),0x9e7041,-.53,1.00,.02),
        part(box(.82,.17,.5),0x9e7041,.53,1.00,.02),
        ...[-.68,-.43,-.18].map((x,i)=>part(ico(.13,0),i===1?0xe6ae52:0x8aa85a,x,1.20,.02)),
        ...[.24,.5,.75].map((x,i)=>part(ico(.12,0),i===1?0xc86951:0xe5bd66,x,1.20,.02)),
    ]);
    set('tent',[
        part(cone(1.09,1.8,6),0x9f7868,0,.95,0),
        part(cone(.27,.48,6),0xc7a58b,0,2.01,0),
        part(box(.41,.9,.1),0x4b3834,0,.45,.84),
        part(cyl(.07,.08,2.02,6),0x6e5446,0,1.03,0)
    ]);
    set('wall',[
        part(box(1,1.17,.45),0x828c89,0,.59,0),
        part(box(1.08,.18,.53),0xaab0a4,0,1.25,0),
        part(box(.12,.5,.48),0x647371,-.30,.35,0),
        part(box(.34,.17,.48),0x6a7875,.19,.69,0)
    ]);
    set('pillar',[
        part(cyl(.24,.29,1.9,8),0x9da6a4,0,1,0),part(box(.75,.19,.75),0xb1b9ad,0,.13,0),
        part(box(.67,.16,.67),0xaab4ac,0,2.0,0),part(cone(.25,.5,6),0x728480,0,2.34,0)
    ]);
    set('sign',[
        part(cyl(.065,.08,1.55,6),0x76543a,0,.78,0),
        part(box(.96,.55,.105),0xb99865,0,1.41,0),
        part(box(1.08,.07,.13),0x5e4536,0,1.7,0),part(box(.1,.41,.14),0x785a41,-.4,1.4,0)
    ]);
    set('log',[
        part(cyl(.21,.21,1.4,9),0x886343,0,.24,0,[0,0,Math.PI/2]),
        part(cyl(.22,.22,.04,9),0xc4a37d,-.71,.24,0,[0,0,Math.PI/2])
    ]);
    set('altar',[
        part(box(1.12,.58,.85),0x818b92,0,.34,0),
        part(box(1.35,.17,1.0),0xb3b7b2,0,.67,0),
        part(ico(.2,0),0x73bfd0,0,.97,0),part(box(.12,.28,.12),0x687078,0,.93,0)
    ]);
    set('torch',[
        part(cyl(.048,.068,1.14,6),0x6a4b36,0,.58,0),
        part(cone(.15,.25,7),0x614333,0,1.21,0)
    ]);
    set('fire',[
        part(cyl(.08,.09,.94,7),0x76533b,0,.12,0,[0,0,Math.PI/2]),
        part(cyl(.08,.09,.94,7),0x76533b,0,.12,0,[Math.PI/2,0,0]),
        ...[0,1,2,3,4,5].map(i=>part(ico(.16),0x7c827d,Math.cos(i*Math.PI/3)*.4,.14,Math.sin(i*Math.PI/3)*.4))
    ]);
    // Keep luminous helper meshes torchf/firef/lamph unchanged for gameplay pulses.
    return catalogue;
}
