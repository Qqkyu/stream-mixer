import { useEffect, useState } from "react";

export function useEmbedHostname(): string | undefined {
  const [hostname, setHostname] = useState<string>();

  useEffect(() => {
    setHostname(window.location.hostname);
  }, []);

  return hostname;
}
