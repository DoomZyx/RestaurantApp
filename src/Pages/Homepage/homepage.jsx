import { Link } from "react-router-dom";
import AppLayout from "../../Components/Layout/AppLayout";
import AppointmentsWidget from "../../Components/AppointmentsWidget/AppointmentsWidget";
import KPI from "../../Components/KPI/kpi";
import Clock from "../../Features/hours";
import DayGreeting from "../../Components/DayGreeting/DayGreeting";
import "./Homepage.scss";

function Homepage() {
  return (
    <AppLayout>
      <div className="homepage">
        {/* Header compact et professionnel */}
        <header className="dashboard-header">
          <div className="original-header">
            <Clock />
          </div>
        </header>

        {/* Contenu principal du tableau de bord */}
        <div className="dashboard">
          {/* Section KPI */}
          <div className="dashboard-section kpi-section">
            <div className="section-content">
              <KPI />
              <DayGreeting />
            </div>
          </div>

          {/* Section Rendez-vous */}
          <div className="dashboard-section appointments-section">
            <div className="section-content">
              <AppointmentsWidget />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default Homepage;
