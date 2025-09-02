# 🗄️ Configuration Supabase - Guide Complet

## 📋 Étape 1 : Créer le Projet Supabase (3 minutes)

### A. Création du Projet
1. Aller sur [supabase.com](https://supabase.com)
2. Cliquer **"New Project"**
3. Remplir :
   - **Nom** : `immobilier-platform`
   - **Mot de passe DB** : (générer un mot de passe fort)
   - **Région** : `West Europe (Ireland)`
4. Cliquer **"Create new project"**
5. ⏳ Attendre 2-3 minutes que le projet soit prêt

### B. Récupérer les Clés API
1. Une fois le projet créé, aller dans **"Settings" > "API"**
2. Copier et sauvegarder :
   ```
   Project URL: https://votre-projet.supabase.co
   anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## 🗃️ Étape 2 : Configurer la Base de Données (2 minutes)

### A. Exécuter la Migration SQL
1. Dans Supabase, aller dans **"SQL Editor"**
2. Cliquer **"New query"**
3. Copier-coller le contenu du fichier `supabase/migrations/complete_setup.sql`
4. Cliquer **"Run"** (▶️)
5. ✅ Vérifier qu'il n'y a pas d'erreurs

### B. Vérifier les Tables
1. Aller dans **"Table Editor"**
2. Vérifier que ces tables existent :
   - ✅ `agencies`
   - ✅ `users`
   - ✅ `owners`
   - ✅ `properties`
   - ✅ `tenants`
   - ✅ `contracts`
   - ✅ `announcements`
   - ✅ `messages`
   - ✅ `notifications`

## 🔐 Étape 3 : Configurer l'Authentification (1 minute)

### A. Paramètres d'Authentification
1. Aller dans **"Authentication" > "Settings"**
2. Dans **"Site URL"**, ajouter :
   ```
   http://localhost:3000
   https://votre-domaine.vercel.app
   ```
3. Dans **"Redirect URLs"**, ajouter :
   ```
   http://localhost:3000/**
   https://votre-domaine.vercel.app/**
   ```

### B. Désactiver la Confirmation Email (pour les tests)
1. Dans **"Authentication" > "Settings"**
2. Décocher **"Enable email confirmations"**
3. Cliquer **"Save"**

## 🚀 Étape 4 : Déployer sur Vercel (3 minutes)

### A. Préparer le Repository
1. Fork ce repository GitHub
2. Ou cloner et pousser vers votre repository

### B. Connecter à Vercel
1. Aller sur [vercel.com](https://vercel.com)
2. Se connecter avec GitHub
3. Cliquer **"New Project"**
4. Sélectionner votre repository
5. Cliquer **"Import"**

### C. Configurer les Variables d'Environnement
Dans **"Environment Variables"** :
```env
VITE_SUPABASE_URL=https://votre-projet.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### D. Déployer
1. Cliquer **"Deploy"**
2. ⏳ Attendre 2-3 minutes
3. 🎉 Votre site est en ligne !

## ✅ Étape 5 : Tester l'Application (2 minutes)

### A. Tester la Connexion
1. Aller sur votre URL Vercel
2. Tester avec un compte de démo :
   ```
   Email: marie.kouassi@agence.com
   Mot de passe: demo123
   ```

### B. Tester les Fonctionnalités
- ✅ Navigation entre les pages
- ✅ Création d'un propriétaire
- ✅ Ajout d'une propriété
- ✅ Gestion des locataires

## 🔧 Résolution de Problèmes

### Erreur "Invalid JWT"
```sql
-- Dans SQL Editor, exécuter :
SELECT auth.jwt();
-- Si erreur, recréer les politiques RLS
```

### Erreur "Permission Denied"
```sql
-- Vérifier que RLS est activé :
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

### Erreur de Build Vercel
1. Vérifier les variables d'environnement
2. Relancer le déploiement
3. Vérifier les logs dans Vercel

## 📞 Support

Si vous rencontrez des problèmes :
1. **Vérifier les logs** dans Supabase et Vercel
2. **Tester en local** d'abord
3. **Vérifier les permissions** RLS

---

**🎯 Temps total estimé : ~10 minutes**
**💰 Coût : Gratuit (limites généreuses)**
**🔄 Maintenance : Automatique**