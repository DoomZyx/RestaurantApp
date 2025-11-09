import SupplierOrderModel from "../models/supplierOrder.js";
import { initiateSupplierCall, isTwilioConfigured } from "../Services/supplierCallService.js";

/**
 * Créer une nouvelle commande fournisseur et initier l'appel
 */
export async function createSupplierOrder(request, reply) {
  try {
    console.log("📦 Nouvelle commande fournisseur reçue");

    // Vérifier la configuration Twilio
    if (!isTwilioConfigured()) {
      return reply.code(500).send({
        success: false,
        error: "Configuration Twilio manquante. Vérifiez vos variables d'environnement."
      });
    }

    const orderData = request.body;

    // Validation des données
    if (!orderData.fournisseur || !orderData.fournisseur.telephone) {
      return reply.code(400).send({
        success: false,
        error: "Numéro de téléphone du fournisseur manquant"
      });
    }

    if (!orderData.ingredients || orderData.ingredients.length === 0) {
      return reply.code(400).send({
        success: false,
        error: "Liste des ingrédients manquante"
      });
    }

    // Déterminer le host public
    const publicHost = process.env.PUBLIC_HOST || request.headers.host;

    // Initier l'appel
    const result = await initiateSupplierCall(orderData, publicHost);

    return reply.code(201).send(result);

  } catch (error) {
    console.error("❌ Erreur création commande fournisseur:", error);
    return reply.code(500).send({
      success: false,
      error: "Erreur lors de la création de la commande",
      details: error.message
    });
  }
}

/**
 * Récupérer une commande spécifique
 */
export async function getSupplierOrder(request, reply) {
  try {
    const { orderId } = request.params;

    const order = await SupplierOrderModel.findById(orderId);

    if (!order) {
      return reply.code(404).send({
        success: false,
        error: "Commande non trouvée"
      });
    }

    return reply.send({
      success: true,
      order: order
    });

  } catch (error) {
    console.error("❌ Erreur récupération commande:", error);
    return reply.code(500).send({
      success: false,
      error: "Erreur lors de la récupération de la commande"
    });
  }
}

/**
 * Récupérer toutes les commandes d'un fournisseur
 */
export async function getSupplierOrders(request, reply) {
  try {
    const { fournisseurId } = request.params;

    const orders = await SupplierOrderModel.find({ "fournisseur.id": fournisseurId })
      .sort({ createdAt: -1 })
      .limit(50);

    return reply.send({
      success: true,
      orders: orders
    });

  } catch (error) {
    console.error("❌ Erreur récupération commandes:", error);
    return reply.code(500).send({
      success: false,
      error: "Erreur lors de la récupération des commandes"
    });
  }
}

/**
 * Récupérer toutes les commandes avec filtres
 */
export async function getAllSupplierOrders(request, reply) {
  try {
    const { statut, limit = 50 } = request.query;

    const filter = {};
    if (statut) {
      filter.statut = statut;
    }

    const orders = await SupplierOrderModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    return reply.send({
      success: true,
      orders: orders,
      total: orders.length
    });

  } catch (error) {
    console.error("❌ Erreur récupération toutes commandes:", error);
    return reply.code(500).send({
      success: false,
      error: "Erreur lors de la récupération des commandes"
    });
  }
}

/**
 * Mettre à jour une commande (manuellement)
 */
export async function updateSupplierOrder(request, reply) {
  try {
    const { orderId } = request.params;
    const updateData = request.body;

    const order = await SupplierOrderModel.findByIdAndUpdate(
      orderId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!order) {
      return reply.code(404).send({
        success: false,
        error: "Commande non trouvée"
      });
    }

    return reply.send({
      success: true,
      order: order
    });

  } catch (error) {
    console.error("❌ Erreur mise à jour commande:", error);
    return reply.code(500).send({
      success: false,
      error: "Erreur lors de la mise à jour"
    });
  }
}

/**
 * Supprimer une commande
 */
export async function deleteSupplierOrder(request, reply) {
  try {
    const { orderId } = request.params;

    const order = await SupplierOrderModel.findByIdAndDelete(orderId);

    if (!order) {
      return reply.code(404).send({
        success: false,
        error: "Commande non trouvée"
      });
    }

    return reply.send({
      success: true,
      message: "Commande supprimée avec succès"
    });

  } catch (error) {
    console.error("❌ Erreur suppression commande:", error);
    return reply.code(500).send({
      success: false,
      error: "Erreur lors de la suppression"
    });
  }
}

export default {
  createSupplierOrder,
  getSupplierOrder,
  getSupplierOrders,
  getAllSupplierOrders,
  updateSupplierOrder,
  deleteSupplierOrder
};






