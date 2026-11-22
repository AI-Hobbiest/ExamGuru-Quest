/* Deterministic, tenant-scoped SaaS repositories for tests and local domain development only. */
(() => {
  "use strict";
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const rows = value => Array.isArray(value) ? clone(value) : [];
  function createMemorySaasRepositories(seed, options) {
    const data = seed || {}, opts = options || {};
    const tenantId = String(opts.tenantId || "");
    if (!tenantId) throw new TypeError("A trusted tenant scope is required for tenant repositories.");
    const institutions = rows(data.institutions);
    if (!institutions.some(x => x.institutionId === tenantId && x.status === "active")) {
      throw new Error("Tenant scope must resolve to an active institution.");
    }
    const plans = rows(data.plans), subscriptions = rows(data.subscriptions).filter(x => x.tenantId === tenantId);
    const grants = rows(data.grants).filter(x => x.tenantId === tenantId);
    const requests = rows(data.onboardingRequests);
    const replay = new Map();
    const catalog = Object.freeze({
      async listPlans(options) { const o=options||{}; return clone(plans.filter(p => o.includeRetired || p.status !== "retired")); },
      async getPlan(id, version) { return clone(plans.find(p => p.planId === id && Number(p.version) === Number(version)) || null); }
    });
    const scopedSubscription = Object.freeze({
      async getCurrent() { return clone(subscriptions.filter(x => !["cancelled","expired"].includes(x.status)).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || null); },
      async save(record, command) {
        if (!record || record.tenantId !== tenantId) throw new Error("Cross-tenant subscription write denied.");
        const key=command&&command.idempotencyKey;
        if(key&&replay.has("subscription:"+key))return clone(replay.get("subscription:"+key));
        const index=subscriptions.findIndex(x=>x.subscriptionId===record.subscriptionId);
        if(index<0){if(command&&command.expectedVersion!=null)throw new Error("Version conflict: subscription does not exist.");subscriptions.push(clone(record));}
        else {if(!command||subscriptions[index].version!==command.expectedVersion)throw new Error("Version conflict: subscription changed.");subscriptions[index]=clone(record);}
        if(key)replay.set("subscription:"+key,clone(record));
        return clone(record);
      }
    });
    const scopedEntitlements = Object.freeze({
      async listCurrent() { return clone(grants); },
      async save(record, command) {
        if (!record || record.tenantId !== tenantId) throw new Error("Cross-tenant entitlement write denied.");
        const key=command&&command.idempotencyKey;
        if(key&&replay.has("grant:"+key))return clone(replay.get("grant:"+key));
        const index=grants.findIndex(x=>x.grantId===record.grantId);
        if(index<0){if(command&&command.expectedVersion!=null)throw new Error("Version conflict: grant does not exist.");grants.push(clone(record));}
        else {if(!command||grants[index].version!==command.expectedVersion)throw new Error("Version conflict: grant changed.");grants[index]=clone(record);}
        if(key)replay.set("grant:"+key,clone(record));
        return clone(record);
      }
    });
    const onboarding = Object.freeze({
      async getById(id) { return clone(requests.find(x=>x.requestId===id)||null); },
      async getByIdempotencyKey(key) { return clone(requests.find(x=>x.idempotencyKey===key)||null); },
      async list() { return clone(requests); },
      async save(record, command) {
        if(!record||!record.requestId)throw new TypeError("Onboarding request is required.");
        const key=command&&command.idempotencyKey;
        if(key&&replay.has("onboarding:"+key))return clone(replay.get("onboarding:"+key));
        const index=requests.findIndex(x=>x.requestId===record.requestId);
        if(index<0){if(command&&command.expectedVersion!=null)throw new Error("Version conflict: onboarding request does not exist.");requests.push(clone(record));}
        else {if(!command||requests[index].version!==command.expectedVersion)throw new Error("Version conflict: onboarding request changed.");requests[index]=clone(record);}
        if(key)replay.set("onboarding:"+key,clone(record));
        return clone(record);
      }
    });
    return Object.freeze({ catalog, subscriptions:scopedSubscription, entitlements:scopedEntitlements, onboarding, assurance:"test-only", tenantScope:tenantId });
  }
  const api=Object.freeze({createMemorySaasRepositories});
  globalThis.ExamGuruMemorySaasRepositories=api;
  if(typeof module!=="undefined"&&module.exports)module.exports=api;
})();