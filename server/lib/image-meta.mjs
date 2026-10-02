// Removes metadata (EXIF incl. GPS location, XMP, text chunks) from uploaded images before they are stored.
// Pixel data is untouched. Works on JPEG, PNG and WebP; anything unexpected is returned unchanged.
export function stripMetadata(buf,mime){
  try{
    if(mime==='image/jpeg')return stripJpeg(buf);
    if(mime==='image/png')return stripPng(buf);
    if(mime==='image/webp')return stripWebp(buf);
  }catch{}
  return buf;
}
function stripJpeg(b){
  if(b[0]!==0xFF||b[1]!==0xD8)return b;
  const parts=[b.subarray(0,2)];let i=2;
  while(i+4<=b.length){
    if(b[i]!==0xFF)return b;
    const marker=b[i+1];
    if(marker===0xDA){parts.push(b.subarray(i));return Buffer.concat(parts);} // start of scan: rest is image data
    const len=b.readUInt16BE(i+2),end=i+2+len;if(end>b.length)return b;
    // Drop APP1 (EXIF/XMP), APP2–APP15 except APP2 ICC profile, and COM comments; keep APP0 (JFIF) and ICC colours.
    const isIcc=marker===0xE2&&b.subarray(i+4,i+15).toString('latin1').startsWith('ICC_PROFILE');
    const drop=(marker>=0xE1&&marker<=0xEF&&!isIcc)||marker===0xFE;
    if(!drop)parts.push(b.subarray(i,end));
    i=end;
  }
  return b;
}
function stripPng(b){
  const sig=b.subarray(0,8);if(sig.toString('hex')!=='89504e470d0a1a0a')return b;
  const parts=[sig];let i=8;
  while(i+12<=b.length){
    const len=b.readUInt32BE(i),type=b.subarray(i+4,i+8).toString('latin1'),end=i+12+len;if(end>b.length)return b;
    if(!['eXIf','tEXt','iTXt','zTXt','tIME'].includes(type))parts.push(b.subarray(i,end));
    i=end;if(type==='IEND')break;
  }
  return Buffer.concat(parts);
}
function stripWebp(b){
  if(b.subarray(0,4).toString()!=='RIFF'||b.subarray(8,12).toString()!=='WEBP')return b;
  const chunks=[];let i=12;
  while(i+8<=b.length){
    const type=b.subarray(i,i+4).toString('latin1'),len=b.readUInt32LE(i+4),end=i+8+len+(len&1);if(i+8+len>b.length)return b;
    if(type!=='EXIF'&&type!=='XMP ')chunks.push(Buffer.from(b.subarray(i,Math.min(end,b.length))));
    i=end;
  }
  for(const c of chunks)if(c.subarray(0,4).toString()==='VP8X')c[8]&=~0x0C; // clear EXIF (0x08) and XMP (0x04) flags
  const body=Buffer.concat(chunks),head=Buffer.alloc(12);
  head.write('RIFF',0,'latin1');head.writeUInt32LE(body.length+4,4);head.write('WEBP',8,'latin1');
  return Buffer.concat([head,body]);
}
