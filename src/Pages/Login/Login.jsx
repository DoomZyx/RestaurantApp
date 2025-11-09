import { useTranslation } from "react-i18next";
import { useLogin } from "../../Hooks/Login/useLogin";
import fd from "../../assets/fd.jpg";
import "./Login.scss";

function Login() {
  const { t } = useTranslation();
  const {
    formData,
    setFormData,
    loading,
    setLoading,
    error,
    setError,

    handleInputChange,
    handleSubmit,
  } = useLogin();

  return (
    <div className="login-container">
      <img className="login-wallpaper" src={fd} alt="" />
      <div className="login-card">
        <div className="login-header">
          <h1>{t('login.title')}</h1>
          <p>{t('login.subtitle')}</p>
        </div>

        {error && (
          <div className="error-message">
            <i className="bi bi-exclamation-triangle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">{t('login.email')}</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder={t('login.emailPlaceholder')}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t('login.password')}</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder={t('login.passwordPlaceholder')}
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <i className="bi bi-arrow-repeat spinning"></i>
                {t('login.loggingIn')}
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right"></i>
                {t('login.loginButton')}
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            <strong>{t('login.defaultAccount')}</strong>
          </p>
          <p>{t('login.defaultEmail')}</p>
          <p>{t('login.defaultPassword')}</p>
        </div>
      </div>
    </div>
  );
}

export default Login; 