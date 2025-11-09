import OrderModel from "../../models/order.js";

/**
 * Service de gestion des commandes
 * Logique métier pour les rendez-vous et commandes
 */
export class OrderService {
  /**
   * Crée une commande depuis les données d'un appel
   * @param {Object} appointmentData - Données du rendez-vous
   * @param {Object} options - Options (client, call, description)
   * @returns {Promise<Object|null>} Commande créée ou null
   */
  static async createOrderFromAppointment(appointmentData, options = {}) {
    const { client, callId, nom, description } = options;

    console.log("📅 Création d'une commande depuis la transcription:", appointmentData);
    
    if (appointmentData.nombrePersonnes) {
      console.log("👥 Nombre de personnes détecté:", appointmentData.nombrePersonnes);
    }

    // Gérer les valeurs "ASAP" pour date/heure
    const { orderDate, orderHeure } = this._handleAsapDateTime(
      appointmentData.date, 
      appointmentData.heure
    );

    // Créer la commande
    const createdOrder = await OrderModel.create({
      client: client?._id || null,
      nom: !client ? nom : null,
      date: orderDate,
      heure: orderHeure,
      duree: appointmentData.duree || 60,
      type: appointmentData.type || "Commande à emporter",
      modalite: appointmentData.modalite || "Sur place",
      nombrePersonnes: appointmentData.nombrePersonnes,
      description: appointmentData.description || description,
      commandes: appointmentData.commandes || [],
      statut: "confirme",
      createdBy: "system",
      related_call: callId
    });

    console.log("✅ Commande créée avec succès:", createdOrder._id);
    
    if (client) {
      console.log("   - Client associé:", client._id);
    } else {
      console.log("   - Aucun client associé (peut être ajouté ultérieurement)");
    }

    return createdOrder;
  }

  /**
   * Gère les valeurs ASAP pour date/heure
   * @param {string} date - Date de la commande
   * @param {string} heure - Heure de la commande
   * @returns {Object} { orderDate, orderHeure }
   * @private
   */
  static _handleAsapDateTime(date, heure) {
    let orderDate = new Date();
    let orderHeure = heure;

    // Gestion date ASAP
    if (date === "ASAP") {
      orderDate = new Date();
      console.log("⏰ Date ASAP détectée → date actuelle:", orderDate.toISOString().split('T')[0]);
    } else {
      orderDate = new Date(date);
    }

    // Gestion heure ASAP
    if (heure === "ASAP") {
      const now = new Date();
      now.setMinutes(now.getMinutes() + 30); // +30 min de préparation
      orderHeure = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      console.log("⏰ Heure ASAP détectée → heure actuelle + 30min:", orderHeure);
    }

    return { orderDate, orderHeure };
  }

  /**
   * Recherche des commandes par critères
   * @param {Object} criteria - Critères de recherche
   * @returns {Promise<Array>} Commandes trouvées
   */
  static async searchOrders(criteria) {
    const { searchTerm, isDateSearch, clientIds } = criteria;

    let filters = {};

    if (isDateSearch) {
      filters.date = {
        $gte: new Date(searchTerm),
        $lt: new Date(`${searchTerm}T23:59:59Z`)
      };
    } else {
      filters.$or = [
        { client: { $in: clientIds } },
        { type: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { notes_internes: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const orders = await OrderModel.find(filters)
      .populate('client')
      .sort({ date: -1, heure: -1 })
      .limit(10);

    return orders;
  }

  /**
   * Récupère les commandes d'un client
   * @param {string} clientId - ID du client
   * @returns {Promise<Array>} Commandes du client
   */
  static async getOrdersByClient(clientId) {
    const orders = await OrderModel.find({ client: clientId })
      .sort({ date: -1, heure: -1 })
      .populate("client");

    return orders;
  }
}

