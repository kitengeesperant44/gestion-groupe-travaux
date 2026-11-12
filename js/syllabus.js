// =============================================
// MODULE SYLLABUS — GESTION DES DOCUMENTS
// =============================================

const BUCKET_SYLLABUS = "syllabus";

let tousLesSyllabus = [];

// =============================================
// VERIFICATION DU FICHIER
// =============================================

function verifierFichierSyllabus(fichier) {

if (!fichier) {
    return "Veuillez sélectionner un fichier.";
}

const extensionsAutorisees = [
    "pdf", "doc", "docx", "ppt", "pptx"
];

const extension = fichier.name.split(".").pop().toLowerCase();

if (!extensionsAutorisees.includes(extension)) {
    return "Format non autorisé. Utilisez PDF, Word ou PowerPoint.";
}

const tailleMax = 20 * 1024 * 1024;

if (fichier.size > tailleMax) {
    return "Le fichier dépasse la limite de 20 Mo.";
}

if (fichier.size === 0) {
    return "Le fichier est vide.";
}

return null;

}

// =============================================
// PUBLICATION D'UN SYLLABUS
// =============================================

async function publierSyllabus(event) {

if (event) event.preventDefault();

if (!profil || profil.role !== "admin") {
    afficherToast("Accès réservé à l'administrateur.", "erreur");
    return;
}

const titre = document.getElementById("titreSyllabus").value.trim();

const description = document.getElementById("descriptionSyllabus").value.trim();

const inputFichier = document.getElementById("fichierSyllabus");

const fichier = inputFichier.files[0];

const bouton = document.getElementById("boutonSyllabus");

const message = document.getElementById("messageSyllabus");

if (!titre) {
    afficherMessage(message, "Veuillez saisir le titre du syllabus.", "erreur");
    return;
}

const erreurFichier = verifierFichierSyllabus(fichier);

if (erreurFichier) {
    afficherMessage(message, erreurFichier, "erreur");
    return;
}

bouton.disabled = true;

afficherMessage(message, "Publication en cours...");

let cheminFichier = null;

try {

    // Création d'un nom de fichier unique

    const extension = fichier.name.split(".").pop().toLowerCase();

    const identifiant = crypto.randomUUID();

    cheminFichier = identifiant + "." + extension;

    // ENVOI VERS SUPABASE STORAGE

    const { data: fichierEnvoye, error: erreurUpload } =
        await client.storage
            .from(BUCKET_SYLLABUS)
            .upload(cheminFichier, fichier, {
                cacheControl: "3600",
                upsert: false,
                contentType: fichier.type || "application/octet-stream"
            });

    if (erreurUpload) throw erreurUpload;

    // ENREGISTREMENT DES INFORMATIONS DANS LA TABLE

    const { error: erreurInsertion } = await client
        .from("syllabus")
        .insert({
            titre: titre,
            description: description || null,
            nom_fichier: fichier.name,
            chemin_fichier: cheminFichier,
            type_fichier: fichier.type || extension,
            taille_fichier: fichier.size,
            publie_par: profil.authId
        });

    if (erreurInsertion) {

        // Supprimer le fichier si l'enregistrement échoue

        await client.storage
            .from(BUCKET_SYLLABUS)
            .remove([cheminFichier]);

        cheminFichier = null;

        throw erreurInsertion;
    }

    // REINITIALISATION DU FORMULAIRE

    document.getElementById("formulaireSyllabus").reset();

    afficherMessage(
        message,
        "Syllabus publié avec succès !",
        "succes"
    );

    afficherToast("Nouveau syllabus publié.", "succes");

    await chargerSyllabus("admin");

    // Actualiser les statistiques si la fonction existe

    if (typeof chargerStatistiques === "function") {
        chargerStatistiques("admin");
    }

} catch (erreur) {

    console.error("Publication syllabus :", erreur);

    afficherMessage(
        message,
        "Impossible de publier le syllabus. Vérifiez votre connexion et les autorisations Supabase.",
        "erreur"
    );

} finally {

    bouton.disabled = false;

}

}

// =============================================
// CHARGEMENT DES SYLLABUS
// =============================================

async function chargerSyllabus(role) {

if (!profil) return;

const admin = role === "admin";

const liste = document.getElementById(
    admin ? "listeSyllabusAdmin" : "listeSyllabusEtudiant"
);

if (!liste) return;

liste.textContent = "Chargement des documents...";

try {

    const { data, error } = await client
        .from("syllabus")
        .select("*")
        .order("date_publication", { ascending: false });

    if (error) throw error;

    tousLesSyllabus = data || [];

    afficherSyllabus(tousLesSyllabus, liste, admin);

} catch (erreur) {

    console.error("Chargement syllabus :", erreur);

    liste.textContent = "Impossible de charger les syllabus.";

}

}

// =============================================
// AFFICHAGE DES DOCUMENTS
// =============================================

function afficherSyllabus(documents, liste, admin) {

liste.innerHTML = "";

if (!documents || documents.length === 0) {

    const vide = document.createElement("p");

    vide.className = "empty-state";

    vide.textContent = "Aucun syllabus disponible pour le moment.";

    liste.appendChild(vide);

    return;
}

documents.forEach(function(documentSyllabus) {

    const carte = document.createElement("div");

    carte.className = "syllabus-card";

    const informations = document.createElement("div");

    informations.className = "syllabus-informations";

    const titre = document.createElement("h4");

    titre.textContent = documentSyllabus.titre;

    const description = document.createElement("p");

    description.textContent =
        documentSyllabus.description || "Aucune description.";

    const fichier = document.createElement("small");

    fichier.textContent =
        documentSyllabus.nom_fichier +
        " — " +
        formaterTaille(documentSyllabus.taille_fichier);

    const date = document.createElement("small");

    date.textContent =
        "Publié le " +
        new Date(documentSyllabus.date_publication).toLocaleDateString("fr-FR");

    informations.appendChild(titre);
    informations.appendChild(description);
    informations.appendChild(fichier);
    informations.appendChild(date);

    const actions = document.createElement("div");

    actions.className = "syllabus-actions";

    const boutonTelecharger = document.createElement("button");

    boutonTelecharger.type = "button";
    boutonTelecharger.className = "btn-primary";
    boutonTelecharger.textContent = "Télécharger";

    boutonTelecharger.addEventListener("click", function() {
        telechargerSyllabus(documentSyllabus);
    });

    actions.appendChild(boutonTelecharger);

    if (admin) {

        const boutonSupprimer = document.createElement("button");

        boutonSupprimer.type = "button";
        boutonSupprimer.className = "btn-refuser";
        boutonSupprimer.textContent = "Supprimer";

        boutonSupprimer.addEventListener("click", function() {
            supprimerSyllabus(documentSyllabus.id);
        });

        actions.appendChild(boutonSupprimer);
    }

    carte.appendChild(informations);
    carte.appendChild(actions);

    liste.appendChild(carte);

});

}

// =============================================
// TELECHARGEMENT D'UN SYLLABUS
// =============================================

async function telechargerSyllabus(documentSyllabus) {

if (!profil) return;

try {

    const { data, error } = await client.storage
        .from(BUCKET_SYLLABUS)
        .createSignedUrl(
            documentSyllabus.chemin_fichier,
            60,
            {
                download: documentSyllabus.nom_fichier
            }
        );

    if (error) throw error;

    const lien = document.createElement("a");

    lien.href = data.signedUrl;
    lien.target = "_blank";
    lien.rel = "noopener noreferrer";

    document.body.appendChild(lien);

    lien.click();

    lien.remove();

} catch (erreur) {

    console.error("Téléchargement syllabus :", erreur);

    afficherToast(
        "Impossible de télécharger ce document.",
        "erreur"
    );

}

}

// =============================================
// SUPPRESSION D'UN SYLLABUS
// =============================================

async function supprimerSyllabus(id) {

if (!profil || profil.role !== "admin") {
    afficherToast("Action réservée à l'administrateur.", "erreur");
    return;
}

const confirmation = confirm(
    "Voulez-vous vraiment supprimer ce syllabus ?"
);

if (!confirmation) return;

const documentSyllabus = tousLesSyllabus.find(function(document) {
    return document.id === id;
});

if (!documentSyllabus) return;

try {

    // Suppression des informations dans la base

    const { error: erreurSuppression } = await client
        .from("syllabus")
        .delete()
        .eq("id", id);

    if (erreurSuppression) throw erreurSuppression;

    // Suppression du fichier dans Storage

    const { error: erreurFichier } = await client.storage
        .from(BUCKET_SYLLABUS)
        .remove([documentSyllabus.chemin_fichier]);

    if (erreurFichier) {
        console.error("Fichier non supprimé de Storage :", erreurFichier);
    }

    afficherToast("Syllabus supprimé.", "succes");

    await chargerSyllabus("admin");

    if (typeof chargerStatistiques === "function") {
        chargerStatistiques("admin");
    }

} catch (erreur) {

    console.error("Suppression syllabus :", erreur);

    afficherToast(
        "Impossible de supprimer ce syllabus.",
        "erreur"
    );

}

}

// =============================================
// RECHERCHE DES SYLLABUS
// =============================================

function filtrerSyllabus() {

const recherche = document
    .getElementById("rechercheSyllabus")
    .value
    .trim()
    .toLowerCase();

const resultats = tousLesSyllabus.filter(function(documentSyllabus) {

    const titre = (documentSyllabus.titre || "").toLowerCase();

    const description = (documentSyllabus.description || "").toLowerCase();

    return titre.includes(recherche) || description.includes(recherche);

});

const liste = document.getElementById("listeSyllabusEtudiant");

afficherSyllabus(resultats, liste, false);

}

// =============================================
// FORMATER LA TAILLE DES FICHIERS
// =============================================

function formaterTaille(octets) {

if (!octets) return "Taille inconnue";

if (octets < 1024) {
    return octets + " octets";
}

if (octets < 1024 * 1024) {
    return (octets / 1024).toFixed(1) + " Ko";
}

return (octets / (1024 * 1024)).toFixed(2) + " Mo";

}