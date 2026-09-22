# Quiz noté — site statique (GitHub Pages) + backend Google Sheets + admin en ligne

Un lien public (type `https://ton-nom.github.io/mon-quiz/`) que tu partages à tes
étudiants, sans compte requis. Chaque réponse est notée et enregistrée
automatiquement dans un Google Sheet. Et surtout : **une fois déployé, tu ne
touches plus jamais à GitHub** — tout se gère depuis une page d'administration
protégée par mot de passe (`admin.html`), qui écrit directement dans le Google
Sheet : questions, propositions, bonne réponse, durée du quiz, nom du module.

## Fichiers
- `index.html`, `style.css`, `app.js` — la page que voient les étudiants (aucune question n'y est écrite en dur : tout est chargé depuis le Google Sheet à chaque ouverture)
- `admin.html`, `admin.js` — **la page d'administration** (questions, réglages)
- `config.js` — une seule chose à régler une fois : l'URL du script Google
- `Code.gs` — le backend à coller dans Google Sheets (étape 1 ci-dessous)

## Étape 1 — Créer le Google Sheet (le backend)

1. Va sur https://sheets.google.com, crée une feuille, nomme-la par ex. "Quiz — données".
2. Menu **Extensions > Apps Script**.
3. Supprime le code par défaut, colle le contenu de `Code.gs` fourni ici. **Enregistre**.
4. Dans la liste déroulante des fonctions (en haut, à côté de "Déboguer"), choisis
   **setAdminPassword**, remplace `'MonNouveauMotDePasse123'` dans le code par TON
   mot de passe, enregistre, puis clique **Exécuter** (autorise l'accès demandé).
   C'est ce mot de passe qui protège `admin.html`.
5. (Optionnel mais conseillé) Choisis la fonction **seedComputerVisionQuestions**
   dans la même liste déroulante et clique **Exécuter** : ça pré-remplit le quiz
   avec les 20 questions Computer Vision de départ, modifiables ensuite depuis
   `admin.html`. Si tu préfères repartir de zéro, saute cette étape.
6. Clique **Déployer > Nouveau déploiement**.
   - Type : **Application Web**
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
7. **Déployer**, autorise l'accès. Copie l'**URL de l'application Web**
   (`https://script.google.com/macros/s/XXXXXXXXXXXX/exec`).

## Étape 2 — Renseigner l'URL

Ouvre `config.js`, remplace `COLLE_ICI_TON_URL_GOOGLE_APPS_SCRIPT` par l'URL
copiée à l'étape 1. C'est la **seule** modification à faire dans les fichiers.

## Étape 3 — Mettre le site en ligne (une seule fois)

1. Sur https://github.com, crée un dépôt public, par ex. `mon-quiz`.
2. Mets tous ces fichiers à la racine du dépôt, **sauf `Code.gs` et `README.md`**
   (donc : `index.html`, `admin.html`, `style.css`, `config.js`, `app.js`, `admin.js`).
3. **Settings > Pages** → Source : *Deploy from a branch* → branche `main`, `/ (root)` → **Save**.
4. Après ~1 minute, ton site est en ligne : `https://TON-NOM.github.io/mon-quiz/`.

Le lien étudiant est la racine (`.../mon-quiz/`), celui d'administration est
`.../mon-quiz/admin.html` — garde ce deuxième lien pour toi seule.

## Étape 4 — Gérer le quiz au quotidien, sans GitHub

Ouvre `.../mon-quiz/admin.html`, entre ton mot de passe. Tu peux :
- Changer le **nom du module**, la **durée** et les **points par bonne réponse**.
- **Ajouter / modifier / supprimer** des questions, choisir la bonne réponse
  (le rond à gauche de chaque proposition), puis **« Enregistrer toutes les
  questions »**.

Chaque enregistrement est **immédiatement en ligne** pour tous les étudiants qui
ouvriront le lien ensuite — aucun redéploiement, aucune manipulation GitHub.

## Étape 5 — Récupérer les résultats

Ouvre le Google Sheet créé à l'étape 1, onglet **"Résultats"** : chaque
soumission y ajoute une ligne (Nom, Prénom, Classe, Identifiant, Note...), en
temps réel. Pour l'Excel : **Fichier > Télécharger > Microsoft Excel (.xlsx)**.

## Sécurité — ce que ça protège, et ce que ça ne protège pas

- Les bonnes réponses ne sont **jamais** envoyées au navigateur de l'étudiant :
  la correction se fait entièrement dans `Code.gs`, côté serveur.
- `admin.html` est protégé par mot de passe, mais c'est une protection légère
  (le mot de passe circule en clair dans l'URL de la requête) — largement
  suffisante pour un usage pédagogique, mais pas pour des données sensibles.
- **Un seul essai par identifiant, par appareil/navigateur** : mémorisé
  localement (pas infaillible — un étudiant déterminé pourrait retenter depuis
  un autre navigateur). Dis-moi si tu veux un blocage strict côté serveur
  (refuser un identifiant déjà présent dans l'onglet "Résultats").

## Créer un quiz pour un autre module

Duplique le dépôt GitHub (ou réutilise le même en vidant les questions depuis
`admin.html`) et crée un **nouveau** Google Sheet + déploiement pour ne pas
mélanger les résultats de deux modules. Renseigne la nouvelle URL dans
`config.js` de la copie.
# quiz
