"use strict";
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");

const source=fs.readFileSync("js/report-print.js","utf8");
const timers=[];
const listeners={};
let written="",openedArgs=null,printed=0,focused=0,closed=false;
const reportWindow={
  opener:{host:true},closed:false,
  document:{
    open(){},
    write(value){written+=String(value);},
    close(){}
  },
  addEventListener(name,handler){listeners[name]=handler;},
  focus(){focused++;},
  print(){printed++;}
};
const fakeWindow={
  open(...args){openedArgs=args;return reportWindow;},
  setTimeout(callback){timers.push(callback);return timers.length;}
};
vm.runInNewContext(source,{window:fakeWindow,Object,String,Number});
const result=fakeWindow.C10ReportPrint.open("<!doctype html><title>Report</title>",{printDelayMs:1,fallbackDelayMs:2});
assert.equal(result.ok,true,"a report window is opened successfully");
assert.deepEqual(openedArgs,["about:blank","_blank"],"the helper does not use noopener/noreferrer features that null the returned window");
assert.equal(reportWindow.opener,null,"the report window is detached from the originating page after opening");
assert.ok(written.includes("<title>Report</title>"),"report HTML is written into the new window");
assert.equal(typeof listeners.load,"function","the helper waits for the report document load event");
listeners.load();
for(const timer of timers)timer();
assert.equal(focused,1,"the print window is focused before printing");
assert.equal(printed,1,"load and fallback events trigger printing only once");

const blockedContext={window:{open(){return null;},setTimeout(){}}};
vm.runInNewContext(source,blockedContext);
const blocked=blockedContext.window.C10ReportPrint.open("<html></html>");
assert.equal(blocked.ok,false,"popup blocking is reported instead of pretending a PDF was generated");
assert.equal(blocked.reason,"popup-blocked");

const page=fs.readFileSync("js/parent-dashboard.js","utf8");
assert.ok(page.includes("C10ReportPrint.open")&&!page.includes("noopener,noreferrer"),"Parent report uses the safe shared print-window flow");
const profile=fs.readFileSync("js/profile-manager.js","utf8");
assert.ok(profile.includes("C10ReportPrint.open"),"Student overall report uses the same mobile-friendly print flow");
console.log("Report print tests passed: popup reference retained, opener detached, report written, print-on-load with manual fallback supported, popup-blocked state surfaced, Parent and Profile reports use shared helper.");
