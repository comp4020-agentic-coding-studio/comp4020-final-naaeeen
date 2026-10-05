import { randomUUID } from "node:crypto";

export type Asset = "chair" | "table" | "lamp" | "plant";
export interface Furniture { id:string; asset:Asset; owner:string; x:number; z:number; yaw:number; revision:number; }
export interface Command { commandId:string; type:string; targetId:string; expectedRevision:number; payload:Record<string,unknown>; }
export class DomainError extends Error {
  code:string;
  constructor(code:string,message:string){ super(message); this.name="DomainError"; this.code=code; }
}
function fail(code:string,message:string):never{throw new DomainError(code,message);}
export const PALETTE=["#ffc47b","#f391a8","#a0d8b3","#99c8e6","#c7a3ec"] as const;
export const WINDOW_COLOURS=["amber","rose","mint","sky","violet"] as const;
export const FOOTPRINTS:Record<Asset,readonly[number,number]>={chair:[1,1],table:[1.6,1.6],lamp:[.8,.8],plant:[.8,.8]};
export const FIXED_FOOTPRINTS=[
 {id:"fixed-sofa",x:-2.72,z:-1.55,size:[.82,1.98]},
 {id:"fixed-shelf",x:2.46,z:-2.86,size:[1.55,.82]},
 {id:"fixed-left-wall",x:-3.35,z:0,size:[.32,7]},
 {id:"fixed-back-wall",x:0,z:-3.35,size:[7,.5]}
] as const;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function record(value:unknown):Record<string,unknown>{
 if(!value||typeof value!=="object"||Array.isArray(value))return fail("INVALID_INPUT","Use a valid command object.");
 return value as Record<string,unknown>;
}
function keys(value:Record<string,unknown>,allowed:readonly string[]){
 if(Object.keys(value).some(key=>!allowed.includes(key)))fail("INVALID_INPUT","That command contains an unsupported field.");
 if(allowed.some(key=>!(key in value)))fail("INVALID_INPUT","A required command field is missing.");
}
function text(value:unknown,max:number,required=false):string{
 if(typeof value!=="string")return fail("INVALID_INPUT","Use plain text.");
 const result=value.trim();
 if([...result].length>max||(required&&!result.length))fail("INVALID_INPUT",`Use ${required?"1–":""}${max} characters or fewer.`);
 if(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(result))fail("INVALID_INPUT","That text contains an unsupported control character.");
 return result;
}
export function validateProfile(value:unknown):{name:string;windowColour:string}{
 const p=record(value); keys(p,["name","windowColour"]);
 const name=text(p.name,24,true);
 if(/[\r\n\t]/.test(name))fail("INVALID_INPUT","Keep the name on one line.");
 if(typeof p.windowColour!=="string"||!(WINDOW_COLOURS as readonly string[]).includes(p.windowColour))fail("INVALID_INPUT","Choose a window colour from the palette.");
 return {name,windowColour:p.windowColour};
}
export function validateContribution(value:unknown):{colour:string;note:string}{
 const p=record(value); keys(p,["colour","note"]);
 if(typeof p.colour!=="string"||!(PALETTE as readonly string[]).includes(p.colour))fail("INVALID_INPUT","Choose a lamp colour from the palette.");
 return {colour:p.colour,note:text(p.note,140)};
}
export function parseCommand(value:unknown):Command{
 const c=record(value); keys(c,["commandId","type","targetId","expectedRevision","payload"]);
 if(typeof c.commandId!=="string"||!uuid.test(c.commandId)||typeof c.targetId!=="string"||!uuid.test(c.targetId))fail("INVALID_INPUT","Use valid command and item identifiers.");
 if(!Number.isSafeInteger(c.expectedRevision)||(c.expectedRevision as number)<0)fail("INVALID_INPUT","Use a current item version.");
 const p=record(c.payload);
 switch(c.type){
  case "window.configure":validateProfile(p);break;
  case "contribution.put":validateContribution(p);break;
  case "contribution.withdraw":keys(p,[]);break;
  case "placement.move":
   keys(p,["x","z"]);
   for(const v of [p.x,p.z])if(typeof v!=="number"||!Number.isFinite(v)||Math.abs(v)>3||!Number.isInteger(v*2))fail("INVALID_INPUT","Use half-grid positions inside the room.");
   break;
  case "placement.rotate":
   keys(p,["yaw"]); if(![0,90,180,270].includes(p.yaw as number))fail("INVALID_INPUT","Use a quarter turn.");break;
  default:fail("INVALID_INPUT","That action is not supported.");
 }
 return c as unknown as Command;
}
function stable(value:unknown):unknown{
 if(Array.isArray(value))return value.map(stable);
 if(value&&typeof value==="object")return Object.fromEntries(Object.keys(value).sort().map(key=>[key,stable((value as Record<string,unknown>)[key])]));
 return value;
}
export function canonicalCommand(value:unknown):string{return JSON.stringify(stable(parseCommand(value)));}
export function createFurniture(owner:string):Furniture[]{
 const seeds:{asset:Asset;x:number;z:number;yaw:number}[]=[
  {asset:"chair",x:-2,z:1,yaw:90},{asset:"chair",x:2,z:1,yaw:270},
  {asset:"table",x:0,z:0,yaw:0},{asset:"lamp",x:0,z:-2,yaw:0},
  {asset:"plant",x:-1.5,z:-2.5,yaw:0},{asset:"plant",x:1,z:-2.5,yaw:0}
 ];
 return seeds.map(item=>({...item,id:randomUUID(),owner,revision:0}));
}
function size(item:Furniture):readonly[number,number]{
 const [x,z]=FOOTPRINTS[item.asset];
 return item.yaw===90||item.yaw===270?[z,x]:[x,z];
}
function checkPlacement(item:Furniture,all:readonly Furniture[]){
 const [width,depth]=size(item);
 if(Math.abs(item.x)+width/2>3.5||Math.abs(item.z)+depth/2>3.5)fail("COLLISION","That piece would cross the room edge.");
 const overlap=(x:number,z:number,w:number,d:number)=>Math.abs(item.x-x)<(width+w)/2-1e-8&&Math.abs(item.z-z)<(depth+d)/2-1e-8;
 for(const other of all){if(other.id===item.id)continue;const [w,d]=size(other);if(overlap(other.x,other.z,w,d))fail("COLLISION","That space is occupied by another piece.");}
 for(const fixed of FIXED_FOOTPRINTS)if(overlap(fixed.x,fixed.z,fixed.size[0],fixed.size[1]))fail("COLLISION","That space is occupied by the fixed room structure.");
}
export function mutateFurniture(input:readonly Furniture[],value:unknown,owner:string):{furniture:Furniture[];entityRevision:number}{
 const command=parseCommand(value);
 if(!["placement.move","placement.rotate"].includes(command.type))fail("INVALID_INPUT","Choose a room editing action.");
 const original=input.find(item=>item.id===command.targetId);
 if(!original||original.owner!==owner)fail("FORBIDDEN","That piece is not available in your room.");
 if(original.revision!==command.expectedRevision)fail("REVISION_CONFLICT","This piece changed. Read its latest version before editing.");
 const furniture=input.map(item=>({...item}));
 const target=furniture.find(item=>item.id===command.targetId)!;
 if(command.type==="placement.move"){target.x=command.payload.x as number;target.z=command.payload.z as number;}
 else target.yaw=command.payload.yaw as number;
 checkPlacement(target,furniture);
 target.revision++;
 return {furniture,entityRevision:target.revision};
}
