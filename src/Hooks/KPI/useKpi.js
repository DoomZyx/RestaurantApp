import { useState, useEffect } from 'react';
import { fetchCallsByDate } from '../../API/Calls/api.js';
import { getAllSupplierOrders } from '../../API/SupplierOrders/api.js';

export function useKpi() {
  const [kpiData, setKpiData] = useState({
    totalNouveau: 0,
    totalEnCours: 0,
    totalTermine: 0,
    totalAnnule: 0,
    newToday: 0,
    pendingOld: 0
  });
  const [todayOrders, setTodayOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const calculateKpiFromData = (callsData) => {
    const today = new Date().toISOString().split('T')[0]; // Format YYYY-MM-DD
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

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
      // Comptage total par statut
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

      // Nouvelles demandes aujourd'hui (tous statuts confondus)
      if (item.date === today) {
        stats.newToday += item.count;
      }

      // Demandes en cours depuis plus de 24h
      if (item.statut === 'en_cours' && item.date < yesterdayStr) {
        stats.pendingOld += item.count;
      }
    });

    return stats;
  };

  const loadKpiData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger les données d'appels
      const response = await fetchCallsByDate();
      if (response.success) {
        const calculatedKpi = calculateKpiFromData(response.data);
        setKpiData(calculatedKpi);
      } else {
        throw new Error('Erreur lors du chargement des données');
      }

      // Charger les dernières commandes fournisseurs
      try {
        const orders = await getAllSupplierOrders({ limit: 5 });
        
        if (orders && Array.isArray(orders)) {
          // Prendre directement les 5 dernières commandes (triées par date décroissante côté backend)
          setTodayOrders(orders);
        } else {
          setTodayOrders([]);
        }
      } catch (orderErr) {
        // Erreur silencieuse : ne pas afficher de commandes si l'API échoue
        // (normal si le backend n'est pas démarré ou pas de commandes)
        setTodayOrders([]);
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
    loading,
    error,
    refreshKpiData
  };
} 