/** P7 resource observation helpers. No service startup or workload side effects. */
import { createHash } from "node:crypto";
import { statSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { decodeBoardReceipt, validateBoardReceiptStorage } from "../src/board-receipt-codec.ts";
import { validPuzzleTable } from "../public/house-puzzle-rules.js";
const digest = value => createHash("sha256").update(typeof value === "string" ? value : JSON.stringify(value)).digest("hex");
const hex = value => typeof value === "string" && /^[a-f0-9]{64}$/.test(value);
const uuid = value => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const integer = n => Number.isSafeInteger(n) && n >= 0;
const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
const error = code => { throw Object.assign(new Error(code), { code }); };
const percentile = (values,p) => values.length ? [...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1] : null;
/** A protocol must bind every declared canonical relative source identity exactly. */
export function validateSourceBindings(protocol, allowPending=false) {
    const files=protocol?.sourceFiles;
    const validFile=file=>typeof file==="string"&&file.length>0&&!file.startsWith("/")&&!/[\\:\x00-\x1f]/.test(file)&&file.split("/").every(part=>part!==""&&part!=="."&&part!=="..");
    if(!Array.isArray(files)||files.length===0||!files.every(validFile)||new Set(files).size!==files.length)error("SOURCE_FILES_INVALID");
    if(!hex(protocol.instrumentSHA256))error("SOURCE_BINDING_INVALID");
    const bindings=protocol.sourceHashes;
    if(bindings===null&&protocol.sourceManifestSHA256===null) {
        if(allowPending&&protocol.sourceBinding?.status==="PENDING_PARENT_RUNTIME_FREEZE")return false;
        error("SOURCE_BINDING_REQUIRED");
    }
    if(!bindings||typeof bindings!=="object"||Array.isArray(bindings)||Object.getPrototypeOf(bindings)!==Object.prototype||!hex(protocol.sourceManifestSHA256)||!same(Object.keys(bindings).sort(),[...files].sort())||!Object.values(bindings).every(hex))error("SOURCE_BINDING_INVALID");
    return true;
}
/** Only a successful subscription may establish a new immutable connection tuple. */
export function capturePictureAuthority(snapshot) {
    if(!uuid(snapshot?.serverEpoch)||snapshot.controller!==true||!integer(snapshot.generation)||snapshot.generation===0||!integer(snapshot.accessGeneration))error("PICTURE_ADMISSION_AUTHORITY");
    return Object.freeze({serverEpoch:snapshot.serverEpoch,generation:snapshot.generation,accessGeneration:snapshot.accessGeneration,controller:true});
}
export function pictureAuthorityEvidence(authority) {
    return {serverEpochHash:digest(authority.serverEpoch),generation:authority.generation,accessGeneration:authority.accessGeneration,controller:authority.controller};
}
export const responseDigest = receipt => digest(JSON.stringify(receipt));
export function newBoardACKLedger() { return { entries: new Map(), acknowledgements: 0, conflicts: 0, maximumEntries: 10000 }; }
export function recordBoardACK(ledger, actorId, kind, request, receipt) {
    if (!uuid(actorId) || !["patch","asset","chat"].includes(kind) || !receipt?.ok || receipt.id !== request.id || receipt.houseId !== request.houseId) error("BOARD_ACK_SCOPE");
    const key = actorId + ":" + receipt.id, hash = responseDigest(receipt), prior = ledger.entries.get(key);
    ledger.acknowledgements++;
    if (prior) {
        if (prior.digest !== hash || prior.houseId !== request.houseId || prior.kind !== kind) { ledger.conflicts++; error("BOARD_ACK_CHANGED_FOR_COMMAND"); }
        return false;
    }
    if (ledger.entries.size >= ledger.maximumEntries) error("BOARD_ACK_LEDGER_BOUND");
    ledger.entries.set(key,{ actorId, id:receipt.id, houseId:request.houseId, kind, digest:hash });
    return true;
}
export function receiptStorage(db) {
    const encoding = db.prepare("PRAGMA encoding").get().encoding;
    if (!["UTF-8","UTF-16le","UTF-16be"].includes(encoding)) error("RECEIPT_ENCODING");
    const total = db.prepare("SELECT count(*) AS count,coalesce(sum(octet_length(response)),0) AS storedBytes FROM receipts").get();
    const storageTypes = db.prepare("SELECT typeof(response) AS type,count(*) AS count,coalesce(sum(octet_length(response)),0) AS storedBytes FROM receipts GROUP BY typeof(response)").all();
    return { ...total, encoding, storageTypes };
}
export function databaseFiles(dataDir) {
    const files=[];
    for (const base of ["neighbourhood.sqlite","house.sqlite","board.sqlite"]) for (const suffix of ["","-wal","-shm"]) {
        const name=base+suffix;
        try { const s=statSync(dataDir+"/"+name); files.push({name,exists:true,logicalBytes:s.size,allocatedBytes:s.blocks*512}); }
        catch(e) { if(e.code!=="ENOENT")throw e; files.push({name,exists:false,logicalBytes:0,allocatedBytes:0}); }
    }
    return files;
}
export function verifyReceiptBatch(db, encoding, entries, seen = new Set()) {
    if (!Array.isArray(entries) || entries.length > 64) error("RECEIPT_BATCH_BOUND");
    const result={compared:entries.length,verified:0,missing:0,metadataInvalid:0,decodeErrors:0,digestMismatches:0,duplicates:0};
    const meta=db.prepare("SELECT typeof(response) AS type,octet_length(response) AS bytes FROM receipts WHERE actor_id=? AND id=?");
    const bytes=db.prepare("SELECT CAST(response AS BLOB) AS response FROM receipts WHERE actor_id=? AND id=?");
    for(const entry of entries) {
        const key=entry.actorId+":"+entry.id;
        if(seen.has(key)){result.duplicates++;continue;} seen.add(key);
        const row=meta.get(entry.actorId,entry.id);
        if(!row){result.missing++;continue;}
        try {validateBoardReceiptStorage(row.type,row.bytes,encoding);} catch {result.metadataInvalid++;continue;}
        let decoded;
        try {decoded=decodeBoardReceipt(bytes.get(entry.actorId,entry.id).response,row.type,encoding,{id:entry.id,houseId:entry.houseId,kind:entry.kind});}
        catch {result.decodeErrors++;continue;}
        if(!hex(entry.digest)||responseDigest(decoded)!==entry.digest){result.digestMismatches++;continue;}
        result.verified++;
    }
    return result;
}
export function verifyClosedBoardLedger(path, ledger) {
    const db=new DatabaseSync(path,{readOnly:true});
    try {
        const stored=receiptStorage(db),seen=new Set(), entries=[...ledger.entries.values()];
        const totals={compared:0,verified:0,missing:0,metadataInvalid:0,decodeErrors:0,digestMismatches:0,duplicates:0};
        for(let offset=0;offset<entries.length;offset+=64) {
            const batch=verifyReceiptBatch(db,stored.encoding,entries.slice(offset,offset+64),seen);
            for(const key of Object.keys(totals))totals[key]+=batch[key];
        }
        return {...totals,uniqueLedgerEntries:ledger.entries.size,acknowledgements:ledger.acknowledgements,conflicts:ledger.conflicts,seenEntries:seen.size,actualRows:stored.count,storedBytes:stored.storedBytes,encoding:stored.encoding,batchMaximum:64,ledgerDigest:digest([...ledger.entries].map(([key,e])=>[key,e.digest]).sort())};
    } finally {db.close();}
}
export function gradeReceiptReplay(v) {
    return !!v && integer(v.actualRows) && v.actualRows>0 && v.actualRows===v.uniqueLedgerEntries && v.actualRows===v.verified && v.actualRows===v.compared && v.actualRows===v.seenEntries && integer(v.acknowledgements) && v.acknowledgements>=v.actualRows && v.conflicts===0 && ["missing","metadataInvalid","decodeErrors","digestMismatches","duplicates"].every(k=>v[k]===0) && hex(v.ledgerDigest) && integer(v.batchMaximum) && v.batchMaximum>0 && v.batchMaximum<=64;
}
export function gradeReceiptGrowth(evidence, maximumBytes) {
    if(!evidence?.baseline||!evidence.final||!integer(maximumBytes))return false;
    const valid=s=>[s.boardReceipts,s.receipts].every(x=>x&&integer(x.count)&&integer(x.storedBytes)&&Array.isArray(x.storageTypes)&&x.storageTypes.every(t=>["text","blob"].includes(t.type)&&integer(t.storedBytes)&&integer(t.count))&&x.storageTypes.reduce((n,t)=>n+t.count,0)===x.count&&x.storageTypes.reduce((n,t)=>n+t.storedBytes,0)===x.storedBytes);
    if(!valid(evidence.baseline)||!valid(evidence.final))return false;
    const total=s=>s.boardReceipts.storedBytes+s.receipts.storedBytes;
    const growth=total(evidence.final)-total(evidence.baseline);
    return growth>=0&&growth<=maximumBytes&&evidence.final.boardReceipts.count>=evidence.baseline.boardReceipts.count&&evidence.final.receipts.count>=evidence.baseline.receipts.count;
}
export function picturePlan(scenario) {
    if(!scenario||scenario.pieces?.length!==24||new Set(scenario.pieces.map(p=>p.pieceId)).size!==24||!same(scenario.pieces.map(p=>p.destination),Array.from({length:24},(_,i)=>i)))error("PICTURE_CATALOGUE");
    return [{type:"start",memberIndex:0,atSeconds:scenario.startSeconds},
        ...Array.from({length:6},(_,memberIndex)=>({type:"join",memberIndex,atSeconds:scenario.joinStartSeconds+memberIndex*scenario.joinIntervalSeconds})),
        ...scenario.pieces.map((piece,i)=>({type:"place",memberIndex:i%6,pieceId:piece.pieceId,destination:piece.destination,atSeconds:scenario.placementStartSeconds+i*scenario.placementIntervalSeconds}))];
}
export function normalizePictureFrame(snapshot, scope) {
    const table=snapshot?.durable?.puzzle, current=table?.current, roster=snapshot?.puzzleRoster;
    const memberIndex=scope.memberIds.indexOf(snapshot?.durable?.selfId);
    const rawMembers=Array.isArray(roster?.memberIds)?roster.memberIds:[];
    const members=rawMembers.map(id=>scope.memberIds.indexOf(id)).sort((a,b)=>a-b);
    const participation=roster?.selfParticipationId;
    const admission={serverEpochHash:uuid(scope.serverEpoch)?digest(scope.serverEpoch):null,generation:scope.generation,accessGeneration:scope.accessGeneration,controller:true};
    const authorityValid=uuid(scope.serverEpoch)&&integer(scope.generation)&&scope.generation>0&&integer(scope.accessGeneration)&&snapshot?.controller===true&&snapshot.generation===scope.generation&&snapshot.accessGeneration===scope.accessGeneration&&snapshot.serverEpoch===scope.serverEpoch;
    const scopeValid=authorityValid&&validPuzzleTable(table)&&snapshot?.durable?.house?.id===scope.houseId&&snapshot.durable.selfId===scope.selfId&&snapshot.durable.zoneId==="lounge"&&roster?.serverEpoch===scope.serverEpoch&&roster.houseId===scope.houseId&&roster.roundId===(current?.id??null)&&memberIndex>=0&&new Set(rawMembers).size===rawMembers.length&&members.every(m=>m>=0)&&rawMembers.length<=6&&(participation===null||uuid(participation))&&(participation===null||rawMembers.includes(scope.selfId));
    return {scopeValid,houseIndex:scope.houseIndex,memberIndex,admission,serverEpochHash:uuid(snapshot?.serverEpoch)?digest(snapshot.serverEpoch):null,generation:snapshot?.generation??null,accessGeneration:snapshot?.accessGeneration??null,controller:snapshot?.controller??null,ruleset:current?.ruleset??null,puzzleRevision:table?.revision??null,roundHash:uuid(current?.id)?digest(current.id):null,illustrationId:current?.illustrationId??null,illustrationVersion:current?.illustrationVersion??null,illustrationDigest:current?.illustrationDigest??null,completed:current?.completed??null,placements:Array.isArray(current?.placements)?current.placements.map(p=>({pieceId:p.pieceId,destination:p.destination,memberIndex:scope.memberIds.indexOf(p.actorId)})):[],rosterRevision:roster?.revision??null,rosterMembers:members,selfParticipationHash:participation===null?null:uuid(participation)?digest(participation):"INVALID"};
}
export function pictureFrameMatches(frame, expected) {
    const trusted=expected.authorities?.[frame?.memberIndex]??frame?.admission;
    const validAuthority=a=>a&&hex(a.serverEpochHash)&&integer(a.generation)&&a.generation>0&&integer(a.accessGeneration)&&a.controller===true;
    const authorityMatches=validAuthority(trusted)&&validAuthority(frame?.admission)&&["serverEpochHash","generation","accessGeneration","controller"].every(key=>frame[key]===trusted[key]&&frame.admission[key]===trusted[key]);
    return !!frame&&authorityMatches&&frame.scopeValid===true&&frame.ruleset===(expected.ruleset??1)&&frame.houseIndex===expected.houseIndex&&integer(frame.memberIndex)&&frame.memberIndex<6&&frame.puzzleRevision===expected.puzzleRevision&&frame.roundHash===expected.roundHash&&frame.illustrationId===expected.illustrationId&&frame.illustrationVersion===expected.illustrationVersion&&frame.illustrationDigest===expected.illustrationDigest&&frame.completed===expected.completed&&same(frame.placements,expected.placements)&&same(frame.rosterMembers,expected.rosterMembers)&&frame.selfParticipationHash===expected.selfHashes[frame.memberIndex]&&integer(frame.rosterRevision)&&(expected.rosterRevision===undefined?frame.rosterRevision>expected.minimumRosterRevision:frame.rosterRevision===expected.rosterRevision);
}
export function puzzleIntentACK(ack, request) {
    if(!ack?.ok||ack.requestId!==request.requestId||ack.intentSequence!==request.intentSequence||ack.mode!=="join"||ack.roundId!==request.roundId||!uuid(ack.participationId)||!integer(ack.rosterRevision))error("PICTURE_INTENT_ACK");
    return {ok:true,requestHash:digest(request.requestId),intentSequence:ack.intentSequence,mode:ack.mode,roundHash:digest(ack.roundId),participationHash:digest(ack.participationId),rosterRevision:ack.rosterRevision};
}
export function gradePictureEvidence(scenario, evidence) {
    try {
        const plan=picturePlan(scenario),times=[];
        if(evidence?.status!=="COMPLETE"||evidence.actions.length!==62||evidence.invalidFrames!==0||evidence.conflictingFrames!==0||evidence.admissions?.length!==12)return false;
        const admissions=new Map(evidence.admissions.map(a=>[a.viewIndex,a]));
        if(admissions.size!==12||new Set(evidence.admissions.map(a=>a.serverEpochHash)).size!==1)return false;
        for(let houseIndex=0;houseIndex<2;houseIndex++) {
            let roundHash=null,head=null,placed=[],selfHashes=Array(6).fill(null);
            const authorities=Array.from({length:6},(_,memberIndex)=>admissions.get(houseIndex*12+memberIndex*2));
            if(authorities.some((a,memberIndex)=>!a||a.houseIndex!==houseIndex||a.memberIndex!==memberIndex||!integer(a.connectionOrdinal)||a.connectionOrdinal<1||!hex(a.serverEpochHash)||!integer(a.generation)||a.generation===0||!integer(a.accessGeneration)||a.controller!==true))return false;
            for(const [stepIndex,step] of plan.entries()) {
                const found=evidence.actions.filter(a=>a.houseIndex===houseIndex&&a.stepIndex===stepIndex);
                if(found.length!==1)return false;const a=found[0];
                if(a.status!=="VISIBLE"||a.type!==step.type||a.memberIndex!==step.memberIndex||a.scheduledOffsetSeconds!==step.atSeconds||!Number.isFinite(a.sendLagMs)||a.sendLagMs<0||a.sendLagMs>scenario.maximumScheduleLagMs||step.type==="place"&&a.sendLagMs>=scenario.placementIntervalSeconds*1000||!a.ack?.ok)return false;
                let revision=1,members=[];
                if(step.type==="start") {
                    roundHash=a.ack.roundHash;
                    if(!hex(roundHash)||a.ack.entityRevision!==1||a.ack.puzzleRevision!==1||!integer(a.beforeRosterRevision)||!integer(a.rosterRevision)||a.rosterRevision<=a.beforeRosterRevision)return false;
                    head=a.rosterRevision;
                } else if(step.type==="join") {
                    if(a.ack.mode!=="join"||a.ack.intentSequence!==1||!hex(a.requestHash)||a.ack.requestHash!==a.requestHash||a.ack.roundHash!==roundHash||!hex(a.ack.participationHash)||!integer(a.ack.rosterRevision)||a.ack.rosterRevision<=head)return false;
                    head=a.ack.rosterRevision;selfHashes[step.memberIndex]=a.ack.participationHash;members=Array.from({length:step.memberIndex+1},(_,i)=>i);
                } else {
                    const pieceIndex=stepIndex-7;revision=pieceIndex+2;
                    if(a.pieceId!==step.pieceId||a.destination!==step.destination||a.ack.roundHash!==roundHash||a.ack.entityRevision!==revision||a.ack.puzzleRevision!==revision||a.ack.pieceId!==step.pieceId||a.ack.destination!==step.destination||a.ack.completed!==(pieceIndex===23))return false;
                    placed.push({pieceId:step.pieceId,destination:step.destination,memberIndex:step.memberIndex});members=[0,1,2,3,4,5];
                    if(pieceIndex===23){if(!integer(a.rosterRevision)||a.rosterRevision<=head)return false;head=a.rosterRevision;members=[];selfHashes=Array(6).fill(null);}
                }
                if(a.rosterRevision!==head||a.roundHash!==roundHash)return false;
                const expected={houseIndex,puzzleRevision:revision,roundHash,illustrationId:scenario.illustrationId,illustrationVersion:scenario.illustrationVersion,illustrationDigest:scenario.illustrationDigest,completed:step.type==="place"&&stepIndex===30,placements:placed,rosterRevision:head,rosterMembers:members,selfHashes,authorities};
                if(a.observed?.length!==6)return false;
                for(let memberIndex=0;memberIndex<6;memberIndex++) {
                    const observations=a.observed.filter(o=>o.viewIndex===houseIndex*12+memberIndex*2);
                    if(observations.length!==1||observations[0].frame.memberIndex!==memberIndex||!pictureFrameMatches(observations[0].frame,expected)||!Number.isFinite(observations[0].latencyMs)||observations[0].latencyMs<0)return false;
                    times.push(observations[0].latencyMs);
                }
            }
        }
        return times.length===372&&percentile(times,.95)<=scenario.visibleP95Ms;
    } catch {return false;}
}
export function verifyClosedPictureTables(path, houses, scenario, evidence) {
    const db=new DatabaseSync(path,{readOnly:true});
    try {
        const result={houses:[],allMatch:true};
        for(const house of houses) {
            const row=db.prepare("SELECT ruleset,state FROM puzzle_tables WHERE house_id=? AND octet_length(state)<=8192").get(house.id);
            let table=null;
            try{if(row&&row.ruleset===1){const value=JSON.parse(row.state);if(validPuzzleTable(value))table=value;}}catch{}
            const current=table?.current;
            const start=evidence.actions.find(a=>a.houseIndex===house.index&&a.type==="start");
            const placements=current?.placements?.map(p=>({pieceId:p.pieceId,destination:p.destination,memberIndex:house.members.findIndex(m=>m.identity===p.actorId)}))??[];
            const expected=scenario.pieces.map((p,i)=>({...p,memberIndex:i%6}));
            const match=table?.revision===25&&uuid(current?.id)&&digest(current.id)===start?.roundHash&&current.completed===true&&current.illustrationId===scenario.illustrationId&&current.illustrationVersion===scenario.illustrationVersion&&current.illustrationDigest===scenario.illustrationDigest&&same(placements,expected);
            result.houses.push({houseIndex:house.index,revision:table?.revision??null,completed:current?.completed??null,placementCount:placements.length,contributions:Array.from({length:6},(_,memberIndex)=>placements.filter(p=>p.memberIndex===memberIndex).length),match});result.allMatch&&=match;
        }
        return result;
    } finally {db.close();}
}
