import { Link, useNavigate } from "react-router-dom";
import { getCurrentUser, logoutUser } from "../../API/auth";
import "./menu.scss";

import leon from "../../assets/leon.png";

function Menu() {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  return (
    <>
      <nav>
        <div className="profile">
          <div className="profile-container">
            <img src={leon} alt="" />
            <h2>{currentUser?.username || "UTILISATEUR"}</h2>
            <span className="user-role">
              {currentUser?.role === "admin" ? "ADMIN" : "UTILISATEUR"}
            </span>
          </div>
          <Link to="/" className="dashboard-link">
            <i className="bi bi-speedometer2"></i>
            <span>TABLEAU DE BORD</span>
          </Link>
        </div>

        <div className="handleCall-container">
          <div className="call-features-list">
            <Link to="/calls-list">
              <i className="bi bi-telephone"></i> <h3>LISTE D'APPELS</h3>
            </Link>
            <Link to="/status-manager">
              <i className="bi bi-arrow-repeat"></i> <h3>STATUT DE DEMANDE</h3>
            </Link>
            <Link to="/appointments">
              <i className="bi bi-calendar-check"></i> <h3>COMMANDES</h3>
            </Link>
            <Link to="/contacts">
              <i className="bi bi-people"></i> <h3>FOURNISSEURS</h3>
            </Link>
            <Link to="/configuration">
              <i className="bi bi-gear"></i> <h3>CONFIGURATION</h3>
            </Link>
          </div>
        </div>

        <div className="stats-container">
          <div className="stats-list">
            <Link to="/statistics">
              <i className="bi bi-graph-up"></i>
              <h3>STATISTIQUES GLOBALE</h3>
            </Link>
          </div>
        </div>

        <div className="featLinks-container">
          <Link className="myAccount" to="/profile">
            <i className="bi bi-person-badge"></i>
            <h3>MON COMPTE</h3>
          </Link>
          <Link className="admin" to="/admin">
            <i className="bi bi-person-gear"></i>
            <h3>ADMIN</h3>
          </Link>
        </div>
        <button className="logout" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right"></i>
          <h3>DECONNEXION</h3>
        </button>
      </nav>
    </>
  );
}

export default Menu;
