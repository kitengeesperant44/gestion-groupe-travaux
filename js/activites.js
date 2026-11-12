// GESTION DES ACTIVITES

let intervalleChrono = null;

let activiteActuelle = { id: null, nombreMax: null, titre: null };

// OUTIL : CREER UN ELEMENT

function el(balise, classe, texte) {
const element = document.createElement(balise);

if (classe) element.className = classe;
if (texte !== undefined && texte !== null) {
    element.textContent = texte;
}

return element;

}

// CHARGER LES ETUDIANTS POUR LES EXCLUSIONS

async function chargerEtudiantsPourExclusion() {

if (!profil || profil.role !== "admin") return;

const conteneur = document.getElementById("listeEtudiantsExclusion");
const compteur = document.getElementById("nombreEtudiantsExclus");

if (!conteneur) return;

conteneur.textContent = "Chargement des étudiants...";

try {

    const { data, error } = await client
        .from("etudiants")
        .select("auth_id, nom, matricule")
        .eq("role", "etudiant")
        .not("auth_id", "is", null)
        .order("nom", { ascending: true });

    if (error) throw error;

    if (!profil || profil.role !== "admin") return;

    conteneur.innerHTML = "";

    if (!data || data.length === 0) {
        conteneur.textContent = "Aucun étudiant disponible.";
        return;
    }

    data.forEach(function(etudiant) {

        const ligne = el("label", "ligne-exclusion");

        const checkbox = el("input");
        checkbox.type = "checkbox";
        checkbox.name = "etudiantsExclus";
        checkbox.value = etudiant.auth_id;

        checkbox.addEventListener("change", actualiserNombreExclus);

        const texte = el(
            "span",
            null,
            etudiant.nom + " (" + etudiant.matricule + ")"
        );

        ligne.appendChild(checkbox);
        ligne.appendChild(texte);

        conteneur.appendChild(ligne);

    });

    conteneur.dataset.chargee = "oui";

    if (compteur) {
        compteur.textContent = "Aucun étudiant sélectionné.";
    }

} catch (erreur) {

    console.error("Erreur chargement exclusions :", erreur);

    conteneur.textContent =
        "Impossible de charger les étudiants. Réessayez.";

}

}

// ACTUALISER LE NOMBRE D'ETUDIANTS EXCLUS

function actualiserNombreExclus() {

const compteur = document.getElementById("nombreEtudiantsExclus");

if (!compteur) return;

const cases = document.querySelectorAll(
    'input[name="etudiantsExclus"]:checked'
);

const nombre = cases.length;

compteur.textContent = nombre === 0
    ? "Aucun étudiant sélectionné."
    : nombre + " étudiant(s) sélectionné(s).";

}

// RECUPERER LES UUID DES ETUDIANTS EXCLUS

function recupererEtudiantsExclus() {

const cases = document.querySelectorAll(
    'input[name="etudiantsExclus"]:checked'
);

return Array.from(cases).map(function(checkbox) {
    return checkbox.value;
});

}

// VIDER LA SELECTION DES EXCLUSIONS

function viderSelectionExclusions() {

document.querySelectorAll(
    'input[name="etudiantsExclus"]'
).forEach(function(checkbox) {
    checkbox.checked = false;
});

actualiserNombreExclus();

}

// CHARGER LES ACTIVITES
async function chargerActivites() {

    if (!profil) return;

    let etape = "Initialisation";

    const conteneur = document.getElementById(
        profil.role === "admin"
            ? "listeActivitesAdmin"
            : "listeActivitesEtudiant"
    );

    if (!conteneur) return;

    try {

        // 1. CHARGEMENT DES ACTIVITES

        etape = "Lecture des activités dans Supabase";

        const { data, error } = await client
            .from("activites")
            .select("id, titre, nombre_max, duree_minutes, date_debut, date_fin, statut, nombre_etudiants, nombre_max_groupes")
            .order("date_debut", { ascending: false });

        if (!profil) return;

        if (error) {
            console.error("Erreur Supabase activités :", error);
            conteneur.textContent =
                "Impossible de charger les activités. Réessayez.";
            return;
        }

        // 2. AFFICHAGE DES ACTIVITES

        etape = "Affichage des activités";

        afficherActivites(data || [], conteneur);

        if (!profil) return;

        // 3. CHARGEMENT DES ETUDIANTS POUR LES EXCLUSIONS

        if (profil.role === "admin") {

            const listeExclusion = document.getElementById(
                "listeEtudiantsExclusion"
            );

            if (
                listeExclusion &&
                listeExclusion.dataset.chargee !== "oui"
            ) {
                etape = "Chargement des étudiants pour les exclusions";

                try {
                    await chargerEtudiantsPourExclusion();
                } catch (erreur) {
                    console.error(
                        "Erreur chargement étudiants exclusions :",
                        erreur
                    );
                }
            }
        }

        if (!profil) return;

        // 4. INITIALISATION DES CHRONOMETRES

        etape = "Initialisation des chronomètres";

        if (intervalleChrono !== null) {
            clearInterval(intervalleChrono);
        }

        actualiserChronos();

        intervalleChrono = setInterval(function() {
            actualiserChronos();
        }, 1000);

    } catch (erreur) {

        console.error("ÉTAPE DE L'ERREUR :", etape);
        console.error("ERREUR COMPLÈTE :", erreur);

        conteneur.textContent =
            "Une erreur est survenue pendant le chargement des activités.";

    }
}

// AFFICHER LES ACTIVITES

function afficherActivites(activites, conteneur) {

conteneur.innerHTML = "";

if (!activites || activites.length === 0) {
    conteneur.textContent = "Aucune activité enregistrée.";
    return;
}

activites.forEach(function(activite) {

    const carte = el("div", "activite-card");

    const chrono = el("div", "chrono");
    chrono.dataset.dateFin = activite.date_fin;
    chrono.dataset.statut = activite.statut;

    chrono.appendChild(el("span", null, "TEMPS RESTANT"));
    chrono.appendChild(el("strong", null, "--:--:--"));

    const bouton = el("button", null, "Voir les groupes");

    bouton.addEventListener("click", function() {
        chargerGroupes(
            activite.id,
            activite.nombre_max,
            activite.titre
        );
    });

    carte.appendChild(el("h3", null, activite.titre));
    carte.appendChild(el("span", "statut-activite", activite.statut));

    carte.appendChild(el(
        "p",
        "small",
        "Maximum par groupe : " + activite.nombre_max +
        " | Nombre de groupes : " + activite.nombre_max_groupes +
        " | Étudiants : " + activite.nombre_etudiants
    ));

    carte.appendChild(chrono);
    carte.appendChild(bouton);

    // BOUTON DE SUPPRESSION : ADMIN UNIQUEMENT

    if (profil && profil.role === "admin") {

        const boutonSupprimer = el(
            "button",
            "btn-refuser",
            "Supprimer"
        );

        boutonSupprimer.addEventListener("click", function() {
            supprimerActivite(
                activite.id,
                activite.titre,
                boutonSupprimer
            );
        });

        carte.appendChild(boutonSupprimer);
    }

    conteneur.appendChild(carte);

});

}

// ACTUALISER LES CHRONOMETRES

function actualiserChronos() {

document.querySelectorAll(".chrono").forEach(function(chrono) {

    const affichage = chrono.querySelector("strong");
    const texte = chrono.querySelector("span");

    if (chrono.dataset.statut !== "ouverte") {
        affichage.textContent = "TERMINÉE";
        chrono.classList.add("chrono-termine");
        return;
    }

    const dateFin = new Date(chrono.dataset.dateFin).getTime();

    if (isNaN(dateFin)) {
        affichage.textContent = "--:--:--";
        return;
    }

    const difference = dateFin - Date.now();

    if (difference <= 0) {
        affichage.textContent = "00:00:00";
        chrono.classList.add("chrono-termine");
        texte.textContent = "TEMPS ÉCOULÉ — FINALISATION EN ATTENTE";
        return;
    }

    const heures = Math.floor(difference / 3600000);
    const minutes = Math.floor((difference % 3600000) / 60000);
    const secondes = Math.floor((difference % 60000) / 1000);

    affichage.textContent =
        String(heures).padStart(2, "0") + ":" +
        String(minutes).padStart(2, "0") + ":" +
        String(secondes).padStart(2, "0");

});

}

// CREER UNE ACTIVITE

async function creerActivite() {

const titre = document.getElementById("titreActivite").value.trim();
const nombreMax = parseInt(
    document.getElementById("nombreMax").value,
    10
);
const duree = parseInt(
    document.getElementById("dureeActivite").value,
    10
);

const message = document.getElementById("messageActivite");
const bouton = document.getElementById("boutonActivite");

afficherMessage(message, "");

if (!titre || !nombreMax || !duree) {
    afficherMessage(
        message,
        "Veuillez remplir tous les champs.",
        "erreur"
    );
    return;
}

if (nombreMax < 2 || duree < 1) {
    afficherMessage(
        message,
        "Vérifiez le nombre d'étudiants et la durée.",
        "erreur"
    );
    return;
}

// RECUPERER LES ETUDIANTS EXCLUS

const etudiantsExclus = recupererEtudiantsExclus();

bouton.disabled = true;
bouton.textContent = "Création en cours...";

try {

    const { data, error } = await client.rpc("creer_activite", {

        p_titre: titre,

        p_description: null,

        p_nombre_max: nombreMax,

        p_duree_minutes: duree,

        // Obligatoire : envoyer un tableau vide
        // si aucun étudiant n'est exclu.

        p_etudiants_exclus: etudiantsExclus

    });

    if (error) throw error;

    // Vérifier la réponse de la fonction SQL.

    if (!data || data.succes !== true) {
        throw new Error(
            data && data.message
                ? data.message
                : "La création de l'activité a échoué."
        );
    }

    afficherMessage(
        message,
        "Activité créée avec succès ! " +
        data.nombre_groupes + " groupe(s) créé(s). " +
        data.nombre_etudiants + " étudiant(s) participant(s).",
        "succes"
    );

    document.getElementById("titreActivite").value = "";
    document.getElementById("nombreMax").value = "";
    document.getElementById("dureeActivite").value = "";

    viderSelectionExclusions();

    await chargerActivites();

} catch (erreur) {

    console.error("Erreur création activité :", erreur);

    afficherMessage(
        message,
        messageErreur(erreur, "Une erreur est survenue."),
        "erreur"
    );

} finally {

    bouton.disabled = false;
    bouton.textContent = "Créer l'activité";

}

}

// SUPPRIMER UNE ACTIVITE

async function supprimerActivite(activiteId, titre, bouton) {

if (!profil || profil.role !== "admin") {
    afficherToast(
        "Action réservée à l'administrateur.",
        "erreur"
    );
    return;
}

const confirmation = confirm(
    "ATTENTION !\n\n" +
    "Voulez-vous vraiment supprimer définitivement l'activité : " +
    titre + " ?\n\n" +
    "Tous ses groupes, membres et demandes d'adhésion seront également supprimés.\n\n" +
    "Cette opération est irréversible."
);

if (!confirmation) return;

bouton.disabled = true;
bouton.textContent = "Suppression...";

try {

    const { data, error } = await client.rpc("supprimer_activite", {
        p_activite_id: activiteId
    });

    if (error) throw error;

    if (!data || data.succes !== true) {
        throw new Error(
            data && data.message
                ? data.message
                : "La suppression n'a pas été confirmée."
        );
    }

    if (activiteActuelle.id === activiteId) {

        activiteActuelle = {
            id: null,
            nombreMax: null,
            titre: null
        };

        montrerSection("espaceAdmin");
    }

    afficherToast(
        "L'activité et toutes ses données ont été supprimées.",
        "succes"
    );

    await chargerActivites();

} catch (erreur) {

    console.error("Erreur de suppression :", erreur);

    afficherToast(
        messageErreur(
            erreur,
            "Impossible de supprimer cette activité."
        ),
        "erreur"
    );

    bouton.disabled = false;
    bouton.textContent = "Supprimer";
}

}

// NAVIGATION

function retourActivites() {

activiteActuelle = {
    id: null,
    nombreMax: null,
    titre: null
};

montrerSection(
    profil && profil.role === "admin"
        ? "espaceAdmin"
        : "espaceEtudiant"
);

chargerActivites();

}

// CHARGER LES GROUPES

async function chargerGroupes(activiteId, nombreMax, titreActivite,groupeCibleId) {

if (!profil) return;

activiteActuelle = {
    id: activiteId,
    nombreMax: nombreMax,
    titre: titreActivite
};

const zone = document.getElementById("listeGroupesPage");

document.getElementById("titreActiviteGroupes").textContent =
    titreActivite;

montrerSection("pageGroupes");

zone.textContent = "Chargement des groupes...";

const { data, error } = await client
    .from("groupes")
    .select(`
        id,
        nom,
        statut,
        membres_groupes (
            etudiant_id,
            etudiants ( nom, matricule )
        )
    `)
    .eq("activite_id", activiteId)
    .order("id", { ascending: true });

if (!profil) return;

if (error) {
    console.error(error);
    zone.textContent = "Impossible de charger les groupes. Réessayez.";
    return;
}

if (!data || data.length === 0) {
    zone.textContent = "Aucun groupe disponible.";
    return;
}

const idsMesGroupes = data
    .filter(function(groupe) {
        return estMembreDuGroupe(groupe);
    })
    .map(function(groupe) {
        return groupe.id;
    });

const demandes = await chargerDemandes(idsMesGroupes);

if (!profil) return;

zone.innerHTML = "";

data.forEach(function(groupe) {

    const carte = creerCarteGroupe(
        groupe,
        activiteId,
        nombreMax,
        titreActivite,
        demandes
    );

    if (
        groupeCibleId &&
        Number(groupe.id) === Number(groupeCibleId)
    ) {
        carte.classList.add("groupe-cible-notification");
        carte.id = "groupeCibleNotification";
    }

    zone.appendChild(carte);

});

if (groupeCibleId) {
    setTimeout(function() {
        const cible = document.getElementById("groupeCibleNotification");

        if (cible) {
            cible.scrollIntoView({
                behavior: "smooth",
                block: "center"
            });
        }
    }, 300);
}
}
function estMembreDuGroupe(groupe) {

return (groupe.membres_groupes || []).some(function(membre) {

    return membre.etudiant_id === profil.id ||
           membre.etudiant_id === profil.authId;

});

}

// CARTE D'UN GROUPE

function creerCarteGroupe(
groupe,
activiteId,
nombreMax,
titreActivite,
demandes
) {

const membres = groupe.membres_groupes || [];

const places = Math.max(0, nombreMax - membres.length);

const estMembre = estMembreDuGroupe(groupe);

const carte = el("div", "card");

carte.appendChild(el("h3", null, groupe.nom));

carte.appendChild(el(
    "span",
    places === 0
        ? "statut-activite statut-complet"
        : "statut-activite",
    places === 0 ? "Complet" : "Ouvert"
));

carte.appendChild(el(
    "p",
    null,
    "Membres : " + membres.length + " / " + nombreMax +
    " — Places disponibles : " + places
));

carte.appendChild(el("h4", null, "Membres du groupe"));

if (membres.length === 0) {

    carte.appendChild(
        el("p", null, "Aucun membre pour le moment.")
    );

} else {

    const liste = el("ul");

    membres.forEach(function(membre) {

        let etudiant = membre.etudiants;

        if (Array.isArray(etudiant)) {
            etudiant = etudiant[0];
        }

        liste.appendChild(el(
            "li",
            null,
            etudiant
                ? etudiant.nom + " (" + etudiant.matricule + ")"
                : "Étudiant inconnu"
        ));

    });

    carte.appendChild(liste);
}

if (estMembre) {

    carte.appendChild(
        el("h4", null, "Demandes d'adhésion")
    );

    const zoneDemandes = el("div", "demandes-groupe");

    if (demandes === null) {

        zoneDemandes.textContent =
            "Impossible de charger les demandes.";

    } else {

        afficherDemandes(
            zoneDemandes,
            demandes.get(groupe.id) || []
        );

    }

    carte.appendChild(zoneDemandes);
}

if (estMembre) {

    carte.appendChild(
        el("p", "small", "Vous faites partie de ce groupe.")
    );

} else if (profil.role === "etudiant" && places > 0) {

    const boutonRejoindre = el(
        "button",
        null,
        "Rejoindre ce groupe"
    );

    boutonRejoindre.addEventListener("click", function() {

        rejoindreGroupe(
            groupe.id,
            activiteId,
            nombreMax,
            titreActivite,
            boutonRejoindre
        );

    });

    carte.appendChild(boutonRejoindre);
}

return carte;

}

//REJOINDRE UN GROUPE
async function rejoindreGroupe(
groupeId,
activiteId,
nombreMax,
titreActivite,
bouton
) {

bouton.disabled = true;
bouton.textContent = "Traitement...";

try {

    const { data, error } = await client.rpc(
        "rejoindre_groupe",
        {
            p_groupe_id: groupeId
        }
    );

    if (error) throw error;

    const resultat = Array.isArray(data) ? data[0] : data;

    if (!resultat) {
        throw new Error("Réponse invalide du serveur.");
    }

    // AFFICHER DIRECTEMENT LE MESSAGE SQL

    afficherToast(
        resultat.message || "Opération terminée.",
        resultat.succes === true ? "succes" : "erreur"
    );

    // Actualiser les groupes

    await chargerGroupes(
        activiteId,
        nombreMax,
        titreActivite
    );

} catch (erreur) {

    console.error("Erreur rejoindreGroupe :", erreur);

    afficherToast(
        messageErreur(
            erreur,
            "Impossible de rejoindre ce groupe. Réessayez."
        ),
        "erreur"
    );

    bouton.disabled = false;
    bouton.textContent = "Rejoindre ce groupe";

}

}

// CHARGER LES DEMANDES D'ADHESION

async function chargerDemandes(idsGroupes) {

const parGroupe = new Map();

if (idsGroupes.length === 0) return parGroupe;

const { data, error } = await client
    .from("demandes_adhesion")
    .select(`
        id,
        groupe_id,
        created_at,
        etudiants ( nom, matricule )
    `)
    .in("groupe_id", idsGroupes)
    .eq("statut", "en_attente")
    .order("created_at", { ascending: true });

if (error) {
    console.error(error);
    return null;
}

data.forEach(function(demande) {

    if (!parGroupe.has(demande.groupe_id)) {
        parGroupe.set(demande.groupe_id, []);
    }

    parGroupe.get(demande.groupe_id).push(demande);

});

return parGroupe;

}

// AFFICHER LES DEMANDES D'UN GROUPE

function afficherDemandes(conteneur, demandes) {

if (demandes.length === 0) {
    conteneur.textContent = "Aucune demande en attente.";
    return;
}

demandes.forEach(function(demande) {

    const carte = el("div", "card");

    let etudiant = demande.etudiants;

    if (Array.isArray(etudiant)) {
        etudiant = etudiant[0];
    }

    carte.appendChild(el(
        "p",
        null,
        etudiant
            ? etudiant.nom + " (" + etudiant.matricule + ")"
            : "Étudiant inconnu"
    ));

    carte.appendChild(el(
        "p",
        "small",
        "Demande envoyée le : " +
        new Date(demande.created_at).toLocaleString("fr-FR")
    ));

    const boutonAccepter = el(
        "button",
        "btn-accepter",
        "Accepter"
    );

    boutonAccepter.addEventListener("click", function() {
        traiterDemande(
            demande.id,
            "accepter",
            boutonAccepter
        );
    });

    const boutonRefuser = el(
        "button",
        "btn-refuser",
        "Refuser"
    );

    boutonRefuser.addEventListener("click", function() {
        traiterDemande(
            demande.id,
            "refuser",
            boutonRefuser
        );
    });

    carte.appendChild(boutonAccepter);
    carte.appendChild(boutonRefuser);

    conteneur.appendChild(carte);

});

}

// ACCEPTER OU REFUSER UNE DEMANDE

async function traiterDemande(demandeId, action, bouton) {

const libelle = action === "accepter"
    ? "Accepter"
    : "Refuser";

bouton.disabled = true;
bouton.textContent = "Traitement...";

try {

    const { data, error } = await client.rpc(
        action === "accepter"
            ? "accepter_demande"
            : "refuser_demande",
        {
            p_demande_id: demandeId
        }
    );

    if (error) throw error;

    const resultat = Array.isArray(data) ? data[0] : data;

    if (!resultat) {
        throw new Error("Réponse invalide du serveur.");
    }

    // AFFICHER LE MESSAGE RETOURNÉ PAR SQL

    afficherToast(
        resultat.message || "Opération terminée.",
        resultat.succes === true ? "succes" : "erreur"
    );

    // Actualiser les groupes

    if (activiteActuelle.id !== null) {

        await chargerGroupes(
            activiteActuelle.id,
            activiteActuelle.nombreMax,
            activiteActuelle.titre
        );

    }

} catch (erreur) {

    console.error("Erreur traitement demande :", erreur);

    afficherToast(
        messageErreur(
            erreur,
            "Impossible de traiter cette demande. Réessayez."
        ),
        "erreur"
    );

    bouton.disabled = false;
    bouton.textContent = libelle;

}

}