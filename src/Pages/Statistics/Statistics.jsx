import { useState, useEffect } from "react";
import AppLayout from "../../Components/Layout/AppLayout";
import { fetchCalls, fetchCallsByDate } from "../../API/Calls/api";
import "./Statistics.scss";

function Statistics() {
  const [stats, setStats] = useState({
    totalCalls: 0,
    callsByStatus: {},
    callsByType: {},
    callsByDay: [],
    avgResponseTime: 0,
    topClients: [],
    weeklyTrend: [],
    monthlyData: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState("7"); // derniers 7 jours par défaut

  const loadStatistics = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("Chargement des statistiques...");

      // Charger tous les appels pour calculer les statistiques
      const [callsResponse, dateResponse] = await Promise.all([
        fetchCalls(1, 1000, {}), // Augmenter la limite pour avoir toutes les données
        fetchCallsByDate(),
      ]);

      console.log("Réponses reçues:", {
        calls: callsResponse?.success
          ? `${callsResponse.data?.length || 0} appels`
          : "Erreur",
        dates: dateResponse?.success
          ? `${dateResponse.data?.length || 0} dates`
          : "Erreur",
      });

      if (callsResponse.success && dateResponse.success) {
        const calls = Array.isArray(callsResponse.data)
          ? callsResponse.data
          : [];
        const dateData = Array.isArray(dateResponse.data)
          ? dateResponse.data
          : [];

        console.log(
          `Données reçues: ${calls.length} appels, ${dateData.length} dates`
        );

        if (calls.length === 0) {
          console.log("Aucun appel trouvé, affichage des statistiques vides");
          setStats({
            totalCalls: 0,
            callsByStatus: { nouveau: 0, en_cours: 0, termine: 0, annule: 0 },
            callsByType: {},
            callsByDay: [],
            avgResponseTime: 0,
            topClients: [],
            weeklyTrend: [],
            monthlyData: [],
          });
        } else {
          calculateStatistics(calls, dateData);
        }
      } else {
        const errorMsg = `Erreur lors du chargement: ${
          callsResponse?.error || dateResponse?.error || "Données invalides"
        }`;
        throw new Error(errorMsg);
      }
    } catch (err) {
      console.error("Erreur statistiques:", err);
      setError(err.message || "Erreur lors du chargement des statistiques");
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (calls, dateData) => {
    const now = new Date();
    const daysAgo = parseInt(timeRange);
    const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);

    // Filtrer les appels selon la période et valider les données
    const filteredCalls = calls.filter((call) => {
      if (!call || !call.date) return false;
      const callDate = new Date(call.date);
      return callDate >= cutoffDate && !isNaN(callDate.getTime());
    });

    console.log(
      `Calcul des statistiques pour ${filteredCalls.length} appels sur ${daysAgo} jours`
    );

    // Calculer les statistiques par statut avec validation
    const callsByStatus = {
      nouveau: 0,
      en_cours: 0,
      termine: 0,
      annule: 0,
    };

    // Calculer les statistiques par type
    const callsByType = {};

    // Top clients avec validation
    const clientCounts = {};

    filteredCalls.forEach((call) => {
      // Par statut - validation robuste
      const statut = call.statut || "nouveau";
      if (callsByStatus.hasOwnProperty(statut)) {
        callsByStatus[statut]++;
      }

      // Par type - validation robuste
      if (call.type_demande && call.type_demande.trim()) {
        callsByType[call.type_demande] =
          (callsByType[call.type_demande] || 0) + 1;
      }

      // Par client - validation robuste
      const clientName =
        `${call.client?.prenom || ""} ${call.client?.nom || ""}`.trim() ||
        "Client inconnu";
      clientCounts[clientName] = (clientCounts[clientName] || 0) + 1;
    });

    // Top 5 clients avec validation
    const topClients = Object.entries(clientCounts)
      .filter(([name]) => name !== "Client inconnu" || clientCounts[name] > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Données par jour avec validation robuste
    const callsByDay = [];
    for (let i = daysAgo - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split("T")[0];
      const dayName = date.toLocaleDateString("fr-FR", { weekday: "short" });

      // Validation des données de date
      const dayData = Array.isArray(dateData)
        ? dateData.filter((item) => item && item.date === dateStr)
        : [];

      const total = dayData.reduce((sum, item) => {
        const count = parseInt(item.count) || 0;
        return sum + count;
      }, 0);

      callsByDay.push({
        date: dateStr,
        day: dayName,
        count: total,
        nouveau: dayData.find((d) => d.statut === "nouveau")?.count || 0,
        en_cours: dayData.find((d) => d.statut === "en_cours")?.count || 0,
        termine: dayData.find((d) => d.statut === "termine")?.count || 0,
        annule: dayData.find((d) => d.statut === "annule")?.count || 0,
      });
    }

    // Calculer le temps de réponse moyen avec validation
    const completedCalls = filteredCalls.filter(
      (call) => call.statut === "termine"
    );

    let avgResponseTime = 0;
    if (completedCalls.length > 0) {
      const responseTimeSum = completedCalls.reduce((sum, call) => {
        const createdDate = new Date(call.date);
        if (isNaN(createdDate.getTime())) return sum;

        const now = new Date();
        const hoursDiff = Math.max(0, (now - createdDate) / (1000 * 60 * 60));
        return sum + hoursDiff;
      }, 0);

      avgResponseTime = Math.round(responseTimeSum / completedCalls.length);
    }

    // Validation finale des données
    const finalStats = {
      totalCalls: filteredCalls.length,
      callsByStatus,
      callsByType,
      callsByDay,
      avgResponseTime,
      topClients,
      weeklyTrend: callsByDay.slice(-7),
      monthlyData: Array.isArray(dateData) ? dateData : [],
    };

    console.log("Statistiques calculées:", {
      totalCalls: finalStats.totalCalls,
      callsByStatus: finalStats.callsByStatus,
      topClients: finalStats.topClients.length,
      avgResponseTime: finalStats.avgResponseTime,
    });

    setStats(finalStats);
  };

  useEffect(() => {
    loadStatistics();
  }, [timeRange]);

  const getStatusColor = (status) => {
    const colors = {
      nouveau: "#007bff",
      en_cours: "#ffc107",
      termine: "#28a745",
      annule: "#dc3545",
    };
    return colors[status] || "#6c757d";
  };

  const formatPercentage = (value, total) => {
    if (total === 0) return "0%";
    return `${Math.round((value / total) * 100)}%`;
  };

  return (
    <AppLayout>
      <div className="statistics-container">
        {/* Contrôles */}
        <div className="controls-section">
          <div className="time-filter">
            <label>Période d'analyse:</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
            >
              <option value="7">7 derniers jours</option>
              <option value="14">14 derniers jours</option>
              <option value="30">30 derniers jours</option>
              <option value="90">90 derniers jours</option>
            </select>
          </div>

          <button onClick={loadStatistics} className="refresh-btn">
            <i className="bi bi-arrow-clockwise"></i> Actualiser
          </button>
        </div>

        {loading && (
          <div className="loading-state">
            <i className="bi bi-arrow-repeat spinning"></i>
            Calcul des statistiques...
          </div>
        )}

        {error && (
          <div className="error-state">
            <i className="bi bi-exclamation-triangle"></i>
            {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* KPI principaux */}
            <div className="kpi-grid">
              <div className="kpi-card primary">
                <div className="kpi-icon">
                  <i className="bi bi-telephone"></i>
                </div>
                <div className="kpi-content">
                  <div className="kpi-value">{stats.totalCalls}</div>
                  <div className="kpi-label">Total Appels</div>
                </div>
              </div>

              <div className="kpi-card success">
                <div className="kpi-icon">
                  <i className="bi bi-check-circle"></i>
                </div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {stats.callsByStatus.termine || 0}
                  </div>
                  <div className="kpi-label">Appels Terminés</div>
                  <div className="kpi-percentage">
                    {formatPercentage(
                      stats.callsByStatus.termine,
                      stats.totalCalls
                    )}
                  </div>
                </div>
              </div>

              <div className="kpi-card warning">
                <div className="kpi-icon">
                  <i className="bi bi-clock"></i>
                </div>
                <div className="kpi-content">
                  <div className="kpi-value">{stats.avgResponseTime}h</div>
                  <div className="kpi-label">Temps Moyen</div>
                  <div className="kpi-percentage">de traitement</div>
                </div>
              </div>

              <div className="kpi-card info">
                <div className="kpi-icon">
                  <i className="bi bi-arrow-repeat"></i>
                </div>
                <div className="kpi-content">
                  <div className="kpi-value">
                    {stats.callsByStatus.en_cours || 0}
                  </div>
                  <div className="kpi-label">En Cours</div>
                  <div className="kpi-percentage">
                    {formatPercentage(
                      stats.callsByStatus.en_cours,
                      stats.totalCalls
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Graphiques et détails */}
            <div className="charts-grid">
              {/* Répartition par statut */}
              <div className="chart-card">
                <h3>
                  <i className="bi bi-pie-chart"></i>
                  Répartition par Statut
                </h3>
                <div className="status-chart">
                  {Object.entries(stats.callsByStatus).map(
                    ([status, count]) => (
                      <div key={status} className="status-bar">
                        <div className="status-info">
                          <span className="status-name">
                            {status === "nouveau" && "🆕 Nouveau"}
                            {status === "en_cours" && "⌛ En cours"}
                            {status === "termine" && "☑️ Terminé"}
                            {status === "annule" && "❌ Annulé"}
                          </span>
                          <span className="status-count">{count}</span>
                        </div>
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: formatPercentage(count, stats.totalCalls),
                              backgroundColor: getStatusColor(status),
                            }}
                          />
                        </div>
                        <span className="percentage">
                          {formatPercentage(count, stats.totalCalls)}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>

              {/* Top clients */}
              <div className="chart-card">
                <h3>
                  <i className="bi bi-people"></i>
                  Top Clients
                </h3>
                <div className="clients-list">
                  {stats.topClients.length === 0 ? (
                    <p className="no-data">Aucune donnée client disponible</p>
                  ) : (
                    stats.topClients.map((client, index) => (
                      <div key={client.name} className="client-item">
                        <div className="client-rank">#{index + 1}</div>
                        <div className="client-info">
                          <div className="client-name">{client.name}</div>
                          <div className="client-calls">
                            {client.count} appels
                          </div>
                        </div>
                        <div className="client-bar">
                          <div
                            className="client-fill"
                            style={{
                              width: `${
                                (client.count / stats.topClients[0]?.count ||
                                  1) * 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Tendance par jour */}
              <div className="chart-card full-width">
                <h3>
                  <i className="bi bi-graph-up"></i>
                  Évolution Quotidienne
                </h3>
                <div className="daily-chart">
                  {stats.callsByDay.map((day) => (
                    <div key={day.date} className="day-column">
                      <div className="day-bars">
                        <div
                          className="bar nouveau"
                          style={{
                            height: `${Math.max(day.nouveau * 10, 2)}px`,
                          }}
                          title={`${day.nouveau} nouveaux`}
                        />
                        <div
                          className="bar en_cours"
                          style={{
                            height: `${Math.max(day.en_cours * 10, 2)}px`,
                          }}
                          title={`${day.en_cours} en cours`}
                        />
                        <div
                          className="bar termine"
                          style={{
                            height: `${Math.max(day.termine * 10, 2)}px`,
                          }}
                          title={`${day.termine} terminés`}
                        />
                      </div>
                      <div className="day-info">
                        <div className="day-name">{day.day}</div>
                        <div className="day-total">{day.count}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="chart-legend">
                  <div className="legend-item">
                    <div className="legend-color nouveau"></div>
                    <span>Nouveau</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color en_cours"></div>
                    <span>En cours</span>
                  </div>
                  <div className="legend-item">
                    <div className="legend-color termine"></div>
                    <span>Terminé</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default Statistics;
