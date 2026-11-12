// =============================================
// MODULE ARCHIVES UNIVERSITAIRES
// =============================================

const BUCKET_ARCHIVES = "archives";

let toutesLesArchives = [];

// =============================================
// VERIFICATION DU FICHIER
// =============================================

function verifierFichierArchive(fichier) {

if (!fichier) {
    return "Veuillez sélectionner un fichier.";
}

const extensionsAutorisees = [
    "pdf", "doc", "docx", "ppt", "pptx"
];

const extension = fichier.name.split(".").pop().toLowerCase();

if (!extensionsAutorisees.includes(extension)) {
    return "Format non autorisé.";
}

if (fichier.size > 20 * 1024 * 1024) {
    return "Le fichier dépasse la limite de 20 Mo.";
}

if (fichier.size === 0) {
    return "Le fichier est vide.";
}

return null;

}

// =============================================
// PUBLICATION D'UNE ARCHIVE
// =============================================

async function publierArchive(event) {

if (event) event.preventDefault();

if (!profil || profil.role !== "admin") {
    afficherToast("Accès réservé à l'administrateur.", "erreur");
    return;
}

const titre = document.getElementById("titreArchive").value.trim();

const cours = document.getElementById("coursArchive").value.trim();

const typeDocument = document.getElementById("typeArchive").value;

const annee = document.getElementById("anneeArchive").value.trim();

const description = document.getElementById("descriptionArchive").value.trim();

const inputFichier = document.getElementById("fichierArchive");

const fichier = inputFichier.files[0];

const bouton = document.getElementById("boutonArchive");

const message = document.getElementById("messageArchive");

if (!titre || !cours || !typeDocument || !annee) {
    afficherMessage(message, "Remplissez tous les champs obligatoires.", "erreur");
    return;
}

const erreurFichier = verifierFichierArchive(fichier);

if (erreurFichier) {
    afficherMessage(message, erreurFichier, "erreur");
    return;
}

bouton.disabled = true;

afficherMessage(message, "Publication en cours...");

let cheminFichier = null;

try {

    const extension = fichier.name.split(".").pop().toLowerCase();

    cheminFichier = crypto.randomUUID() + "." + extension;

    // ENVOYER LE FICHIER VERS STORAGE

    const { error: erreurUpload } = await client.storage
        .from(BUCKET_ARCHIVES)
        .upload(cheminFichier, fichier, {
            cacheControl: "3600",
            upsert: false,
            contentType: fichier.type || "application/octet-stream"
        });

    if (erreurUpload) throw erreurUpload;


    // ENREGISTRER LES INFORMATIONS

    const { error: erreurInsertion } = await client
        .from("archives")
        .insert({
            titre: titre,
            description: description || null,
            cours: cours,
            type_document: typeDocument,
            annee_academique: annee,
            nom_fichier: fichier.name,
            chemin_fichier: cheminFichier,
            type_fichier: fichier.type || extension,
            taille_fichier: fichier.size,
            publie_par: profil.authId
        });

    if (erreurInsertion) {

        await client.storage
            .from(BUCKET_ARCHIVES)
            .remove([cheminFichier]);

        cheminFichier = null;

        throw erreurInsertion;
    }

    document.getElementById("formulaireArchives").reset();

    afficherMessage(
        message,
        "Document publié avec succès !",
        "succes"
    );

    afficherToast("Nouvelle archive publiée.", "succes");

    await chargerArchives("admin");

    if (typeof chargerStatistiques === "function") {
        chargerStatistiques("admin");
    }

} catch (erreur) {

    console.error("Publication archive :", erreur);

    afficherMessage(
        message,
        "Impossible de publier le document. Vérifiez les autorisations Supabase.",
        "erreur"
    );

} finally {

    bouton.disabled = false;

}

}

// =============================================
// CHARGER LES ARCHIVES
// =============================================

async function chargerArchives(role) {

if (!profil) return;

const admin = role === "admin";

const liste = document.getElementById(
    admin ? "listeArchivesAdmin" : "listeArchivesEtudiant"
);

if (!liste) return;

liste.textContent = "Chargement des archives...";

try {

    const { data, error } = await client
        .from("archives")
        .select("*")
        .order("date_publication", { ascending: false });

    if (error) throw error;

    toutesLesArchives = data || [];

    remplirFiltreAnnees();

    const recherche = document.getElementById("rechercheArchives");

    if (recherche) recherche.value = "";

    const filtreType = document.getElementById("filtreTypeArchive");

    if (filtreType) filtreType.value = "";

    const filtreAnnee = document.getElementById("filtreAnneeArchive");

    if (filtreAnnee) filtreAnnee.value = "";

    afficherArchives(toutesLesArchives, liste, admin);

} catch (erreur) {

    console.error("Chargement archives :", erreur);

    liste.textContent = "Impossible de charger les archives.";

}

}

// =============================================
// AFFICHER LES ARCHIVES
// =============================================

function afficherArchives(documents, liste, admin) {

if (!liste) return;

liste.innerHTML = "";

if (!documents || documents.length === 0) {

    const vide = document.createElement("p");

    vide.className = "empty-state";

    vide.textContent = "Aucune archive disponible.";

    liste.appendChild(vide);

    return;
}

documents.forEach(function(archive) {

    const carte = document.createElement("div");

    carte.className = "archive-card";

    const informations = document.createElement("div");

    informations.className = "archive-informations";

    const titre = document.createElement("h4");

    titre.textContent = archive.titre;

    const cours = document.createElement("p");

    cours.textContent = "Cours : " + archive.cours;

    const description = document.createElement("p");

    description.textContent =
        archive.description || "Aucune description.";

    const type = document.createElement("span");

    type.className = "archive-type";

    type.textContent = archive.type_document;

    const annee = document.createElement("small");

    annee.textContent = "Année académique : " + archive.annee_academique;

    const fichier = document.createElement("small");

    fichier.textContent =
        archive.nom_fichier + " — " +
        formaterTaille(archive.taille_fichier);

    const date = document.createElement("small");

    date.textContent =
        "Publié le " +
        new Date(archive.date_publication).toLocaleDateString("fr-FR");

    informations.appendChild(titre);
    informations.appendChild(cours);
    informations.appendChild(description);
    informations.appendChild(type);
    informations.appendChild(annee);
    informations.appendChild(fichier);
    informations.appendChild(date);

    const actions = document.createElement("div");

    actions.className = "archive-actions";

    const boutonTelecharger = document.createElement("button");

    boutonTelecharger.type = "button";
    boutonTelecharger.className = "btn-primary";
    boutonTelecharger.textContent = "Télécharger";

    boutonTelecharger.addEventListener("click", function() {
        telechargerArchive(archive);
    });

    actions.appendChild(boutonTelecharger);

    if (admin) {

        const boutonSupprimer = document.createElement("button");

        boutonSupprimer.type = "button";
        boutonSupprimer.className = "btn-refuser";
        boutonSupprimer.textContent = "Supprimer";

        boutonSupprimer.addEventListener("click", function() {
            supprimerArchive(archive.id);
        });

        actions.appendChild(boutonSupprimer);
    }

    carte.appendChild(informations);
    carte.appendChild(actions);

    liste.appendChild(carte);

});

}

// =============================================
// TELECHARGEMENT
// =============================================

async function telechargerArchive(archive) {

if (!profil) return;

try {

    const { data, error } = await client.storage
        .from(BUCKET_ARCHIVES)
        .createSignedUrl(
            archive.chemin_fichier,
            60,
            {
                download: archive.nom_fichier
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

    console.error("Téléchargement archive :", erreur);

    afficherToast(
        "Impossible de télécharger ce document.",
        "erreur"
    );

}

}

// =============================================
// SUPPRESSION
// =============================================

async function supprimerArchive(id) {

if (!profil || profil.role !== "admin") {
    afficherToast("Action réservée à l'administrateur.", "erreur");
    return;
}

if (!confirm("Voulez-vous vraiment supprimer cette archive ?")) {
    return;
}

const archive = toutesLesArchives.find(function(element) {
    return element.id === id;
});

if (!archive) return;

try {

    // Supprimer les informations de la table

    const { error: erreurSuppression } = await client
        .from("archives")
        .delete()
        .eq("id", id);

    if (erreurSuppression) throw erreurSuppression;

    // Supprimer le fichier de Storage

    const { error: erreurFichier } = await client.storage
        .from(BUCKET_ARCHIVES)
        .remove([archive.chemin_fichier]);

    if (erreurFichier) {
        console.error("Fichier non supprimé :", erreurFichier);
    }

    afficherToast("Archive supprimée.", "succes");

    await chargerArchives("admin");

    if (typeof chargerStatistiques === "function") {
        chargerStatistiques("admin");
    }

} catch (erreur) {

    console.error("Suppression archive :", erreur);

    afficherToast(
        "Impossible de supprimer cette archive.",
        "erreur"
    );

}

}

// =============================================
// REMPLIR LE FILTRE DES ANNEES
// =============================================

function remplirFiltreAnnees() {

const select = document.getElementById("filtreAnneeArchive");

if (!select) return;

const ancienneValeur = select.value;

const annees = [];

toutesLesArchives.forEach(function(archive) {

    if (
        archive.annee_academique &&
        !annees.includes(archive.annee_academique)
    ) {
        annees.push(archive.annee_academique);
    }

});

annees.sort().reverse();

select.innerHTML = "";

const optionToutes = document.createElement("option");

optionToutes.value = "";
optionToutes.textContent = "Toutes les années";

select.appendChild(optionToutes);

annees.forEach(function(annee) {

    const option = document.createElement("option");

    option.value = annee;
    option.textContent = annee;

    select.appendChild(option);

});

if (annees.includes(ancienneValeur)) {
    select.value = ancienneValeur;
}

}

// =============================================
// FILTRER LES ARCHIVES
// =============================================

function filtrerArchives() {

const recherche = document
    .getElementById("rechercheArchives")
    .value
    .trim()
    .toLowerCase();

const type = document.getElementById("filtreTypeArchive").value;

const annee = document.getElementById("filtreAnneeArchive").value;

const resultats = toutesLesArchives.filter(function(archive) {

    const titre = (archive.titre || "").toLowerCase();

    const cours = (archive.cours || "").toLowerCase();

    const description = (archive.description || "").toLowerCase();

    const correspondRecherche =
        titre.includes(recherche) ||
        cours.includes(recherche) ||
        description.includes(recherche);

    const correspondType =
        !type || archive.type_document === type;

    const correspondAnnee =
        !annee || archive.annee_academique === annee;

    return (
        correspondRecherche &&
        correspondType &&
        correspondAnnee
    );

});

const liste = document.getElementById("listeArchivesEtudiant");

afficherArchives(resultats, liste, false);

}