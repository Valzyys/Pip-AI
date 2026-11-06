import { useEffect } from "react";
import { navigate, usePath } from "./lib/router";
import { Site } from "./site/Site";
import { ChatApp } from "./chat/ChatApp";

export default function App() {
  const path = usePath();
  const isChat = path.startsWith("/chat") || path.startsWith("/room");

  useEffect(() => {
    if (path.startsWith("/room")) navigate("/chat" + location.search, true); // old link
  }, [path]);

  return isChat ? <ChatApp key="chat" /> : <Site key="site" />;
}
