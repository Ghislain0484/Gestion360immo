# 🏢 Gestion360Immo - Plateforme Collaborative de Gestion Immobilière

Une plateforme moderne pour la gestion collaborative de biens immobiliers entre agences en Côte d'Ivoire.

## 🌐 Informations de Production

- **Site web** : [www.gestion360immo.com](https://www.gestion360immo.com)
- **Email contact** : contact@gestion360immo.com
- **Support technique** : support@gestion360immo.com

## 🚀 Déploiement Rapide (5 minutes)

### 1. Créer un Projet Supabase
1. Aller sur [supabase.com](https://supabase.com)
2. Créer un nouveau projet
3. Copier l'URL du projet et la clé anonyme

### 2. Configurer la Base de Données
1. Dans Supabase SQL Editor
2. Exécuter le fichier `supabase/migrations/production_clean_setup.sql`
3. Vérifier que toutes les tables sont créées

### 3. Déployer sur Netlify
1. Connecter ce repository à Netlify
2. Configurer le domaine personnalisé : `www.gestion360immo.com`
3. Ajouter les variables d'environnement :
   ```
   VITE_SUPABASE_URL=votre_url_supabase
   VITE_SUPABASE_ANON_KEY=votre_cle_anonyme
   ```
4. Déployer

## 👨‍💼 Accès Administrateur

```
Email: gagohi06@gmail.com
Mot de passe: Jesus2025$
URL: www.gestion360immo.com/admin
```

## 🔧 Fonctionnalités

### ✅ Gestion Complète
- **Propriétaires** : Informations personnelles, titres de propriété
- **Propriétés** : Détails techniques, géolocalisation, images
- **Locataires** : Profils complets, historique de paiement
- **Contrats** : Location, vente, gestion avec calcul automatique des commissions

### ✅ Collaboration Inter-Agences
- **Annonces partagées** entre agences
- **Recherche d'historique** des locataires et propriétaires
- **Messagerie** inter-agences
- **Évaluation des profils** de paiement

### ✅ Classement Annuel des Agences
- **Volume des biens** (50%) : Propriétés + Contrats gérés
- **Taux de recouvrement** (30%) : Efficacité des encaissements
- **Satisfaction clients** (20%) : Propriétaires + Locataires
- **Récompenses** : Jusqu'à 2M FCFA + abonnements gratuits

### ✅ Outils Avancés
- **Calcul automatique** du standing des propriétés
- **Géolocalisation** des biens
- **Rapports et statistiques** en temps réel
- **Notifications** automatiques
- **Gestion des utilisateurs** et permissions

## 🛠️ Technologies

- **Frontend** : React 18 + TypeScript + Tailwind CSS
- **Backend** : Supabase (PostgreSQL + Auth + API)
- **Déploiement** : Netlify avec domaine personnalisé
- **Sécurité** : Row Level Security (RLS)

## 📊 Architecture

```
Frontend (React)
    ↓
Supabase API
    ↓
PostgreSQL + RLS + Triggers
    ↓
Calculs Automatiques + Notifications
```

## 🏆 Système de Classement

### **Critères de Classement Annuel :**

#### **1. Volume des Biens Immobiliers (50%)**
- Nombre de propriétés gérées
- Nombre de contrats signés
- Croissance du portefeuille
- Diversité des types de biens

#### **2. Taux de Recouvrement des Loyers (30%)**
- Ponctualité des encaissements
- Efficacité du recouvrement des impayés
- Réduction des retards de paiement
- Gestion proactive des créances

#### **3. Satisfaction Clients (20%)**

**Satisfaction Locataires (60% du score) :**
- Taux de renouvellement des baux (40%)
- Taux de plaintes inversé (30%)
- Durée moyenne de séjour (30%)

**Satisfaction Propriétaires (40% du score) :**
- Ponctualité des reversements (40%)
- Qualité de la communication (30%)
- Taux de rétention (30%)

### **Récompenses Annuelles :**
- **🥇 1ère place** : 2,000,000 FCFA + Abonnement gratuit 12 mois
- **🥈 2ème place** : 1,200,000 FCFA + 60% réduction 8 mois
- **🥉 3ème place** : 800,000 FCFA + 40% réduction 6 mois

## 🔒 Sécurité

- **Authentification** : Supabase Auth sécurisé
- **Autorisation** : Row Level Security (RLS)
- **Validation** : Côté client et serveur
- **HTTPS** : Certificats automatiques
- **Audit** : Traçabilité complète des actions

## 📱 Responsive Design

- **Mobile First** : Interface optimisée pour tous les écrans
- **Progressive Web App** : Installation possible sur mobile
- **Performance** : Chargement rapide et optimisé
- **Offline** : Fonctionnalités de base hors ligne

## 🌍 Spécificités Côte d'Ivoire

- **Titres de propriété** : TF, CPF, ACD, Attestations villageoises
- **Monnaie** : Franc CFA (XOF)
- **Géolocalisation** : Centrée sur les principales villes
- **Réglementation** : Conforme aux standards ivoiriens

## 📈 Évolutivité

- **Multi-tenant** : Support de plusieurs agences
- **API REST** : Intégration facile avec d'autres systèmes
- **Webhooks** : Notifications automatiques
- **Backup automatique** : Sauvegardes quotidiennes
- **Scalabilité** : Architecture cloud native

## 💰 Tarification

### **Plans d'Abonnement :**
- **Basique** : 25,000 FCFA/mois (jusqu'à 50 propriétés)
- **Premium** : 50,000 FCFA/mois (propriétés illimitées + collaboration)
- **Entreprise** : 100,000 FCFA/mois (tout Premium + API + support dédié)

### **Période d'Essai :**
- **30 jours gratuits** pour tous les plans
- **Accès complet** pendant la période d'essai
- **Support inclus** pendant l'essai

## 🆘 Support

- **Email support** : support@gestion360immo.com
- **Email commercial** : contact@gestion360immo.com
- **Documentation** : Complète et à jour
- **Formation** : Sessions disponibles sur demande
- **Communauté** : Support entre agences

## 📞 Contact

**Gestion360Immo**
- **Site** : www.gestion360immo.com
- **Email** : contact@gestion360immo.com
- **Support** : support@gestion360immo.com

---

**🎯 Développé avec ❤️ pour les professionnels de l'immobilier en Côte d'Ivoire**

**Version 1.0.0 - Production Ready**