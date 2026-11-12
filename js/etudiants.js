// ============================================
// STOCKAGE DES ETUDIANTS POUR L'ADMINISTRATION
// ============================================

let tousLesEtudiants = [];

// ============================================
// CREATION ETUDIANT
// ============================================

async function creerEtudiant() {

const matricule = document.getElementById("nouveauMatricule").value.trim();
const nom = document.getElementById("nouveauNom").value.trim();
const mot_de_passe = document.getElementById("nouveauPassword").value;

const message = document.getElementById("messageCreation");
const bouton = document.getElementById("boutonCreation");

if (!matricule || !nom || !mot_de_passe) {
    afficherMessage(message, "Tous les champs sont obligatoires.", "erreur");
    return;
}

if (mot_de_passe.length < 8) {
    afficherMessage(message, "Le mot de passe doit contenir au moins 8 caractères.", "erreur");
    return;
}

bouton.disabled = true;
afficherMessage(message, "Création en cours...");

try {

    const { data, error } = await client.functions.invoke(
        "creer-etudiant",
        {
            body: {
                matricule: matricule,
                nom: nom,
                mot_de_passe: mot_de_passe
            }
        }
    );

    if (error || !data || !data.succes) {
        afficherMessage(
            message,
            await lireErreurFonction(error, data, "Erreur pendant la création."),
            "erreur"
        );
        return;
    }

    afficherMessage(message, "Étudiant créé avec succès !", "succes");

    document.getElementById("nouveauMatricule").value = "";
    document.getElementById("nouveauNom").value = "";
    document.getElementById("nouveauPassword").value = "";

    await chargerEtudiants("listeAdmin", "nombreAdmin");

} catch (erreur) {

    console.error(erreur);
    afficherMessage(message, "Erreur pendant la création.", "erreur");

} finally {

    bouton.disabled = false;

}

}

// ============================================
// CHARGER LA LISTE DES ETUDIANTS
// ============================================

async function chargerEtudiants(idListe, idNombre) {

const liste = document.getElementById(idListe);
const nombre = document.getElementById(idNombre);

if (!liste || !nombre) return;

liste.textContent = "Chargement...";

// ESPACE ADMINISTRATEUR
if (idListe === "listeAdmin") {

    const { data, error } = await client
        .from("etudiants")
        .select("auth_id, matricule, nom")
        .eq("role", "etudiant")
        .order("nom");

    if (error) {
        console.error(error);
        liste.textContent = "Impossible de charger la liste. Réessayez.";
        return;
    }

    tousLesEtudiants = data || [];

    nombre.textContent =
        tousLesEtudiants.length + " étudiant(s) enregistré(s)";

    afficherEtudiantsAdmin(tousLesEtudiants);

    return;
}

// ESPACE ETUDIANT
const { data, error } = await client
    .from("etudiants")
    .select("matricule, nom")
    .eq("role", "etudiant")
    .order("nom");

if (error) {
    console.error(error);
    liste.textContent = "Impossible de charger la liste. Réessayez.";
    return;
}

nombre.textContent = data.length + " étudiant(s) enregistré(s)";

afficherListeSimple(liste, data);

}

// ============================================
// AFFICHAGE ADMINISTRATEUR
// ============================================

function afficherEtudiantsAdmin(etudiants) {

const liste = document.getElementById("listeAdmin");

liste.innerHTML = "";

if (etudiants.length === 0) {
    liste.textContent = "Aucun étudiant trouvé.";
    return;
}

etudiants.forEach(function(etudiant) {

    const ligne = document.createElement("div");
    ligne.className = "etudiant";

    const nomEtudiant = document.createElement("strong");
    nomEtudiant.textContent = etudiant.nom;

    const matricule = document.createElement("div");
    matricule.className = "small";
    matricule.textContent = "Matricule : " + etudiant.matricule;

    const boutonModifier = document.createElement("button");
    boutonModifier.className = "btn-secondary";
    boutonModifier.textContent = "Modifier";

    boutonModifier.onclick = function() {
        modifierEtudiant(etudiant, boutonModifier);
    };

    ligne.appendChild(nomEtudiant);
    ligne.appendChild(matricule);
    ligne.appendChild(boutonModifier);

    liste.appendChild(ligne);

});

}

// ============================================
// AFFICHAGE SIMPLE POUR LES ETUDIANTS
// ============================================

function afficherListeSimple(liste, etudiants) {

liste.innerHTML = "";

if (!etudiants || etudiants.length === 0) {
    liste.textContent = "Aucun étudiant enregistré.";
    return;
}

etudiants.forEach(function(etudiant) {

    const ligne = document.createElement("div");
    ligne.className = "etudiant";

    const nom = document.createElement("strong");
    nom.textContent = etudiant.nom;

    const matricule = document.createElement("div");
    matricule.className = "small";
    matricule.textContent = "Matricule : " + etudiant.matricule;

    ligne.appendChild(nom);
    ligne.appendChild(matricule);

    liste.appendChild(ligne);

});

}

// ============================================
// RECHERCHE PAR NOM OU MATRICULE
// ============================================

function filtrerEtudiants() {

const champ = document.getElementById("rechercheEtudiant");

if (!champ) return;

const recherche = champ.value.trim().toLowerCase();

const resultats = tousLesEtudiants.filter(function(etudiant) {

    return etudiant.nom.toLowerCase().includes(recherche) ||
        etudiant.matricule.toLowerCase().includes(recherche);

});

afficherEtudiantsAdmin(resultats);

document.getElementById("nombreAdmin").textContent =
    resultats.length + " résultat(s)";

}

// ============================================
// MODIFIER UN ETUDIANT
// ============================================

async function modifierEtudiant(etudiant, bouton) {

const nouveauNom = prompt(
    "Entrez le nouveau nom complet :",
    etudiant.nom
);

if (nouveauNom === null) return;

const nouveauMatricule = prompt(
    "Entrez le nouveau matricule :",
    etudiant.matricule
);

if (nouveauMatricule === null) return;

const nom = nouveauNom.trim();
const matricule = nouveauMatricule.trim();

if (!nom || !matricule) {
    alert("Le nom et le matricule sont obligatoires.");
    return;
}

if (nom.length > 150 || matricule.length > 30) {
    alert("Le nom ou le matricule est trop long.");
    return;
}

if (nom === etudiant.nom && matricule === etudiant.matricule) {
    alert("Aucune modification détectée.");
    return;
}

const confirmation = confirm(
    "Confirmer la modification de " + etudiant.nom + " ?\n\n" +
    "Nouveau nom : " + nom + "\n" +
    "Nouveau matricule : " + matricule
);

if (!confirmation) return;

bouton.disabled = true;
bouton.textContent = "Modification...";

try {

    const { data, error } = await client.functions.invoke(
        "modifier-etudiant",
        {
            body: {
                auth_id: etudiant.auth_id,
                nom: nom,
                matricule: matricule
            }
        }
    );

    if (error || !data || !data.succes) {

        alert(
            await lireErreurFonction(
                error,
                data,
                "La modification a échoué."
            )
        );

        return;
    }

    alert("Étudiant modifié avec succès !");

    // Actualiser la liste
    await chargerEtudiants("listeAdmin", "nombreAdmin");

} catch (erreur) {

    console.error(erreur);
    alert("Une erreur est survenue pendant la modification.");

} finally {

    bouton.disabled = false;
    bouton.textContent = "Modifier";

}

}