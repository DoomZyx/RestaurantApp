import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getCurrentUser, logoutUser } from "../../API/auth";
import "./menu.scss";

import leon from "../../assets/leon.png";

function Menu() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const currentUser = getCurrentUser();

  const handleLogout = () => {
    logoutUser();
    navigate("/login");
  };

  // Construire l'URL de l'avatar
  const avatarUrl = currentUser?.avatar 
    ? `http://localhost:8080${currentUser.avatar}` 
    : leon;

  return (
    <>
      <nav>
        <div className="profile">
          <div className="profile-container">
            <img src={avatarUrl} alt="Avatar" />
            <h2>{currentUser?.username || t('menu.user')}</h2>
            <span className="user-role">
              {currentUser?.role === "admin" ? t('menu.admin') : t('menu.user')}
            </span>
          </div>
          <Link to="/" className="dashboard-link">
            <i className="bi bi-speedometer2"></i>
            <span>{t('menu.dashboard')}</span>
          </Link>
        </div>

        <div className="handleCall-container">
          <div className="call-features-list">
            <Link to="/appointments">
              <i className="bi bi-bag-check"></i> <h3>{t('menu.orders')}</h3>
            </Link>
            <Link to="/reservations">
              <i className="bi bi-calendar-check"></i> <h3>{t('menu.reservations')}</h3>
            </Link>
            <Link to="/contacts">
              <i className="bi bi-people"></i> <h3>{t('menu.suppliers')}</h3>
            </Link>
            <Link to="/configuration">
              <i className="bi bi-gear"></i> <h3>{t('menu.configuration')}</h3>
            </Link>
          </div>
        </div>


        <div className="featLinks-container">
          <Link className="myAccount" to="/profile">
            <i className="bi bi-person-badge"></i>
            <h3>{t('menu.myAccount')}</h3>
          </Link>
          <Link className="admin" to="/admin">
            <i className="bi bi-person-gear"></i>
            <h3>{t('menu.adminPanel')}</h3>
          </Link>
        </div>
        <button className="logout" onClick={handleLogout}>
          <i className="bi bi-box-arrow-right"></i>
          <h3>{t('menu.logout')}</h3>
        </button>
      </nav>
    </>
  );
}

export default Menu;
