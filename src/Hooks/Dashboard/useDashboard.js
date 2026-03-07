import { useState, useEffect, useCallback } from "react";
import { fetchTodayOrders, fetchTodayReservations } from "../../API/Appointment/api";
import { fetchPricing } from "../../API/Pricing/api";

const ORDER_STATUS_LABELS = {
  confirme: "Confirmée",
  en_cours: "En préparation",
  planifie: "Planifiée",
  termine: "Prête",
  reporte: "Reportée",
};

function formatHeure(dateObj) {
  if (!dateObj) return null;
  const d = typeof dateObj === "string" ? new Date(dateObj) : dateObj;
  return d.toTimeString().slice(0, 5);
}

function mapOrderToActive(order) {
  const id = order._id ? String(order._id).slice(-6) : order.id ?? "";
  const status = ORDER_STATUS_LABELS[order.statut] || order.statut;
  return {
    id,
    client: order.nom || "—",
    type: order.modalite === "livraison" ? "livraison" : "takeaway",
    status,
    time: order.heure || formatHeure(order.date) || "—",
  };
}

function mapReservationToActive(r) {
  return {
    time: r.heure || formatHeure(r.date) || "—",
    guests: r.nombrePersonnes ?? 1,
    table: r.table ?? null,
  };
}

const JOURS_FR = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

/**
 * Retourne le service en cours (midi ou soir) selon l'heure actuelle et les horaires du jour.
 * Si on est hors créneau, retourne null.
 */
function getCurrentService(horairesOuverture, now) {
  if (!horairesOuverture) return null;
  const jour = JOURS_FR[now.getDay()];
  const horaire = horairesOuverture[jour];
  if (!horaire || horaire.ouvert === false) return null;

  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  if (horaire.midi?.ouverture && horaire.midi?.fermeture) {
    const [moH, moM] = horaire.midi.ouverture.split(":").map(Number);
    const [mfH, mfM] = horaire.midi.fermeture.split(":").map(Number);
    const midiStart = moH * 60 + moM;
    const midiEnd = mfH * 60 + mfM;
    if (nowMinutes >= midiStart && nowMinutes <= midiEnd) return { service: "midi", start: midiStart, end: midiEnd };
  }

  if (horaire.soir?.ouverture && horaire.soir?.fermeture) {
    const [soH, soM] = horaire.soir.ouverture.split(":").map(Number);
    const [sfH, sfM] = horaire.soir.fermeture.split(":").map(Number);
    const soirStart = soH * 60 + soM;
    const soirEnd = sfH * 60 + sfM;
    if (nowMinutes >= soirStart && nowMinutes <= soirEnd) return { service: "soir", start: soirStart, end: soirEnd };
  }

  return null;
}

/**
 * Compte les places occupées pour le service en cours uniquement (réservations dont l'heure
 * tombe dans le créneau midi ou soir actuel).
 */
function getOccupiedForCurrentService(reservations, currentService) {
  if (!currentService) return 0;
  const { start, end } = currentService;
  return reservations
    .filter((r) => {
      if (r.statut === "annule" || r.statut === "termine") return false;
      const [h, m] = (r.heure || "").split(":").map(Number);
      if (Number.isNaN(h)) return false;
      const reservationMinutes = h * 60 + m;
      return reservationMinutes >= start && reservationMinutes <= end;
    })
    .reduce((sum, r) => sum + (Number(r.nombrePersonnes) || 0), 0);
}

function buildRadarEvents(orders, reservations, nowMinutes, windowMinutes = 60) {
  const events = [];
  const endMinutes = nowMinutes + windowMinutes;

  reservations
    .filter((r) => {
      if (r.statut === "annule" || r.statut === "termine") return false;
      const [h, m] = (r.heure || "").split(":").map(Number);
      if (Number.isNaN(h)) return false;
      const eventMin = h * 60 + m;
      return eventMin >= nowMinutes && eventMin <= endMinutes;
    })
    .forEach((r) => {
      events.push({
        time: r.heure,
        type: "reservation",
        guests: r.nombrePersonnes ?? 1,
      });
    });

  orders
    .filter((o) => {
      if (o.statut === "annule") return false;
      const [h, m] = (o.heure || "").split(":").map(Number);
      if (Number.isNaN(h)) return false;
      const eventMin = h * 60 + m;
      return eventMin >= nowMinutes && eventMin <= endMinutes;
    })
    .forEach((o) => {
      events.push({ time: o.heure, type: "takeaway" });
    });

  events.sort((a, b) => {
    const [ha, ma] = a.time.split(":").map(Number);
    const [hb, mb] = b.time.split(":").map(Number);
    return (ha * 60 + ma) - (hb * 60 + mb);
  });
  return events.slice(0, 6);
}

export function useDashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeOrders, setActiveOrders] = useState([]);
  const [activeReservations, setActiveReservations] = useState([]);
  const [radarEvents, setRadarEvents] = useState([]);
  const [capacity, setCapacity] = useState({ occupied: 0, total: 0 });
  const [agentStats, setAgentStats] = useState({
    callsHandled: 0,
    ordersCreated: 0,
    reservationsCreated: 0,
  });

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [ordersRes, reservationsRes, pricingRes] = await Promise.allSettled([
        fetchTodayOrders(),
        fetchTodayReservations(),
        fetchPricing(),
      ]);

      const orders =
        ordersRes.status === "fulfilled" && ordersRes.value?.success && Array.isArray(ordersRes.value.data)
          ? ordersRes.value.data
          : [];
      const reservations =
        reservationsRes.status === "fulfilled" &&
        reservationsRes.value?.success &&
        Array.isArray(reservationsRes.value.data)
          ? reservationsRes.value.data
          : [];

      const activeOrderList = orders
        .filter((o) => o.statut !== "annule")
        .map(mapOrderToActive);
      setActiveOrders(activeOrderList);

      const activeResList = reservations
        .filter((r) => r.statut !== "annule" && r.statut !== "termine")
        .map(mapReservationToActive);
      setActiveReservations(activeResList);

      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      const radar = buildRadarEvents(orders, reservations, nowMinutes, 60);
      setRadarEvents(radar);

      let totalCapacity = 0;
      const horairesOuverture =
        pricingRes.status === "fulfilled" && pricingRes.value?.success
          ? pricingRes.value.data?.restaurantInfo?.horairesOuverture
          : null;
      if (pricingRes.status === "fulfilled" && pricingRes.value?.success) {
        totalCapacity = pricingRes.value.data?.restaurantInfo?.nombreCouverts ?? 0;
      }
      const currentService = getCurrentService(horairesOuverture, now);
      const occupied = Math.min(
        getOccupiedForCurrentService(reservations, currentService),
        totalCapacity
      );
      setCapacity({ occupied, total: totalCapacity });

      setAgentStats({
        callsHandled: orders.length + reservations.length,
        ordersCreated: orders.length,
        reservationsCreated: reservations.length,
      });
    } catch (err) {
      setError(err?.message || "Erreur chargement dashboard");
      setActiveOrders([]);
      setActiveReservations([]);
      setRadarEvents([]);
      setCapacity({ occupied: 0, total: 0 });
      setAgentStats({ callsHandled: 0, ordersCreated: 0, reservationsCreated: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    loading,
    error,
    activeOrders,
    activeReservations,
    radarEvents,
    capacity,
    agentStats,
    refresh: load,
  };
}
