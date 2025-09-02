# ⚡ Déploiement Express - 5 Minutes

## 🎯 Objectif
Déployer la plateforme immobilière complète en 5 minutes chrono !

## 📋 Checklist Rapide

### ✅ Étape 1 : Supabase (2 min)
1. **Créer projet** sur [supabase.com](https://supabase.com)
2. **Copier** URL + clé anonyme
3. **SQL Editor** → Coller `complete_setup.sql` → **Run**

### ✅ Étape 2 : Vercel (2 min)
1. **Fork** ce repository
2. **Nouveau projet** sur [vercel.com](https://vercel.com)
3. **Variables d'environnement** :
   ```
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
4. **Deploy**

### ✅ Étape 3 : Test (1 min)
1. **Ouvrir** l'URL Vercel
2. **Se connecter** avec `marie.kouassi@agence.com` / `demo123`
3. **Tester** création d'un propriétaire

## 🚨 Si Problème

### Erreur SQL
```sql
-- Vérifier les tables créées
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';
```

### Erreur Vercel
- Vérifier les variables d'environnement
- Relancer le build

### Erreur Permissions
- RLS activé automatiquement
- Politiques permissives configurées

## 🎉 Résultat

**✅ Plateforme complète fonctionnelle**
- Gestion propriétaires/locataires/propriétés
- Collaboration inter-agences
- Rapports et statistiques
- Interface responsive

**💰 Coût : Gratuit**
**⏱️ Temps : 5 minutes**
**🔧 Maintenance : Automatique**