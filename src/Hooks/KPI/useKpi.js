import { useState, useEffect } from 'react';
import { fetchCallsByDate } from '../../API/Calls/api.js';
import { fetchTodayAppointments } from '../../API/Appointment/api.js';
import { fetchPricing } from '../../API/Pricing/api.js';
// import { getAllSupplierOrders } from '../../API/SupplierOrders/api.js'; // Désactivé : route non implémentée

export function useKpi() {
  const [kpiData, setKpiData] = useState({
    totalNouveau: 0,
    totalEnCours: 0,
    totalTermine: 0,
    totalAnnule: 0,
    newToday: 0,
    pendingOld: 0,
    takeAwayCount: 0,
    reservationCount: 0,
    remainingSeats: null
  });
  const [todayOrders, setTodayOrders] = useState([]);
  const [upcomingOrders, setUpcomingOrders] = useState([]); // Commandes dans les 15 prochaines minutes
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const calculateKpiFromData = (callsData) => {
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    console.log("📅 Date du jour pour KPI:", today);
    console.log("📦 Données reçues pour calcul KPI:", callsData);

    // Initialisation des compteurs
    const stats = {
      totalNouveau: 0,
      totalEnCours: 0,
      totalTermine: 0,
      totalAnnule: 0,
      newToday: 0,
      pendingOld: 0
    };

    callsData.forEach(item => {
      console.log(`📊 Item: date=${item.date}, statut=${item.statut}, count=${item.count}`);
      
      // Comptage UNIQUEMENT pour aujourd'hui
      if (item.date === today) {
        console.log(`✅ Match aujourd'hui ! Ajout de ${item.count} à ${item.statut}`);
        
        switch(item.statut) {
          case 'nouveau':
            stats.totalNouveau += item.count;
            break;
          case 'en_cours':
            stats.totalEnCours += item.count;
            break;
          case 'termine':
            stats.totalTermine += item.count;
            break;
          case 'annule':
            stats.totalAnnule += item.count;
            break;
        }
        
        // Toutes les nouvelles demandes d'aujourd'hui
        stats.newToday += item.count;
      } else {
        console.log(`❌ Pas aujourd'hui: "${item.date}" !== "${today}"`);
      }

      // Demandes en cours depuis plus de 24h
      if (item.statut === 'en_cours' && item.date < yesterdayStr) {
        stats.pendingOld += item.count;
      }
    });

    console.log("📈 Stats calculées:", stats);
    return stats;
  };

  const loadKpiData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger les données d'appels
      const response = await fetchCallsByDate();
      let calculatedKpi = {};
      if (response.success) {
        calculatedKpi = calculateKpiFromData(response.data);
      } else {
        throw new Error('Erreur lors du chargement des données');
      }

      // Charger les commandes d'aujourd'hui + la capacité du restaurant en parallèle
      try {
        const [ordersRes, pricingRes] = await Promise.allSettled([
          fetchTodayAppointments(),
          fetchPricing()
        ]);

        // Commandes d'aujourd'hui
        let orders = [];
        if (ordersRes.status === 'fulfilled' && ordersRes.value?.success) {
          orders = Array.isArray(ordersRes.value.data) ? ordersRes.value.data : [];
        }
        setTodayOrders(orders);

        // Capacité totale (nombre de couverts)
        let capacity = null;
        if (pricingRes.status === 'fulfilled' && pricingRes.value?.success) {
          capacity = pricingRes.value.data?.restaurantInfo?.nombreCouverts ?? null;
        }

       // Calculer les métriques du jour
       const takeAwayCount = orders.filter(o => o.type === 'Commande à emporter').length;
       const reservationOrders = orders.filter(o => 
         o.type === 'Réservation de table' && 
         o.statut !== 'annule' && 
         o.statut !== 'termine'
       );
       const reservationCount = reservationOrders.length;
       const reservedSeats = reservationOrders
         .map(o => Number(o.nombrePersonnes) || 0)
         .reduce((a, b) => a + b, 0);
       const remainingSeats = capacity == null ? null : Math.max(capacity - reservedSeats, 0);

        // Calculer les commandes dans les 15 prochaines minutes
        const now = new Date();
        const in15Minutes = new Date(now.getTime() + 15 * 60 * 1000);
        
        const upcoming = orders
          .filter(order => {
            // Seulement les commandes confirmées ou en cours
            if (order.statut === 'annule' || order.statut === 'termine') return false;
            
            // Construire la date/heure de la commande
            const orderDateTime = new Date(order.date);
            const [hours, minutes] = order.heure.split(':').map(Number);
            orderDateTime.setHours(hours, minutes, 0, 0);
            
            // Vérifier si la commande est dans les 15 prochaines minutes
            return orderDateTime >= now && orderDateTime <= in15Minutes;
          })
          .sort((a, b) => {
            // Trier par heure
            const timeA = new Date(a.date);
            const [hoursA, minutesA] = a.heure.split(':').map(Number);
            timeA.setHours(hoursA, minutesA, 0, 0);
            
            const timeB = new Date(b.date);
            const [hoursB, minutesB] = b.heure.split(':').map(Number);
            timeB.setHours(hoursB, minutesB, 0, 0);
            
            return timeA - timeB;
          })
          .slice(0, 5); // Limiter à 5 commandes max
        
        setUpcomingOrders(upcoming);

        // Fusionner les métriques dans kpiData
        setKpiData(prev => ({
          ...calculatedKpi,
          takeAwayCount,
          reservationCount,
          remainingSeats
        }));
      } catch (ordersErr) {
        // Ne pas faire échouer tout le KPI si cette partie échoue
        console.warn('KPI: impossible de charger les commandes/pricing du jour:', ordersErr);
        setTodayOrders([]);
        setUpcomingOrders([]);
        setKpiData(prev => ({
          ...calculatedKpi,
          takeAwayCount: 0,
          reservationCount: 0,
          remainingSeats: null
        }));
      }

    } catch (err) {
      setError(err.message);
      console.error('Erreur KPI:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKpiData();
  }, []);

  // Fonction pour rafraîchir les données
  const refreshKpiData = () => {
    loadKpiData();
  };

  return {
    kpiData,
    todayOrders,
    upcomingOrders,
    loading,
    error,
    refreshKpiData
  };
} 