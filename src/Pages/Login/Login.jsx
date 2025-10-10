import { useLogin } from "../../Hooks/Login/useLogin";
import fd from "../../assets/fd.jpg";
import "./Login.scss";

function Login() {
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
          <h1>AirFood AI </h1>
          <p>Connexion à votre espace</p>
        </div>

        {error && (
          <div className="error-message">
            <i className="bi bi-exclamation-triangle"></i>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="votre@email.com"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Mot de passe</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              placeholder="Votre mot de passe"
              required
            />
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <i className="bi bi-arrow-repeat spinning"></i>
                Connexion...
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right"></i>
                Se connecter
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            <strong>Compte par défaut :</strong>
          </p>
          <p>Email: admin@handlehome.com</p>
          <p>Mot de passe: admin123</p>
        </div>
      </div>
    </div>
  );
}

export default Login; 