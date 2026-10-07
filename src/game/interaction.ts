import { type PlaceId, PLACES, type Vec2 } from "./data";
import { player, walkTo } from "./runtime";
import { useIntro } from "./intro";
import { useGame } from "./store";

function readyToMove() {
  const st = useGame.getState();
  if (!st.save || useIntro.getState().step !== "done") return false;
  if (st.activity && !st.cancelWaiting()) {
    st.pushToast("Finish what you're doing first", "bad");
    return false;
  }
  return true;
}

export function goToPlace(id: PlaceId) {
  if (!readyToMove()) return;
  const st = useGame.getState();
  const [dx, dz] = PLACES[id].door;
  if (st.here === id && Math.hypot(player.x - dx, player.z - dz) < 0.5) {
    st.setPanel(id);
    return;
  }
  st.arrive(null);
  st.setFollow(true);
  walkTo(PLACES[id].door, () => useGame.getState().arrive(id));
}

export function walkToPoint(target: Vec2) {
  if (!readyToMove()) return;
  const st = useGame.getState();
  st.arrive(null);
  walkTo(target, () => useGame.getState().setPos([player.x, player.z]));
}
