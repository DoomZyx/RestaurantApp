import { useCallback, useState } from "react";

export function usePhoneToggle() {
  const [isOn, setIsOn] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState(null);

  const toggle = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    setError(null);
    try {
      // Placeholder logique: pas d'appel backend pour le moment
      setIsOn((prev) => !prev);
    } catch (e) {
      setError("Une erreur est survenue");
    } finally {
      setIsBusy(false);
    }
  }, [isBusy]);

  return {
    isOn,
    isBusy,
    error,
    toggle,
  };
}



