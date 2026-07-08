const BLOCK_STATES = [
  'minecraft:stone',
  'minecraft:cobblestone',
  'minecraft:smooth_stone',
  'minecraft:stone_bricks',
  'minecraft:mossy_stone_bricks',
  'minecraft:deepslate',
  'minecraft:cobbled_deepslate',
  'minecraft:blackstone',
  'minecraft:basalt[axis=y]',
  'minecraft:tuff',
  'minecraft:dirt',
  'minecraft:grass_block[snowy=false]',
  'minecraft:podzol[snowy=false]',
  'minecraft:mycelium[snowy=false]',
  'minecraft:sand',
  'minecraft:red_sand',
  'minecraft:gravel',
  'minecraft:clay',
  'minecraft:snow_block',
  'minecraft:ice',
  'minecraft:oak_planks',
  'minecraft:spruce_planks',
  'minecraft:birch_planks',
  'minecraft:jungle_planks',
  'minecraft:acacia_planks',
  'minecraft:dark_oak_planks',
  'minecraft:mangrove_planks',
  'minecraft:cherry_planks',
  'minecraft:bamboo_planks',
  'minecraft:crimson_planks',
  'minecraft:oak_log[axis=y]',
  'minecraft:spruce_log[axis=y]',
  'minecraft:birch_log[axis=y]',
  'minecraft:jungle_log[axis=y]',
  'minecraft:acacia_log[axis=y]',
  'minecraft:dark_oak_log[axis=y]',
  'minecraft:mangrove_log[axis=y]',
  'minecraft:cherry_log[axis=y]',
  'minecraft:bamboo_block[axis=y]',
  'minecraft:stripped_oak_log[axis=y]',
  'minecraft:bricks',
  'minecraft:mud_bricks',
  'minecraft:prismarine',
  'minecraft:dark_prismarine',
  'minecraft:sea_lantern',
  'minecraft:quartz_block',
  'minecraft:purpur_block',
  'minecraft:end_stone',
  'minecraft:end_stone_bricks',
  'minecraft:nether_bricks',
  'minecraft:netherrack',
  'minecraft:soul_sand',
  'minecraft:soul_soil',
  'minecraft:glowstone',
  'minecraft:obsidian',
  'minecraft:crying_obsidian',
  'minecraft:magma_block',
  'minecraft:warped_nylium',
  'minecraft:crimson_nylium',
  'minecraft:shroomlight',
  'minecraft:coal_ore',
  'minecraft:iron_ore',
  'minecraft:copper_ore',
  'minecraft:gold_ore',
  'minecraft:redstone_ore',
  'minecraft:lapis_ore',
  'minecraft:diamond_ore',
  'minecraft:emerald_ore',
  'minecraft:amethyst_block',
  'minecraft:ancient_debris',
  'minecraft:coal_block',
  'minecraft:iron_block',
  'minecraft:copper_block',
  'minecraft:gold_block',
  'minecraft:redstone_block',
  'minecraft:lapis_block',
  'minecraft:diamond_block',
  'minecraft:emerald_block',
  'minecraft:netherite_block',
  'minecraft:honeycomb_block',
  'minecraft:white_wool',
  'minecraft:orange_wool',
  'minecraft:magenta_wool',
  'minecraft:light_blue_wool',
  'minecraft:yellow_wool',
  'minecraft:lime_wool',
  'minecraft:pink_wool',
  'minecraft:gray_wool',
  'minecraft:cyan_wool',
  'minecraft:purple_wool',
  'minecraft:blue_wool',
  'minecraft:brown_wool',
  'minecraft:green_wool',
  'minecraft:red_wool',
  'minecraft:black_wool'
];

function encodeVarInt(value) {
  const bytes = [];
  let v = value >>> 0;
  while (true) {
    if ((v & ~0x7F) === 0) { bytes.push(v); break; }
    bytes.push((v & 0x7F) | 0x80);
    v >>>= 7;
  }
  return bytes;
}

async function makeDownloadBlob(bytes) {
  if ('CompressionStream' in window) {
    const stream = new Blob([bytes]).stream().pipeThrough(new CompressionStream('gzip'));
    return await new Response(stream).blob();
  }
  return new Blob([bytes], {type:'application/octet-stream'});
}

document.getElementById('dlSchemBtn').addEventListener('click', async () => {
  const rx = getR(), ry = getHR();
  const filled_ = shape === 'filled';
  const quarter = document.getElementById('quarterMode').checked;

  const positions = [];
  if(viewMode === '3d') {
    computeFullVolumeBlocks().forEach((blockIdx, k) => {
      const [bx,by,bz] = k.split(',').map(Number);
      if(quarter && (bx<0||bz<0)) return;
      positions.push({x:bx, y:by, z:bz, blockIdx});
    });
  } else {
    const genBlocks_ = genCircle(rx, ry, filled_);
    const allKeys = new Set();
    genBlocks_.forEach(([x,y]) => { const k=x+','+y; if(!customErased.has(k)) allKeys.add(k); });
    customBlocks.forEach((_,k) => allKeys.add(k));
    allKeys.forEach(k => {
      const [bx,by] = k.split(',').map(Number);
      if(quarter && (bx<0||by<0)) return;
      positions.push({x:bx, y:0, z:by, blockIdx: customBlocks.has(k)?customBlocks.get(k):circleBlock});
    });
  }
  if(!positions.length){ alert('No blocks to export!'); return; }

  let minX=Infinity,minY=Infinity,minZ=Infinity,maxX=-Infinity,maxY=-Infinity,maxZ=-Infinity;
  positions.forEach(({x,y,z})=>{
    if(x<minX)minX=x; if(x>maxX)maxX=x;
    if(y<minY)minY=y; if(y>maxY)maxY=y;
    if(z<minZ)minZ=z; if(z>maxZ)maxZ=z;
  });
  const W = maxX-minX+1, H = maxY-minY+1, L = maxZ-minZ+1;

  const palette = new Map();
  palette.set('minecraft:air', 0);
  positions.forEach(({blockIdx}) => {
    const state = BLOCK_STATES[blockIdx] || 'minecraft:stone';
    if(!palette.has(state)) palette.set(state, palette.size);
  });

  const paletteIds = new Uint32Array(W*H*L);
  positions.forEach(({x,y,z,blockIdx}) => {
    const lx=x-minX, ly=y-minY, lz=z-minZ;
    const idx = ly*W*L + lz*W + lx;
    paletteIds[idx] = palette.get(BLOCK_STATES[blockIdx] || 'minecraft:stone');
  });

  const blockDataBytes = [];
  paletteIds.forEach(id => blockDataBytes.push(...encodeVarInt(id)));
  const blockData = new Uint8Array(blockDataBytes);

  const parts = [];
  const te = new TextEncoder();
  const TAG_END=0,TAG_BYTE=1,TAG_SHORT=2,TAG_INT=3,TAG_BYTE_ARRAY=7,TAG_STRING=8,TAG_LIST=9,TAG_COMPOUND=10,TAG_INT_ARRAY=11;

  function pushByte(v){ parts.push(new Uint8Array([v&0xff])); }
  function pushShort(v){ parts.push(new Uint8Array([(v>>8)&0xff,v&0xff])); }
  function pushInt(v){ parts.push(new Uint8Array([(v>>>24)&0xff,(v>>>16)&0xff,(v>>>8)&0xff,v&0xff])); }
  function pushStrRaw(s){ const b=te.encode(s); pushShort(b.length); parts.push(b); }
  function tagHeader(type,name){ pushByte(type); pushStrRaw(name); }
  function tagShort(name,val){ tagHeader(TAG_SHORT,name); pushShort(val); }
  function tagInt(name,val){ tagHeader(TAG_INT,name); pushInt(val); }
  function tagString(name,val){ tagHeader(TAG_STRING,name); pushStrRaw(val); }
  function tagByteArray(name,arr){ tagHeader(TAG_BYTE_ARRAY,name); pushInt(arr.length); parts.push(arr); }
  function tagIntArray(name,arr){ tagHeader(TAG_INT_ARRAY,name); pushInt(arr.length); arr.forEach(pushInt); }
  function beginCompound(name){ tagHeader(TAG_COMPOUND,name); }
  function endCompound(){ pushByte(TAG_END); }
  function emptyCompoundList(name){ tagHeader(TAG_LIST,name); pushByte(TAG_COMPOUND); pushInt(0); }

  pushByte(TAG_COMPOUND);
  pushShort(0);

  tagInt('Version', 2);
  tagInt('DataVersion', 3953);
  tagShort('Width', W);
  tagShort('Height', H);
  tagShort('Length', L);
  tagIntArray('Offset', [minX, viewMode==='3d' ? minY : 64, minZ]);

  beginCompound('Palette');
  palette.forEach((id, state) => tagInt(state, id));
  endCompound();

  tagInt('PaletteMax', palette.size);
  tagByteArray('BlockData', blockData);
  emptyCompoundList('BlockEntities');
  emptyCompoundList('Entities');

  beginCompound('Metadata');
  tagString('Name', 'Minecraft Circle Generator');
  tagString('Author', 'Godlike-style Circle Generator');
  endCompound();

  endCompound();

  const total = parts.reduce((s,p)=>s+p.length,0);
  const out = new Uint8Array(total); let off=0;
  parts.forEach(p=>{ out.set(p,off); off+=p.length; });

  const blob = await makeDownloadBlob(out);
  const url = URL.createObjectURL(blob);
  const shape_=viewMode==='3d'?shape3d:shape, r_=viewMode==='3d'?rx+(shape3d==='cylinder'?'xh'+cylHeight:''):rx+(shape==='ellipse'?'x'+ry:'');
  const a=document.createElement('a');
  a.download=`mcircle_${shape_}_r${r_}.schem`;
  a.href=url; a.click();
  URL.revokeObjectURL(url);
});
