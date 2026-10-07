/** What an elected SUG President can promise — the winner's policy shapes campus for their whole term. */
export type PolicyId = "steadyLight" | "cheapBuka" | "moreShuttles" | "readingRooms" | "fridayJams";

export const POLICIES: Record<PolicyId, { label: string; emoji: string; effect: string }> = {
  steadyLight: { label: "Steady light in the halls", emoji: "💡", effect: "Sleep restores 20% more energy" },
  cheapBuka: { label: "Subsidised buka meals", emoji: "🍛", effect: "Food at Mama B's costs 20% less" },
  moreShuttles: { label: "More campus shuttles", emoji: "🚌", effect: "Everyone gets around 15% faster" },
  readingRooms: { label: "24-hour reading rooms", emoji: "📚", effect: "+4 on every exam score" },
  fridayJams: { label: "Friday campus jams", emoji: "🎶", effect: "Fun drains 25% slower" },
};

export const POLICY_IDS = Object.keys(POLICIES) as PolicyId[];

/** The policy currently in force, set from the last election's result. */
export const campusPolicy: { current: PolicyId | null } = { current: null };

export const policyIs = (p: PolicyId) => campusPolicy.current === p;
