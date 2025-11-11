import { useState, useEffect } from "react";
import {
  createSupplierOrder,
  getSupplierOrders,
  pollOrderStatus,
} from "../../API/SupplierOrders/api";

export function useOrderForm(selectedClient) {
  const [ingredients, setIngredients] = useState([
    { id: Date.now(), nom: "", quantite: "", unite: "kg" }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [orderHistory, setOrderHistory] = useState([]);
  const [callStatus, setCallStatus] = useState(null);
  const [currentOrder, setCurrentOrder] = useState(null);

  const unites = ["kg", "g", "L", "ml", "unité(s)", "boîte(s)", "sachet(s)"];

  // Charger l'historique des commandes depuis le backend
  useEffect(() => {
    if (selectedClient) {
      loadOrderHistory();
    }
  }, [selectedClient]);

  const loadOrderHistory = async () => {
    try {
      const orders = await getSupplierOrders(selectedClient._id);
      setOrderHistory(orders);
    } catch (error) {
      setOrderHistory([]);
    }
  };

  // Ajouter une nouvelle ligne d'ingrédient
  const addIngredient = () => {
    setIngredients([
      ...ingredients,
      { id: Date.now(), nom: "", quantite: "", unite: "kg" }
    ]);
  };

  // Supprimer une ligne d'ingrédient
  const removeIngredient = (id) => {
    if (ingredients.length > 1) {
      setIngredients(ingredients.filter((ing) => ing.id !== id));
    }
  };

  // Mettre à jour un ingrédient
  const updateIngredient = (id, field, value) => {
    setIngredients(
      ingredients.map((ing) =>
        ing.id === id ? { ...ing, [field]: value } : ing
      )
    );
  };

  // Valider le formulaire
  const validateForm = () => {
    return ingredients.every(
      (ing) => ing.nom.trim() !== "" && ing.quantite.trim() !== ""
    );
  };

  // Soumettre la commande et initier l'appel au fournisseur
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      alert("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setIsSubmitting(true);
    setCallStatus("Préparation de l'appel...");

    try {
      const orderData = {
        fournisseur: {
          id: selectedClient._id,
          nom: selectedClient.entrepriseName || `${selectedClient.prenom} ${selectedClient.nom}`,
          telephone: selectedClient.telephone,
          email: selectedClient.email
        },
        ingredients: ingredients.map((ing) => ({
          nom: ing.nom,
          quantite: parseFloat(ing.quantite),
          unite: ing.unite
        }))
      };

      // Créer la commande et initier l'appel
      setCallStatus("Appel en cours au fournisseur...");
      const result = await createSupplierOrder(orderData);
      
      setCurrentOrder(result);
      setCallStatus("Conversation en cours...");

      // Polling pour suivre le statut de l'appel
      const finalOrder = await pollOrderStatus(result.orderId, (updatedOrder) => {
        setCurrentOrder(updatedOrder);
        
        // Mettre à jour le message de statut
        switch (updatedOrder.statut) {
          case "appel_en_cours":
            setCallStatus("Conversation en cours avec le fournisseur...");
            break;
          case "confirmee":
            setCallStatus("Commande confirmée !");
            break;
          case "refusee":
            setCallStatus("Commande refusée par le fournisseur");
            break;
          case "erreur":
            setCallStatus("Erreur lors de l'appel");
            break;
          default:
            setCallStatus("Traitement en cours...");
        }
      });

      // Recharger l'historique
      await loadOrderHistory();

      setSubmitSuccess(true);
      setCallStatus(null);
      
      // Réinitialiser après succès
      setTimeout(() => {
        setSubmitSuccess(false);
        setCurrentOrder(null);
        setIngredients([{ id: Date.now(), nom: "", quantite: "", unite: "kg" }]);
      }, 5000);

    } catch (error) {
      alert(`Erreur: ${error.message}`);
      setCallStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    ingredients,
    isSubmitting,
    submitSuccess,
    orderHistory,
    callStatus,
    currentOrder,
    unites,
    addIngredient,
    removeIngredient,
    updateIngredient,
    handleSubmit,
    validateForm
  };
}

