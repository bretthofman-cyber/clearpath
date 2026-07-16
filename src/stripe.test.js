/**
 * Phase 6 — Stripe webhook handler unit tests.
 *
 * Tests handleWebhookEvent() with fixture events and a mocked Supabase client.
 * Covers: all 4 event types, tier transitions, missing metadata, idempotency,
 * unknown event types, and trial-to-paid.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleWebhookEvent, mapStripeStatus } from "./stripeWebhookHandlers.js";

// ── Supabase mock factory ─────────────────────────────────────────────────────

function makeSupabase() {
  const calls = { upserts: [], updates: [] };

  const chain = {
    upsert: vi.fn((data, opts) => { calls.upserts.push({ data, opts }); return chain; }),
    update: vi.fn((data)      => { calls.updates.push({ data }); return chain; }),
    eq:     vi.fn()            .mockReturnThis(),
  };

  const supabase = {
    from: vi.fn().mockReturnValue(chain),
    _calls: calls,
    _chain: chain,
  };

  return supabase;
}

// ── Fixture events ────────────────────────────────────────────────────────────

const CHECKOUT_SESSION_COMPLETED = {
  type: "checkout.session.completed",
  data: {
    object: {
      customer:     "cus_test123",
      subscription: "sub_test456",
      metadata:     { user_id: "user-uuid-1" },
    },
  },
};

const SUBSCRIPTION_UPDATED_ACTIVE = {
  type: "customer.subscription.updated",
  data: {
    object: {
      id:                  "sub_test456",
      customer:            "cus_test123",
      status:              "active",
      current_period_end:  1800000000,
      metadata:            { user_id: "user-uuid-1" },
    },
  },
};

const SUBSCRIPTION_UPDATED_PAST_DUE = {
  type: "customer.subscription.updated",
  data: {
    object: {
      id:                  "sub_test456",
      customer:            "cus_test123",
      status:              "past_due",
      current_period_end:  1800000000,
      metadata:            { user_id: "user-uuid-1" },
    },
  },
};

const SUBSCRIPTION_DELETED = {
  type: "customer.subscription.deleted",
  data: {
    object: {
      id:       "sub_test456",
      customer: "cus_test123",
      metadata: { user_id: "user-uuid-1" },
    },
  },
};

const INVOICE_PAYMENT_FAILED = {
  type: "invoice.payment_failed",
  data: {
    object: {
      subscription: "sub_test456",
    },
  },
};

// ── mapStripeStatus ───────────────────────────────────────────────────────────

describe("mapStripeStatus", () => {
  it("maps 'active' to 'active'",           () => expect(mapStripeStatus("active")).toBe("active"));
  it("maps 'trialing' to 'active'",         () => expect(mapStripeStatus("trialing")).toBe("active"));
  it("maps 'past_due' to 'past_due'",       () => expect(mapStripeStatus("past_due")).toBe("past_due"));
  it("maps 'canceled' to 'canceled'",       () => expect(mapStripeStatus("canceled")).toBe("canceled"));
  it("maps 'incomplete_expired' to 'canceled'", () => expect(mapStripeStatus("incomplete_expired")).toBe("canceled"));
  it("maps unknown status to 'canceled'",   () => expect(mapStripeStatus("unpaid")).toBe("canceled"));
});

// ── checkout.session.completed ────────────────────────────────────────────────

describe("handleWebhookEvent — checkout.session.completed", () => {
  let supabase;
  beforeEach(() => { supabase = makeSupabase(); });

  it("upserts subscription with status=active", async () => {
    const result = await handleWebhookEvent(CHECKOUT_SESSION_COMPLETED, supabase);
    expect(result.ok).toBe(true);
    expect(supabase.from).toHaveBeenCalledWith("subscriptions");
    const upserted = supabase._calls.upserts[0].data;
    expect(upserted.user_id).toBe("user-uuid-1");
    expect(upserted.stripe_customer_id).toBe("cus_test123");
    expect(upserted.stripe_subscription_id).toBe("sub_test456");
    expect(upserted.status).toBe("active");
  });

  it("clears trial fields on checkout completion (trial-to-paid)", async () => {
    await handleWebhookEvent(CHECKOUT_SESSION_COMPLETED, supabase);
    const upserted = supabase._calls.upserts[0].data;
    expect(upserted.trial_started_at).toBeNull();
    expect(upserted.trial_ends_at).toBeNull();
  });

  it("returns ok:false when user_id missing from metadata", async () => {
    const event = {
      ...CHECKOUT_SESSION_COMPLETED,
      data: { object: { ...CHECKOUT_SESSION_COMPLETED.data.object, metadata: {} } },
    };
    const result = await handleWebhookEvent(event, supabase);
    expect(result.ok).toBe(false);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("is idempotent — second call with same event does not throw", async () => {
    await handleWebhookEvent(CHECKOUT_SESSION_COMPLETED, supabase);
    const result2 = await handleWebhookEvent(CHECKOUT_SESSION_COMPLETED, supabase);
    expect(result2.ok).toBe(true);
    expect(supabase._calls.upserts).toHaveLength(2);
  });
});

// ── customer.subscription.updated ────────────────────────────────────────────

describe("handleWebhookEvent — customer.subscription.updated", () => {
  let supabase;
  beforeEach(() => { supabase = makeSupabase(); });

  it("upserts with status=active when Stripe status is active", async () => {
    const result = await handleWebhookEvent(SUBSCRIPTION_UPDATED_ACTIVE, supabase);
    expect(result.ok).toBe(true);
    const upserted = supabase._calls.upserts[0].data;
    expect(upserted.status).toBe("active");
    expect(upserted.stripe_subscription_id).toBe("sub_test456");
  });

  it("upserts with status=past_due when Stripe status is past_due", async () => {
    await handleWebhookEvent(SUBSCRIPTION_UPDATED_PAST_DUE, supabase);
    expect(supabase._calls.upserts[0].data.status).toBe("past_due");
  });

  it("sets current_period_end from Stripe unix timestamp", async () => {
    await handleWebhookEvent(SUBSCRIPTION_UPDATED_ACTIVE, supabase);
    const { current_period_end } = supabase._calls.upserts[0].data;
    expect(current_period_end).toBe(new Date(1800000000 * 1000).toISOString());
  });

  it("returns ok:false when user_id missing", async () => {
    const event = {
      ...SUBSCRIPTION_UPDATED_ACTIVE,
      data: { object: { ...SUBSCRIPTION_UPDATED_ACTIVE.data.object, metadata: {} } },
    };
    const result = await handleWebhookEvent(event, supabase);
    expect(result.ok).toBe(false);
  });
});

// ── customer.subscription.deleted ────────────────────────────────────────────

describe("handleWebhookEvent — customer.subscription.deleted", () => {
  let supabase;
  beforeEach(() => { supabase = makeSupabase(); });

  it("updates status to canceled", async () => {
    const result = await handleWebhookEvent(SUBSCRIPTION_DELETED, supabase);
    expect(result.ok).toBe(true);
    expect(supabase._calls.updates[0].data.status).toBe("canceled");
  });

  it("filters by user_id", async () => {
    await handleWebhookEvent(SUBSCRIPTION_DELETED, supabase);
    expect(supabase._chain.eq).toHaveBeenCalledWith("user_id", "user-uuid-1");
  });

  it("returns ok:false when user_id missing", async () => {
    const event = {
      ...SUBSCRIPTION_DELETED,
      data: { object: { ...SUBSCRIPTION_DELETED.data.object, metadata: {} } },
    };
    const result = await handleWebhookEvent(event, supabase);
    expect(result.ok).toBe(false);
  });
});

// ── invoice.payment_failed ────────────────────────────────────────────────────

describe("handleWebhookEvent — invoice.payment_failed", () => {
  let supabase;
  beforeEach(() => { supabase = makeSupabase(); });

  it("updates status to past_due", async () => {
    const result = await handleWebhookEvent(INVOICE_PAYMENT_FAILED, supabase);
    expect(result.ok).toBe(true);
    expect(supabase._calls.updates[0].data.status).toBe("past_due");
  });

  it("filters by stripe_subscription_id", async () => {
    await handleWebhookEvent(INVOICE_PAYMENT_FAILED, supabase);
    expect(supabase._chain.eq).toHaveBeenCalledWith("stripe_subscription_id", "sub_test456");
  });

  it("returns ok:false when invoice has no subscription", async () => {
    const event = {
      type: "invoice.payment_failed",
      data: { object: { subscription: null } },
    };
    const result = await handleWebhookEvent(event, supabase);
    expect(result.ok).toBe(false);
  });
});

// ── Unknown event type ────────────────────────────────────────────────────────

describe("handleWebhookEvent — unknown event types", () => {
  it("returns ok:true and does not throw or touch DB", async () => {
    const supabase = makeSupabase();
    const result = await handleWebhookEvent({ type: "payment_intent.created", data: {} }, supabase);
    expect(result.ok).toBe(true);
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

// ── Tier transitions via entitlement.js ──────────────────────────────────────

describe("tierOf after webhook events (integration)", () => {
  it("past_due status still grants premium access", async () => {
    const { tierOf } = await import("./entitlement.js");
    expect(tierOf({ status: "past_due", trialEndsAt: null })).toBe("active");
  });

  it("canceled status returns free", async () => {
    const { tierOf } = await import("./entitlement.js");
    expect(tierOf({ status: "canceled", trialEndsAt: null })).toBe("free");
  });

  it("active status returns active", async () => {
    const { tierOf } = await import("./entitlement.js");
    expect(tierOf({ status: "active", trialEndsAt: null })).toBe("active");
  });
});
