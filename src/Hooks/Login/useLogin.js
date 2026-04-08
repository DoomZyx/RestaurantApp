import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { loginUser, isAuthenticated } from "../../API/auth";

/** Chemin interne uniquement (évite redirection ouverte). */
function safePathFromLocation(from) {
  if (!from || typeof from.pathname !== "string") return "/";
  const p = from.pathname;
  if (!p.startsWith("/") || p.startsWith("//")) return "/";
  if (p === "/login") return "/";
  return `${p}${from.search || ""}`;
}

export function useLogin() {
 const [formData, setFormData] = useState({
  email: "",
  password: "",
});
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const navigate = useNavigate();
const location = useLocation();

useEffect(() => {
  if (isAuthenticated()) {
    navigate(safePathFromLocation(location.state?.from), { replace: true });
  }
}, [navigate, location.state, location.key]);

const handleInputChange = (e) => {
  const { name, value } = e.target;
  setFormData((prev) => ({
    ...prev,
    [name]: value,
  }));
};

const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError(null);

  try {
    await loginUser(formData.email, formData.password);
    navigate(safePathFromLocation(location.state?.from), { replace: true });
  } catch (err) {
    setError(err.message);
  } finally {
    setLoading(false);
  }
};
return {
 // UseState
 formData,
 setFormData,
 loading,
 setLoading,
 error,
 setError,
// Fonctions
 handleInputChange,
 handleSubmit,

}
}