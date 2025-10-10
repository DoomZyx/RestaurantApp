import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, isAuthenticated } from "../../API/auth";

export function useLogin() {
 const [formData, setFormData] = useState({
  email: "",
  password: "",
});
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const navigate = useNavigate();

useEffect(() => {
  // Rediriger si déjà connecté
  if (isAuthenticated()) {
    navigate("/");
  }
}, [navigate]);

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
    navigate("/");
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