"use client";

import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import { initialState } from "@/lib/data";
import { categoryLabel, MAX_PAGES_PER_OWNER } from "@/lib/constants";
import { DEMO_USER_ID, isDemoOwner } from "@/lib/identity";
import { storyExpiry } from "@/lib/pages";
import type {
  ApprovalStatus, Assignment, Campaign, CampaignStatus, InstaPage, OfferStatus, Story, StoreState,
} from "@/types";

/** v2 added page stats/tariffs/ownership and stories; v1 data is migrated on read. */
const STORAGE_KEY = "pakhshchi:demo:v2";
const LEGACY_KEY = "pakhshchi:demo:v1";

type PagePatch = Partial<Pick<InstaPage,
  "title" | "handle" | "url" | "category" | "city" | "bio" | "followers" | "avgStoryViews" | "avgPostViews" | "prices" | "publishTypes" | "avatarUrl">>;

type Action =
  | { type: "hydrate"; state: StoreState }
  | { type: "reset" }
  | { type: "addCampaign"; campaign: Campaign }
  | { type: "setCampaignStatus"; id: string; status: CampaignStatus }
  | { type: "addPage"; page: InstaPage }
  | { type: "updatePage"; id: string; patch: PagePatch }
  | { type: "removePage"; id: string }
  | { type: "setApproval"; id: string; approval: ApprovalStatus; reason?: string }
  | { type: "setOfferStatus"; id: string; status: OfferStatus }
  | { type: "assignPage"; campaignId: string; pageId: string; deadline: string }
  | { type: "unassignPage"; campaignId: string; pageId: string }
  | { type: "updateAssignment"; campaignId: string; pageId: string; patch: Partial<Pick<Assignment, "status" | "proofUrl">> }
  | { type: "addStory"; story: Story }
  | { type: "setStoryDisabled"; id: string; disabled: boolean }
  | { type: "removeStory"; id: string };

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
    case "addPage": {
      // Enforced in the reducer too, not only in the form: the per-owner cap must
      // hold for any caller of this action (eventually the server must enforce it).
      const owned = state.pages.filter((p) => isDemoOwner(p.ownerId) || p.owned).length;
      if (owned >= MAX_PAGES_PER_OWNER) return state;
      return { ...state, pages: [a.page, ...state.pages] };
    }
    case "updatePage":
      return {
        ...state,
        pages: state.pages.map((p) => {
          // Ownership check inside the reducer: a page that is not the demo owner's is never patched.
          if (p.id !== a.id || !(isDemoOwner(p.ownerId) || p.owned)) return p;
          return { ...p, ...a.patch, approval: "pending", rejectReason: "" };
        }),
      };
    case "removePage":
      return {
        ...state,
        pages: state.pages.filter((p) => !(p.id === a.id && (isDemoOwner(p.ownerId) || p.owned))),
        stories: state.stories.filter((s) => s.pageId !== a.id),
        offers: state.offers.filter((o) => o.pageId !== a.id),
      };
    case "setApproval":
      return {
        ...state,
        pages: state.pages.map((p) => (p.id === a.id
          ? { ...p, approval: a.approval, rejectReason: a.approval === "rejected" ? a.reason ?? "دلیل رد ذکر نشده است." : "" }
          : p)),
      };
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
    case "addStory": {
      // A story can only be attached to a page the demo owner actually owns.
      const page = state.pages.find((p) => p.id === a.story.pageId);
      if (!page || !(isDemoOwner(page.ownerId) || page.owned)) return state;
      return { ...state, stories: [a.story, ...state.stories] };
    }
    case "setStoryDisabled": {
      const story = state.stories.find((s) => s.id === a.id);
      const page = story && state.pages.find((p) => p.id === story.pageId);
      if (!story || !page || !(isDemoOwner(page.ownerId) || page.owned)) return state;
      return { ...state, stories: state.stories.map((s) => (s.id === a.id ? { ...s, disabled: a.disabled } : s)) };
    }
    case "removeStory": {
      const story = state.stories.find((s) => s.id === a.id);
      const page = story && state.pages.find((p) => p.id === story.pageId);
      if (!story || !page || !(isDemoOwner(page.ownerId) || page.owned)) return state;
      return { ...state, stories: state.stories.filter((s) => s.id !== a.id) };
    }
    default:
      return state;
  }
}

interface StoreApi extends StoreState {
  ready: boolean;
  addCampaign: (c: Campaign) => void;
  setCampaignStatus: (id: string, s: CampaignStatus) => void;
  addPage: (p: InstaPage) => boolean;
  updatePage: (id: string, patch: PagePatch) => void;
  removePage: (id: string) => void;
  setApproval: (id: string, a: ApprovalStatus, reason?: string) => void;
  addStory: (input: { pageId: string; caption: string; mediaUrl: string | null; mediaKind: "image" | "video" | null }) => void;
  setStoryDisabled: (id: string, disabled: boolean) => void;
  removeStory: (id: string) => void;
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

/**
 * Fills fields added after a state was saved (older local data, or the v1 demo key).
 * Missing fields get empty/zero defaults instead of crashing the UI.
 * Nothing is deleted: known values are kept as they are.
 */
function migrate(raw: StoreState): StoreState {
  const pages = raw.pages.map((p) => {
    const legacy = p as InstaPage & { price?: number };
    const legacyPrice = typeof legacy.price === "number" ? legacy.price : 0;
    const prices = legacy.prices ?? { story: legacyPrice, post: 0, reels: 0 };
    return {
      ...legacy,
      title: legacy.title ?? legacy.handle,
      bio: legacy.bio ?? "",
      avgStoryViews: legacy.avgStoryViews ?? 0,
      avgPostViews: legacy.avgPostViews ?? 0,
      prices,
      publishTypes: legacy.publishTypes ?? [],
      rejectReason: legacy.rejectReason ?? "",
      ownerId: legacy.ownerId ?? (legacy.owned ? DEMO_USER_ID : null),
      createdAt: legacy.createdAt ?? new Date().toISOString(),
      avatarUrl: null,
      owned: !!legacy.owned,
    };
  });
  const campaigns = raw.campaigns.map((c) => ({ ...c, selectedPageId: c.selectedPageId ?? null }));
  return { pages, campaigns, offers: raw.offers, stories: raw.stories ?? [] };
}

function loadSavedState(): StoreState | null {
  for (const key of [STORAGE_KEY, LEGACY_KEY]) {
    try {
      const raw = localStorage.getItem(key);
      const parsed: unknown = raw ? JSON.parse(raw) : null;
      if (isValidState(parsed)) return migrate(parsed);
    } catch {
      /* corrupted or blocked storage: try the next key, then sample data */
    }
  }
  return null;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = loadSavedState();
    if (saved) dispatch({ type: "hydrate", state: saved });
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
    addPage: (page) => {
      // Report success/failure to the caller: the reducer refuses to go past the cap.
      const owned = state.pages.filter((p) => isDemoOwner(p.ownerId) || p.owned).length;
      if (owned >= MAX_PAGES_PER_OWNER) return false;
      dispatch({ type: "addPage", page });
      return true;
    },
    updatePage: (id, patch) => dispatch({ type: "updatePage", id, patch }),
    removePage: (id) => dispatch({ type: "removePage", id }),
    setApproval: (id, approval, reason) => dispatch({ type: "setApproval", id, approval, reason }),
    addStory: ({ pageId, caption, mediaUrl, mediaKind }) => {
      const now = new Date();
      dispatch({
        type: "addStory",
        story: {
          id: `s-${now.getTime().toString(36)}${Math.random().toString(36).slice(2, 5)}`,
          pageId, ownerId: DEMO_USER_ID, caption: caption.trim(), mediaUrl, mediaKind,
          createdAt: now.toISOString(), expiresAt: storyExpiry(now), disabled: false,
        },
      });
    },
    setStoryDisabled: (id, disabled) => dispatch({ type: "setStoryDisabled", id, disabled }),
    removeStory: (id) => dispatch({ type: "removeStory", id }),
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
