"use client";

import dynamic from "next/dynamic";

/** The whole game reads localStorage and WebGL, so it renders on the client only. */
const GameClient = dynamic(() => import("./GameClient"), { ssr: false });

export default function GameShell() {
  return <GameClient />;
}
