import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile,writeFile,mkdir } from "node:fs/promises";
const origin = process.env.BOARD_PREVIEW_URL || "http://localhost:4099";
if (!/^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error("This native check is loopback-only.");
if (process.env.DEBUG || process.env.PWDEBUG) throw new Error("Private native checks require debug logging to be disabled.");
const checkedFiles=["board/main.jsx","board/interaction.js","board/client.js","board/workspace.css","public/board-assets/app.js","public/board-assets/app.css"];
const hashes=async()=>Object.fromEntries(await Promise.all(checkedFiles.map(async path=>[path,createHash("sha256").update(await readFile(path)).digest("hex")])));
const before=await hashes();await mkdir(".local/board-native",{recursive:true});
const browser = await chromium.launch({ headless:true });
let checkpoint="start";
try {
  const a=await browser.newContext({viewport:{width:1920,height:1080}}),b=await browser.newContext({viewport:{width:390,height:844}}),c=await browser.newContext({viewport:{width:390,height:844}});
  const owner=await a.newPage(),peer=await b.newPage(),cold=await c.newPage(),urls=[];for(const page of [owner,peer,cold])page.on("request",request=>urls.push(request.url()));
  const context=page=>page.evaluate(async()=>(await fetch("/api/board/context",{cache:"no-store"})).json());
  async function wait(test){const until=Date.now()+10000;while(Date.now()<until){if(await test())return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error("Native identity wait expired");}
  checkpoint="create:name";await owner.goto(origin+"/board/");await owner.getByLabel("Your name",{exact:true}).fill("Identity owner");checkpoint="create:capacity";await owner.getByLabel("Permanent places").selectOption("2");checkpoint="create:submit";await owner.getByRole("button",{name:"Create house",exact:true}).click();checkpoint="create:editor";await owner.locator(".excalidraw canvas.interactive").waitFor();const original=await context(owner);
  checkpoint="fill second place";await peer.goto(origin+"/board/");await peer.getByLabel("Your name",{exact:true}).fill("Identity friend");await peer.getByLabel("House code",{exact:true}).fill(original.home.code);await peer.getByRole("button",{name:"Join house",exact:true}).click();await peer.locator(".excalidraw canvas.interactive").waitFor();
  checkpoint="private key";await owner.getByRole("button",{name:"Identity and recovery",exact:true}).click();await owner.getByRole("button",{name:"Generate private key",exact:true}).click();await wait(async()=>Boolean(await owner.getByLabel("Private recovery key",{exact:true}).inputValue()));let proof=await owner.getByLabel("Private recovery key",{exact:true}).inputValue();await owner.getByRole("button",{name:"Done",exact:true}).click();assert.equal(await owner.locator("#issued-identity-key").count(),0);
  checkpoint="cold recovery";await cold.goto(origin+"/board/");await cold.getByRole("button",{name:"Recover my identity",exact:true}).click();await cold.getByLabel("Your private recovery key",{exact:true}).waitFor();await cold.getByLabel("Your private recovery key",{exact:true}).fill(proof);proof="";await cold.getByRole("button",{name:"Recover identity",exact:true}).click();await cold.locator(".excalidraw canvas.interactive").waitFor();const recovered=await context(cold);assert(recovered.identity.id===original.identity.id&&recovered.home.id===original.home.id&&recovered.home.capacity===2);
  checkpoint="scope return";assert.equal(await cold.locator("#recover-identity-key").count(),0);await wait(async()=>await owner.getByRole("heading",{name:"Your house access changed",exact:true}).count()===1);assert.equal(await owner.locator("#issued-identity-key").count(),0);const saved=await cold.evaluate(async()=>(await fetch("/api/house/snapshot?zone=lounge",{cache:"no-store"})).json());assert.equal(saved.residents.length,2);await cold.reload();await cold.locator(".excalidraw canvas.interactive").waitFor();assert((await context(cold)).identity.id===original.identity.id);assert(!urls.some(url=>/house-world\.js|house-ui\.js|three\.module/.test(url)));
  const after=await hashes();assert.deepEqual(after,before);await writeFile(".local/board-native/identity-source-hashes.json",JSON.stringify({before,after},null,2));
  console.log(JSON.stringify({passed:true,native:["standalone key issuance","private dialog closed","cold identity recovery","full two-member house preserved","old session revoked","reload","no game imports"],secretCapturedOrLogged:false}));
} catch (error) { throw new Error(`Native standalone identity check failed at checkpoint: ${checkpoint} (${error.name}). Private values were not logged or captured.`); }
finally {await browser.close();}
