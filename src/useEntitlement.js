import { useState, useEffect, useCallback, useRef, createContext } from "react";
import { supabase } from "./supabase.js";
import { tierOf, can as _can, limit as _limit } from "./entitlement.js";
import { LIMITS } from "./features.js";
import { trackTrialStarted, trackTrialExpired } from "./analytics.js";

export const EntitlementContext = createContext({
  isPremium: false, isTrial: false, trialDaysLeft: 0,
  trialEndsAt: null, isLoading: false, status: "free", tier: "free",
  hadTrial: false,
  can: () => false,
  limit: (resource) => LIMITS.free[resource],
  activateTrial: async (_fromFeature) => {},
});

const TRIAL_DAYS = 14;

export function useEntitlement(userId) {
  const [status, setStatus]           = useState("free");
  const [trialEndsAt, setTrialEndsAt] = useState(null);
  const [isLoading, setIsLoading]     = useState(true);
  const expiredFiredRef               = useRef(false);

  useEffect(() => {
    if (!userId) {
      setStatus("free");
      setTrialEndsAt(null);
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    supabase
      .from("subscriptions")
      .select("status, trial_ends_at")
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data: row }) => {
        if (row) {
          setStatus(row.status);
          setTrialEndsAt(row.trial_ends_at ? new Date(row.trial_ends_at) : null);
        } else {
          setStatus("free");
          setTrialEndsAt(null);
        }
        setIsLoading(false);
      })
      .catch(() => {
        setStatus("free");
        setIsLoading(false);
      });
  }, [userId]);

  const now         = new Date();
  const tier        = tierOf({ status, trialEndsAt });
  const isPremium   = tier !== "free";
  const isTrial     = tier === "trialing";
  // hadTrial: a row exists in subscriptions — user has had or currently has a trial/subscription
  const hadTrial    = status !== "free";
  const trialDaysLeft = trialEndsAt
    ? Math.max(0, Math.ceil((trialEndsAt - now) / (1000 * 60 * 60 * 24)))
    : 0;

  // Emit trial_expired once per session when we detect an expired trial on load
  useEffect(() => {
    if (
      !isLoading &&
      status === "trialing" &&
      trialEndsAt &&
      trialEndsAt <= new Date() &&
      !expiredFiredRef.current
    ) {
      expiredFiredRef.current = true;
      trackTrialExpired();
    }
  }, [isLoading, status, trialEndsAt]);

  const activateTrial = useCallback(async (fromFeature = null) => {
    if (!userId || status !== "free") return;
    const start    = new Date();
    const trialEnd = new Date(start.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
    const { data: row } = await supabase
      .from("subscriptions")
      .insert({
        user_id:                    userId,
        status:                     "trialing",
        trial_started_at:           start.toISOString(),
        trial_ends_at:              trialEnd.toISOString(),
        trial_started_from_feature: fromFeature,
      })
      .select("status, trial_ends_at")
      .single();
    if (row) {
      setStatus(row.status);
      setTrialEndsAt(new Date(row.trial_ends_at));
      trackTrialStarted(fromFeature);
    }
  }, [userId, status]);

  const can   = (feature)  => _can(tier, feature);
  const limit = (resource) => _limit(tier, resource);

  return {
    isPremium, isTrial, trialDaysLeft, trialEndsAt,
    isLoading, status, tier, hadTrial,
    can, limit, activateTrial,
  };
}
