import "./kpi.scss";
import { useTranslation } from "react-i18next";
import { useKpi } from "../../Hooks/KPI/useKpi.js";

function KPI() {
  const { t } = useTranslation();
  const { kpiData, loading, error, refreshKpiData } = useKpi();

  if (loading) {
    return (
      <div className="KPI-container">
        <div className="loading">{t('kpi.loadingStats')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="KPI-container">
        <div className="error">
          {t('common.error')}: {error}
          <button onClick={refreshKpiData}>{t('common.retry')}</button>
        </div>
      </div>
    );
  }

  return (
    <div className="KPI-container">
      <div className="KPI-layout">
        <h3>
          <span>{kpiData.takeAwayCount || 0}</span> {t('kpi.takeawayOrders')}
        </h3>
        <h3>
          <span>{kpiData.reservationCount || 0}</span> {t('kpi.reservations')}
        </h3>
        <h3>
          <span>
            {kpiData.remainingSeats !== null && kpiData.remainingSeats !== undefined ? kpiData.remainingSeats : "—"}
          </span> {t('kpi.remainingSeats')}
        </h3>
      </div>
    </div>
  );
}

export default KPI;
