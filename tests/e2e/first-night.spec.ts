import {test,expect,type Page} from "@playwright/test";
const ready=async(page:Page)=>{await page.goto("/");await expect(page.locator("#save-window")).toBeEnabled();await expect(page.locator("#render-status")).toContainText(/ready|available/i);};
async function saveWindow(page:Page,name:string){await page.locator("#nickname").fill(name);await page.locator("#save-window").click();await expect(page.locator("#greeting")).toContainText(name);await expect(page.locator("#action-status")).toContainText(/saved/i);}
test("two browser identities share authored lights and a saved visitor returns",async({browser},info)=>{
 const a=await browser.newContext({viewport:{width:1920,height:1080}}),b=await browser.newContext({viewport:{width:390,height:844}});
 const pa=await a.newPage(),pb=await b.newPage();const errors:string[]=[];pa.on("pageerror",e=>errors.push(e.message));pb.on("pageerror",e=>errors.push(e.message));
 await ready(pa);await ready(pb);await saveWindow(pa,"E2E window A");await saveWindow(pb,"E2E window B");
 await expect(pa.locator("#neighbours")).toContainText("E2E window B");
 await pa.getByRole("button",{name:"Shared lamp",exact:true}).click();await pa.locator("#lamp-note").fill("A browser-tested light.");await pa.locator("#save-lamp").click();await expect(pa.locator("#action-status")).toContainText(/saved/i);
 await pb.getByRole("button",{name:"Shared lamp",exact:true}).click();await expect(pb.locator("#contributions")).toContainText("A browser-tested light.");
 await pb.locator("#lamp-note").fill("<b>literal, not markup</b>");await pb.locator("#save-lamp").click();await expect(pa.locator("#contributions")).toContainText("<b>literal, not markup</b>");await expect(pa.locator("#contributions b")).toHaveCount(0);
 await pa.getByRole("button",{name:"My window",exact:true}).click();await expect(pa.locator("#object-description")).toContainText(/-2, 1/);
 await pa.locator("#move-west").focus();await pa.keyboard.press("Enter");await expect(pa.locator("#object-description")).toContainText(/-2.5, 1/);
 const state=await a.storageState();await pa.screenshot({path:info.outputPath("desktop-room.png"),fullPage:true,animations:"disabled"});await a.close();
 const returning=await browser.newContext({storageState:state,viewport:{width:1920,height:1080}});const pr=await returning.newPage();await ready(pr);
 await expect(pr.locator("#greeting")).toContainText("E2E window A");await pr.getByRole("button",{name:"My window",exact:true}).click();await expect(pr.locator("#object-description")).toContainText(/-2.5, 1/);
 await pb.getByRole("button",{name:"My window",exact:true}).click();
 expect(await pb.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const targets=await pb.locator(".move-pad button").evaluateAll(nodes=>nodes.map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})));
 expect(targets.every(n=>n.width>=44&&n.height>=44)).toBe(true);
 await pb.screenshot({path:info.outputPath("phone-room.png"),fullPage:true,animations:"disabled"});
 const diagnostics=JSON.parse(await pr.locator("#display-diagnostics").textContent()??"{}");expect(diagnostics.modelStatus).toBe("loaded");expect(diagnostics.modelCount).toBe(3);
 expect(errors).toEqual([]);await returning.close();await b.close();
});
test("published trace persists across reload and contribution can be withdrawn",async({page})=>{
 await ready(page);await saveWindow(page,"E2E return");await page.getByRole("button",{name:"Shared lamp",exact:true}).click();await page.locator("#lamp-note").fill("A retractable note");await page.locator("#save-lamp").click();await expect(page.locator("#contributions")).toContainText("A retractable note");
 await page.reload();await expect(page.locator("#greeting")).toContainText("E2E return");await page.getByRole("button",{name:"Shared lamp",exact:true}).click();await expect(page.locator("#lamp-note")).toHaveValue("A retractable note");
 await page.locator("#withdraw-lamp").click();await expect(page.locator("#contributions")).not.toContainText("A retractable note");
 await page.locator("#lamp-note").fill("A new note after withdrawal");await page.locator("#save-lamp").click();await expect(page.locator("#contributions")).toContainText("A new note after withdrawal");
});
test("a changed cookie identity gives the old page an explicit recovery path",async({page,context})=>{
 await ready(page);await saveWindow(page,"E2E original identity");
 await context.clearCookies();const fresh=await context.request.get("/api/state");expect(fresh.ok()).toBe(true);
 await page.locator("#nickname").fill("Unsubmitted old draft");await page.locator("#save-window").click();
 await expect(page.locator("#read-latest")).toBeVisible();
 await expect(page.locator("#action-status")).toContainText(/session|window|latest|browser/i);
 await page.locator("#read-latest").click();await expect(page.locator("#greeting")).not.toContainText("E2E original identity");
 await saveWindow(page,"E2E current identity");await expect(page.locator("#action-status")).toContainText(/saved/i);
});
test("an acknowledgement lost after a real commit reuses its pending command",async({page})=>{
 await ready(page);
 let blocked=false;const ids:string[]=[];
 await page.route("**/api/command",async route=>{
  const command=route.request().postDataJSON();ids.push(command.commandId);
  if(!blocked){blocked=true;await route.fetch();await route.abort("failed");}
  else await route.continue();
 });
 await page.locator("#nickname").fill("E2E uncertain save");
 await page.locator("#save-window").click();
 await expect(page.locator("#retry-command")).toBeVisible();
 await expect(page.locator("#action-status")).toContainText(/confirmed|confirmation/i);
 await page.locator("#retry-command").click();
 await expect(page.locator("#action-status")).toContainText(/saved/i);
 expect(ids).toHaveLength(2);expect(ids[0]).toBe(ids[1]);
 const snapshot=await (await page.request.get("/api/state")).json();
 expect(snapshot.visitor.name).toBe("E2E uncertain save");
 expect(snapshot.visitor.revision).toBe(1);
 await page.reload();await expect(page.locator("#nickname")).toHaveValue("E2E uncertain save");
});
