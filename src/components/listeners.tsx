import usePresence from "@convex-dev/presence/react";
import { useMutation } from "convex/react";
import { Bot } from "lucide-react";
import { useEffect, useState } from "react";
import { type Agent, describeAgent } from "@/lib/agent";
import { api } from "../../convex/_generated/api";
import type { Doc, Id } from "../../convex/_generated/dataModel";

const ROOM = "lounge";
const SHOWN = 8;

type Listener = { trackId: Id<"tracks"> | null; playing: boolean; agent?: Agent };

// Anonymous id per browser, so a visitor stays one listener across reloads and tabs.
function listenerId() {
  try {
    let id = localStorage.getItem("listener-id");
    if (!id) localStorage.setItem("listener-id", (id = crypto.randomUUID()));
    return id;
  } catch {
    return crypto.randomUUID(); // storage blocked: a fresh id per visit is fine
  }
}

function headcount(humans: number, bots: number, meIncluded: boolean) {
  const people =
    humans === 1 && meIncluded ? "Just you" : `${humans} ${humans === 1 ? "person" : "people"}`;
  return `${people} tuning in${bots ? ` · ${bots} ${bots === 1 ? "bot" : "bots"}` : ""}`;
}

type Props = { tracks?: Doc<"tracks">[]; trackId?: Id<"tracks">; playing: boolean };

/** Everyone with the lounge open, each as a little record showing what's on their platter. */
export function Listeners({ tracks, trackId, playing }: Props) {
  const [me] = useState(listenerId);
  const [agent] = useState(() => describeAgent(navigator.userAgent, navigator.webdriver));
  const online = usePresence(api.presence, ROOM, me)?.filter((person) => person.online) ?? [];
  const people = [...online].sort((a, b) => Number(b.userId === me) - Number(a.userId === me));
  const here = people.some((person) => person.userId === me);
  const updateListener = useMutation(api.presence.updateListener);

  // The component ignores updates until our first heartbeat lands, so wait until we're listed.
  useEffect(() => {
    if (here) {
      void updateListener({ roomId: ROOM, userId: me, trackId: trackId ?? null, playing, agent });
    }
  }, [here, me, trackId, playing, agent, updateListener]);

  const bots = people.filter((person) => (person.data as Listener | undefined)?.agent?.bot).length;

  return (
    <div className="listeners">
      {people.length > 0 && (
        <>
          <ul className="listeners-discs" aria-hidden="true">
            {people.slice(0, SHOWN).map((person) => {
              const now = person.data as Listener | undefined;
              const cover = tracks?.find((track) => track._id === now?.trackId)?.artworkUrl;
              const you = person.userId === me;
              const who = now?.agent && `${now.agent.browser} on ${now.agent.os}`;
              return (
                <li
                  key={person.userId}
                  className="listener"
                  title={[you && "You", now?.agent?.bot && "Bot", who].filter(Boolean).join(" · ")}
                  data-you={you || undefined}
                  data-spinning={now?.playing || undefined}
                >
                  {cover && <img src={cover} alt="" />}
                  {now?.agent?.bot && <Bot className="listener-bot" />}
                </li>
              );
            })}
            {people.length > SHOWN && <li className="listener-more">+{people.length - SHOWN}</li>}
          </ul>
          <p>{headcount(people.length - bots, bots, here && !agent.bot)}</p>
        </>
      )}
    </div>
  );
}
