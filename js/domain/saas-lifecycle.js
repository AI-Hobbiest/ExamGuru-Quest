/* Provider-neutral tenant onboarding, subscription and entitlement domain rules.
 * Repositories must already be scoped by a trusted server-derived tenant context.
 * This module is not authentication, billing, persistence or an API security boundary.
 */
(() => {
  "use strict";
  const ONBOARDING_TRANSITIONS = Object.freeze({
    requested: ["under_review", "rejected", "cancelled"],
    under_review: ["approved", "rejected", "cancelled"],
    approved: ["provisioned", "cancelled"],
    provisioned: ["active", "suspended", "cancelled"],
    active: ["suspended", "cancelled"],
    suspended: ["active", "cancelled"],
    rejected: [],
    cancelled: []
  });
  const SUBSCRIPTION_TRANSITIONS = Object.freeze({
    pending: ["trialing", "active", "cancelled"],
    trialing: ["active", "past_due", "suspended", "cancelled", "expired"],
    active: ["past_due", "suspended", "cancelled"],
    past_due: ["active", "suspended", "cancelled", "expired"],
    suspended: ["active", "cancelled", "expired"],
    cancelled: ["expired"],
    expired: []
  });
  const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
  const date = value => value == null ? null : Date.parse(value);
  function assertTransition(current, next, table, label) {
    if (!table[current] || !table[current].includes(next)) {
      throw new Error("Invalid " + label + " transition: " + current + " -> " + next);
    }
  }
  function assertCommand(command) {
    if (!command || typeof command.idempotencyKey !== "string" || command.idempotencyKey.trim().length < 8) {
      throw new TypeError("A stable idempotency key is required for every lifecycle command.");
    }
  }
  function assertExpectedVersion(record, expectedVersion) {
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1 || record.version !== expectedVersion) {
      throw new Error("Version conflict: expected " + expectedVersion + ", current " + record.version);
    }
  }
  function isGrantEffective(grant, now) {
    if (!grant || grant.status !== "active") return false;
    const from = date(grant.effectiveFrom), to = date(grant.effectiveTo);
    return !(from != null && from > now) && !(to != null && to <= now);
  }
  function subscriptionAccess(subscription, now) {
    if (!subscription) return { active: false, reason: "no-subscription" };
    const start = date(subscription.currentPeriodStart), end = date(subscription.currentPeriodEnd);
    if (start != null && start > now) return { active: false, reason: "period-not-started" };
    if (subscription.cancelAtPeriodEnd && end != null && end <= now) return { active: false, reason: "period-ended" };
    if (subscription.status === "active" || subscription.status === "trialing") {
      if (end != null && end <= now) return { active: false, reason: "period-ended" };
      if (subscription.status === "trialing" && date(subscription.trialEndsAt) != null && date(subscription.trialEndsAt) <= now) {
        return { active: false, reason: "trial-ended" };
      }
      return { active: true, reason: subscription.status };
    }
    if (subscription.status === "past_due" && date(subscription.gracePeriodEndsAt) != null &&
        date(subscription.gracePeriodEndsAt) > now) return { active: true, reason: "grace-period" };
    return { active: false, reason: subscription.status || "inactive" };
  }
  function resolveEntitlements(plan, subscription, grants, at) {
    const now = at == null ? Date.now() : (typeof at === "number" ? at : Date.parse(at));
    if (!Number.isFinite(now)) throw new TypeError("A valid entitlement evaluation time is required.");
    const access = subscriptionAccess(subscription, now);
    if (!access.active || !plan || plan.planId !== subscription.planId ||
        Number(plan.version) !== Number(subscription.planVersion)) {
      return Object.freeze({ active: false, reason: access.reason, features: Object.freeze({}), limits: Object.freeze({}), scopedGrants: Object.freeze([]) });
    }
    const features = Object.create(null);
    const limits = Object.create(null);
    (plan.features || []).forEach(key => { features[key] = true; });
    Object.entries(plan.limits || {}).forEach(([key, value]) => { limits[key] = value; });
    const scopedGrants = [];
    (grants || []).filter(g => g && g.tenantId === subscription.tenantId && isGrantEffective(g, now))
      .sort((a, b) => (a.effect === "deny" ? 1 : 0) - (b.effect === "deny" ? 1 : 0))
      .forEach(grant => {
        const hasScope = grant.scope && Object.values(grant.scope).some(v => Array.isArray(v) && v.length);
        if (hasScope) { scopedGrants.push(clone(grant)); return; }
        if (grant.effect === "deny") {
          features[grant.key] = false;
          if (grant.limit != null) limits[grant.key] = 0;
          return;
        }
        if (grant.effect === "allow") {
          features[grant.key] = true;
          if (grant.limit != null) {
            const current = limits[grant.key];
            limits[grant.key] = Number.isFinite(current) ? Math.min(current, grant.limit) : grant.limit;
          }
        }
      });
    return Object.freeze({
      active: true, reason: access.reason,
      features: Object.freeze(features), limits: Object.freeze(limits),
      scopedGrants: Object.freeze(scopedGrants)
    });
  }
  function createSaasLifecycle(repositories) {
    const contracts = globalThis.ExamGuruRepositoryContracts;
    if (!contracts) throw new Error("Repository contracts must load before SaaS lifecycle services.");
    const repos = {};
    ["catalog", "subscriptions", "entitlements", "onboarding"].forEach(name => {
      if (!repositories || !repositories[name]) throw new TypeError("The " + name + " repository is required.");
      repos[name] = contracts.assertRepository(name, repositories[name]);
    });
    async function getCurrentEntitlements(at) {
      const subscription = await repos.subscriptions.getCurrent();
      if (!subscription) return resolveEntitlements(null, null, [], at);
      const plan = await repos.catalog.getPlan(subscription.planId, subscription.planVersion);
      const grants = await repos.entitlements.listCurrent();
      return resolveEntitlements(plan, subscription, grants, at);
    }
    return Object.freeze({
      async listPlans(options) { return clone(await repos.catalog.listPlans(options || {})); },
      async getCurrentSubscription() { return clone(await repos.subscriptions.getCurrent()); },
      async getCurrentEntitlements(at) { return getCurrentEntitlements(at); },
      async transitionOnboarding(requestId, nextStatus, patch, command) {
        assertCommand(command);
        const replay = command && command.idempotencyKey ? await repos.onboarding.getByIdempotencyKey(command.idempotencyKey) : null;
        if (replay) return clone(replay);
        const current = await repos.onboarding.getById(String(requestId));
        if (!current) throw new Error("Onboarding request not found.");
        assertExpectedVersion(current, command && command.expectedVersion);
        assertTransition(current.status, nextStatus, ONBOARDING_TRANSITIONS, "onboarding");
        if (nextStatus === "provisioned" || nextStatus === "active") {
          const tenantId = String((patch && patch.tenantId) || current.tenantId || "");
          if (!tenantId) throw new Error("A trusted provisioning operation must assign the tenant ID.");
          if (nextStatus === "active" && !["provisioned", "suspended"].includes(current.status)) throw new Error("A tenant must be provisioned before activation.");
        }
        const next = { ...current, ...(patch || {}), status: nextStatus, version: current.version + 1,
          updatedAt: (command && command.now) || new Date().toISOString(), idempotencyKey: command && command.idempotencyKey };
        return clone(await repos.onboarding.save(next, { expectedVersion: current.version, idempotencyKey: command && command.idempotencyKey }));
      },
      async transitionSubscription(nextStatus, patch, command) {
        assertCommand(command);
        const replay = command && command.idempotencyKey ? await repos.subscriptions.getByIdempotencyKey(command.idempotencyKey) : null;
        if (replay) return clone(replay);
        const current = await repos.subscriptions.getCurrent();
        if (!current) throw new Error("Tenant subscription not found.");
        assertExpectedVersion(current, command && command.expectedVersion);
        assertTransition(current.status, nextStatus, SUBSCRIPTION_TRANSITIONS, "subscription");
        const next = { ...current, ...(patch || {}), status: nextStatus, version: current.version + 1,
          updatedAt: (command && command.now) || new Date().toISOString(), idempotencyKey: command && command.idempotencyKey };
        return clone(await repos.subscriptions.save(next, { expectedVersion: current.version, idempotencyKey: command && command.idempotencyKey }));
      },
      async saveEntitlementGrant(grant, command) {
        assertCommand(command);
        if (!grant || !grant.grantId) throw new TypeError("An entitlement grant ID is required.");
        const replay = command && command.idempotencyKey ? await repos.entitlements.getByIdempotencyKey(command.idempotencyKey) : null;
        if (replay) return clone(replay);
        const existing = (await repos.entitlements.listCurrent()).find(x => x.grantId === grant.grantId);
        if (existing) assertExpectedVersion(existing, command && command.expectedVersion);
        const next = { ...clone(grant), version: existing ? existing.version + 1 : 1,
          updatedAt: (command && command.now) || new Date().toISOString(), idempotencyKey: command && command.idempotencyKey };
        return clone(await repos.entitlements.save(next, { expectedVersion: existing ? existing.version : null, idempotencyKey: command && command.idempotencyKey }));
      },
      async createOnboardingRequest(request, command) {
        if (!request || !request.requestId || !command || !command.idempotencyKey) throw new TypeError("Request ID and idempotency key are required.");
        const replay = await repos.onboarding.getByIdempotencyKey(command.idempotencyKey);
        if (replay) return clone(replay);
        if (request.status !== "requested") throw new Error("New onboarding requests must start in requested state.");
        const now = command.now || new Date().toISOString();
        const next = { ...clone(request), version: 1, idempotencyKey: command.idempotencyKey, createdAt: now, updatedAt: now };
        return clone(await repos.onboarding.save(next, { expectedVersion: null, idempotencyKey: command.idempotencyKey }));
      }
    });
  }
  const api = Object.freeze({ ONBOARDING_TRANSITIONS, SUBSCRIPTION_TRANSITIONS, assertTransition, assertCommand, assertExpectedVersion,
    subscriptionAccess, resolveEntitlements, createSaasLifecycle });
  globalThis.ExamGuruSaasLifecycle = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})();