import mongoose from 'mongoose';
import PricingModel from '../models/pricing.js';
import dotenv from 'dotenv';

dotenv.config();

async function fixProductIds() {
  try {
    // Connexion à MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connecté à MongoDB');

    // Récupérer la configuration
    const pricing = await PricingModel.findOne();
    if (!pricing) {
      console.log('❌ Aucune configuration trouvée');
      return;
    }

    console.log('🔍 Vérification des produits...');
    let modifiedCount = 0;

    // Parcourir toutes les catégories
    for (const [categorie, data] of Object.entries(pricing.menuPricing || {})) {
      if (data.produits && Array.isArray(data.produits)) {
        console.log(`📋 Catégorie: ${categorie} - ${data.produits.length} produits`);
        
        for (let i = 0; i < data.produits.length; i++) {
          const produit = data.produits[i];
          
          // Si le produit n'a pas d'_id, en créer un
          if (!produit._id) {
            produit._id = new mongoose.Types.ObjectId();
            modifiedCount++;
            console.log(`  ✅ ID ajouté au produit: ${produit.nom}`);
          } else {
            console.log(`  ⏭️  Produit OK: ${produit.nom} (ID: ${produit._id})`);
          }
        }
      }
    }

    if (modifiedCount > 0) {
      pricing.markModified('menuPricing');
      await pricing.save();
      console.log(`\n🎉 ${modifiedCount} produit(s) corrigé(s) et sauvegardé(s) !`);
    } else {
      console.log('\n✅ Tous les produits ont déjà un ID');
    }

    await mongoose.connection.close();
    console.log('✅ Connexion fermée');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

// Exécuter le script
fixProductIds();


