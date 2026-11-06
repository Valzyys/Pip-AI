import { usePath } from "./lib/router";
import { PixelTransition } from "./components/PixelTransition";
import { Landing } from "./landing/Landing";
import { Room } from "./room/Room";

export default function App() {
  const path = usePath();
  return (
    <>
      <PixelTransition />
      {path.startsWith("/room") ? <Room key="room" /> : <Landing key="land" />}
    </>
  );
}
