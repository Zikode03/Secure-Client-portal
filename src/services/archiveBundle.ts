// Store-only ZIP containers keep folder uploads local and avoid one HTTP request per file.
const crcTable = Array.from({length:256},(_,value)=>{let crc=value;for(let bit=0;bit<8;bit++)crc=(crc&1)?0xedb88320^(crc>>>1):crc>>>1;return crc>>>0;});
async function crc32(file: File) {
 let crc=0xffffffff;
 const reader=file.stream().getReader();
 try {for(;;){const {done,value}=await reader.read();if(done)break;for(const byte of value)crc=crcTable[(crc^byte)&255]^(crc>>>8);}}
 finally {reader.releaseLock();}
 return (crc^0xffffffff)>>>0;
}
function header(size:number){const bytes=new Uint8Array(size);return {bytes,view:new DataView(bytes.buffer)};}
export async function bundleArchiveFiles(files: File[],progress:(label:string)=>void):Promise<File[]> {
 const groups:File[][]=[];let current:File[]=[];let size=0;
 for(const file of files){if(size+file.size+4096>240*1024*1024&&current.length){groups.push(current);current=[];size=0;}current.push(file);size+=file.size+4096;}
 if(current.length)groups.push(current);
 const archives:File[]=[];let completed=0;
 for(const [index,group] of groups.entries()){
  const parts:BlobPart[]=[];const central:BlobPart[]=[];let offset=0;let centralSize=0;
  for(const file of group){
   progress(`Preparing ${++completed} of ${files.length}: ${file.name}`);
   const name=new TextEncoder().encode(file.webkitRelativePath||file.name);
   if(name.length>65535)throw new Error("A folder path is too long. Shorten it and try again.");
   const crc=await crc32(file);
   const local=header(30);local.view.setUint32(0,0x04034b50,true);local.view.setUint16(4,20,true);local.view.setUint16(6,0x800,true);local.view.setUint32(14,crc,true);local.view.setUint32(18,file.size,true);local.view.setUint32(22,file.size,true);local.view.setUint16(26,name.length,true);
   parts.push(local.bytes,name,file);
   const directory=header(46);directory.view.setUint32(0,0x02014b50,true);directory.view.setUint16(4,20,true);directory.view.setUint16(6,20,true);directory.view.setUint16(8,0x800,true);directory.view.setUint32(16,crc,true);directory.view.setUint32(20,file.size,true);directory.view.setUint32(24,file.size,true);directory.view.setUint16(28,name.length,true);directory.view.setUint32(42,offset,true);
   central.push(directory.bytes,name);centralSize+=46+name.length;offset+=30+name.length+file.size;
  }
  const end=header(22);end.view.setUint32(0,0x06054b50,true);end.view.setUint16(8,group.length,true);end.view.setUint16(10,group.length,true);end.view.setUint32(12,centralSize,true);end.view.setUint32(16,offset,true);
  archives.push(new File([...parts,...central,end.bytes],`folder-import-${index+1}.zip`,{type:"application/zip"}));
 }
 return archives;
}
