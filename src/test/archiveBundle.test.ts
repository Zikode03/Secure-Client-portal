import {expect,it} from "vitest";
import {bundleArchiveFiles} from "../services/archiveBundle";
it("bundles files with UTF-8 folder paths into a ZIP with matching checksums",async()=>{
 const file=new File(["accounting record"],"réceipt.pdf");
 Object.defineProperty(file,"webkitRelativePath",{value:"2005/03/réceipt.pdf"});
 Object.defineProperty(file,"stream",{value:()=>new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new TextEncoder().encode("accounting record"));controller.close();}})});
 const [archive]=await bundleArchiveFiles([file as unknown as File],()=>{});
 const buffer=await new Promise<ArrayBuffer>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result as ArrayBuffer);reader.onerror=()=>reject(reader.error);reader.readAsArrayBuffer(archive);});
 const data=new Uint8Array(buffer);const view=new DataView(data.buffer);
 expect(view.getUint32(0,true)).toBe(0x04034b50);
 const length=view.getUint16(26,true);
 expect(new TextDecoder().decode(data.slice(30,30+length))).toBe("2005/03/réceipt.pdf");
 expect(new TextDecoder().decode(data.slice(30+length,30+length+view.getUint32(22,true)))).toBe("accounting record");
 expect(view.getUint32(data.length-22,true)).toBe(0x06054b50);
 expect(view.getUint16(data.length-14,true)).toBe(1);

});
