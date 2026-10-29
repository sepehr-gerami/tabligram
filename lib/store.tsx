"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { initialState } from "@/lib/data";
import { categoryLabel } from "@/lib/constants";
import type {
  ApprovalStatus, Assignment, Campaign, CampaignStatus, InstaPage, OfferStatus, StoreState,
} from "@/types";

const STORAGE_KEY = "pakhshchi:demo:v1";

type Action =
  | { type: "hydrate"; state: StoreState }
  | { type: "reset" }
  | { type: "addCampaign"; campaign: Campaign }
  | { type: "setCampaignStatus"; id: string; status: CampaignStatus }
  | { type: "addPage"; page: InstaPage }
  | { type: "setApproval"; id: string; approval: ApprovalStatus }
  | { type: "setOfferStatus"; id: string; status: OfferStatus }
  | { type: "assignPage"; campaignId: string; pageId: string; deadline: string }
  | { type: "unassignPage"; campaignId: string; pageId: string }
  | { type: "updateAssignment"; campaignId: string; pageId: string; patch: Partial<Pick<Assignment, "status" | "proofUrl">> };

const mapCampaign = (s: StoreState, id: string, fn: (c: Campaign) => Campaign): StoreState => ({
  ...s,
  campaigns: s.campaigns.map((c) => (c.id === id ? fn(c) : c)),
});

function reducer(state: StoreState, a: Action): StoreState {
  switch (a.type) {
    case "hydrate":
      return a.state;
    case "reset":
      return initialState;
    case "addCampaign":
      return { ...state, campaigns: [a.campaign, ...state.campaigns] };
    case "setCampaignStatus":
      return mapCampaign(state, a.id, (c) => ({ ...c, status: a.status }));
    case "addPage":
      return { ...state, pages: [a.page, ...state.pages] };
    case "setApproval":
      return { ...state, pages: state.pages.map((p) => (p.id === a.id ? { ...p, approval: a.approval } : p)) };
    case "setOfferStatus": {
      const offer = state.offers.find((o) => o.id === a.id);
      const next = { ...state, offers: state.offers.map((o) => (o.id === a.id ? { ...o, status: a.status } : o)) };
      if (offer?.campaignId && offer.pageId) {
        const { campaignId, pageId } = offer;
        return mapCampaign(next, campaignId, (c) => ({
          ...c,
          assignments: c.assignments.map((x) =>
            x.pageId === pageId ? { ...x, status: a.status === "rejected" ? "failed" : "awaiting" } : x),
        }));
      }
      return next;
    }
    case "assignPage": {
      const campaign = state.campaigns.find((c) => c.id === a.campaignId);
      const page = state.pages.find((p) => p.id === a.pageId);
      if (!campaign || !page || campaign.assignments.some((x) => x.pageId === a.pageId)) return state;
      const next = mapCampaign(state, a.campaignId, (c) => ({
        ...c,
        assignments: [...c.assignments, { pageId: a.pageId, status: "awaiting", proofUrl: "" }],
      }));
      if (!page.owned) return next;
      return {
        ...next,
        offers: [{
          id: `o-${a.campaignId}-${a.pageId}`, campaignId: a.campaignId, pageId: a.pageId,
          campaignTitle: campaign.title, business: campaign.business, topic: categoryLabel(campaign.category),
          amount: Math.round(campaign.budget / Math.max(campaign.count, 1)), publishType: campaign.publishType,
          deadline: a.deadline, status: "new",
        }, ...next.offers.filter((o) => o.id !== `o-${a.campaignId}-${a.pageId}`)],
      };
    }
    case "unassignPage":
      return mapCampaign(state, a.campaignId, (c) => ({ ...c, assignments: c.assignments.filter((x) => x.pageId !== a.pageId) }));
    case "updateAssignment":
      return mapCampaign(state, a.campaignId, (c) => ({
        ...c,
        assignments: c.assignments.map((x) => (x.pageId === a.pageId ? { ...x, ...a.patch } : x)),
      }));
    default:
      return state;
  }
}

interface StoreApi extends StoreState {
  ready: boolean;
  addCampaign: (c: Campaign) => void;
  setCampaignStatus: (id: string, s: CampaignStatus) => void;
  addPage: (p: InstaPage) => void;
  setApproval: (id: string, a: ApprovalStatus) => void;
  setOfferStatus: (id: string, s: OfferStatus) => void;
  assignPage: (campaignId: string, pageId: string) => void;
  unassignPage: (campaignId: string, pageId: string) => void;
  updateAssignment: (campaignId: string, pageId: string, patch: Partial<Pick<Assignment, "status" | "proofUrl">>) => void;
  reset: () => void;
}

const StoreContext = createContext<StoreApi | null>(null);

const isValidState = (v: unknown): v is StoreState => {
  const s = v as Partial<StoreState> | null;
  return !!s && Array.isArray(s.campaigns) && Array.isArray(s.pages) && Array.isArray(s.offers);
};

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (isValidState(parsed)) dispatch({ type: "hydrate", state: parsed });
    } catch {
      /* corrupted or blocked storage: continue with sample data */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage full or blocked: demo keeps working in memory */
    }
  }, [state, ready]);

  const api = useMemo<StoreApi>(() => ({
    ...state,
    ready,
    addCampaign: (campaign) => dispatch({ type: "addCampaign", campaign }),
    setCampaignStatus: (id, status) => dispatch({ type: "setCampaignStatus", id, status }),
    addPage: (page) => dispatch({ type: "addPage", page }),
    setApproval: (id, approval) => dispatch({ type: "setApproval", id, approval }),
    setOfferStatus: (id, status) => dispatch({ type: "setOfferStatus", id, status }),
    assignPage: (campaignId, pageId) =>
      dispatch({ type: "assignPage", campaignId, pageId, deadline: new Date(Date.now() + 7 * 864e5).toISOString() }),
    unassignPage: (campaignId, pageId) => dispatch({ type: "unassignPage", campaignId, pageId }),
    updateAssignment: (campaignId, pageId, patch) => dispatch({ type: "updateAssignment", campaignId, pageId, patch }),
    reset: () => dispatch({ type: "reset" }),
  }), [state, ready]);

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used inside <StoreProvider>");
  return ctx;
}
