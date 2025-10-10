import { Link } from "react-router-dom";
import AppLayout from "../../Components/Layout/AppLayout";
import Graphs from "../../Components/Graph/Layout/layoutGraph";
import SearchBar from "../../Components/SearchBar/searchBar";
import AppointmentsWidget from "../../Components/AppointmentsWidget/AppointmentsWidget";
import KPI from "../../Components/KPI/kpi";
import Clock from "../../Features/hours";
import "./Homepage.scss";

function Homepage() {
  return (
    <AppLayout>
      <div className="homepage">
        {/* Header compact et professionnel */}
        <header className="dashboard-header">
          <div className="original-header">
            <Clock />
            <SearchBar />
          </div>
        </header>

        {/* Contenu principal du tableau de bord */}
        <div className="dashboard">
          {/* Section KPI */}
          <div className="dashboard-section kpi-section">
            <div className="section-content">
              <KPI />
            </div>
          </div>

          {/* Section Rendez-vous */}
          <div className="dashboard-section appointments-section">
            <div className="section-content">
              <AppointmentsWidget />
            </div>
          </div>

          {/* Section Graphiques */}
          <div className="dashboard-section charts-section">
            <div className="section-content">
              <Graphs />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export default Homepage;
