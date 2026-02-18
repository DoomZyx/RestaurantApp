import Client from "../../models/client.js";
import CallModel from "../../models/callData.js";
import OrderModel from "../../models/order.js";
import { CallValidator } from "../validators/CallValidator.js";

/**
 * Service de gestion des clients
 * Toute la logique métier concernant les clients
 */
export class ClientService {
  /**
   * Recherche ou crée un client à partir d'un téléphone
   * @param {string} telephone - Numéro de téléphone
   * @returns {Promise<Object|null>} Client trouvé ou null
   */
  static async findClientByPhone(telephone) {
    if (!CallValidator.validatePhoneNumber(telephone)) {
      return null;
    }

    const client = await Client.findOne({ telephone });
    
    return client;
  }

  /**
   * Crée un nouveau client
   * @param {Object} clientData - Données du client
   * @returns {Promise<Object>} Client créé
   */
  static async createClient(clientData) {
    const { prenom = '-', nom = '-', telephone, email, adresse, entrepriseName, type = 'fournisseur' } = clientData;

    const existingClient = await Client.findOne({ telephone });
    if (existingClient) {
      // Même numéro déjà en base (ex: créé après un appel en tant que client).
      // On met à jour le contact existant en fournisseur et on fusionne les infos.
      existingClient.type = type;
      if (prenom !== '-') existingClient.prenom = prenom;
      if (nom !== '-') existingClient.nom = nom;
      if (email) existingClient.email = email;
      if (adresse !== undefined) existingClient.adresse = adresse;
      if (entrepriseName !== undefined) existingClient.entrepriseName = entrepriseName;
      await existingClient.save();
      return existingClient;
    }

    const newClient = await Client.create({
      prenom,
      nom,
      telephone,
      email,
      adresse,
      entrepriseName,
      type,
    });

    return newClient;
  }

  /**
   * Met à jour un client existant
   * @param {string} clientId - ID du client
   * @param {Object} updates - Données à mettre à jour
   * @returns {Promise<Object>} Client mis à jour
   */
  static async updateClient(clientId, updates) {
    const client = await Client.findById(clientId);
    if (!client) {
      throw new Error("Client introuvable");
    }

    // Appliquer les mises à jour
    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        client[key] = updates[key];
      }
    });

    await client.save();
    
    return client;
  }

  /**
   * Récupère tous les clients (filtré par type fournisseur pour la page Contacts)
   * @returns {Promise<Array>} Liste des fournisseurs
   */
  static async getAllClients() {
    const clients = await Client.find({ type: 'fournisseur' })
      .sort({ nom: 1, prenom: 1 })
      .select("prenom nom telephone email adresse entrepriseName type createdAt");

    return clients;
  }

  /**
   * Récupère l'historique complet d'un client
   * @param {string} clientId - ID du client
   * @returns {Promise<Object>} Historique (client, appels, commandes)
   */
  static async getClientHistory(clientId) {
    // Vérifier que le client existe
    const client = await Client.findById(clientId);
    if (!client) {
      throw new Error("Client introuvable");
    }

    // Récupérer tous les appels du client
    const calls = await CallModel.find({ client: clientId })
      .sort({ date: -1 })
      .populate("related_appointment");

    // Récupérer les commandes du client
    const orders = await OrderModel.find({ client: clientId })
      .sort({ date: -1, heure: -1 })
      .populate("client");

    return {
      client,
      calls,
      orders,
    };
  }

  /**
   * Recherche des clients par critères
   * @param {Object} criteria - Critères de recherche
   * @returns {Promise<Array>} Clients trouvés
   */
  static async searchClients(criteria) {
    const { searchTerm, isPhoneSearch } = criteria;

    let filters = {};
    
    if (isPhoneSearch) {
      filters.telephone = { 
        $regex: searchTerm.replace(/\s/g, ''), 
        $options: 'i' 
      };
    } else {
      filters.$or = [
        { prenom: { $regex: searchTerm, $options: 'i' } },
        { nom: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } },
        { entrepriseName: { $regex: searchTerm, $options: 'i' } }
      ];
    }

    const clients = await Client.find(filters).limit(10);
    return clients;
  }

  /**
   * Supprime un client/fournisseur
   * @param {string} clientId - ID du client
   * @returns {Promise<void>}
   */
  static async deleteClient(clientId) {
    const client = await Client.findById(clientId);
    if (!client) {
      throw new Error("Client introuvable");
    }

    await Client.findByIdAndDelete(clientId);
  }
}

