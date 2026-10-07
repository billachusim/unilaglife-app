import { supabase } from "@/lib/supabase";
import type { SaveState } from "./state";
import { useGame } from "./store";

export async function fetchCloudSave(userId: string): Promise<SaveState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("saves").select("data").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data?.data as SaveState | undefined) ?? null;
}

export async function pushCloudSave(userId: string, save: SaveState) {
  if (!supabase) return;
  const { error } = await supabase.from("saves").upsert({ user_id: userId, data: save, updated_at: new Date().toISOString() });
  if (error) throw error;
}

/** Uploads the save at most every 15s while playing, and immediately when the tab is hidden. */
export function startAutosave(userId: string) {
  let last: SaveState | null = useGame.getState().save;
  let dirty = false;
  const flush = () => {
    const save = useGame.getState().save;
    if (!dirty || !save) return;
    dirty = false;
    pushCloudSave(userId, save).catch(() => {
      dirty = true;
    });
  };
  const unsub = useGame.subscribe((st) => {
    if (st.save && st.save !== last) {
      last = st.save;
      dirty = true;
    }
  });
  const timer = window.setInterval(flush, 15000);
  const onHide = () => {
    if (document.visibilityState === "hidden") flush();
  };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", flush);
  return () => {
    flush();
    unsub();
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", flush);
  };
}
