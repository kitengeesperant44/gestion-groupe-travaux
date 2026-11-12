// OUTILS PARTAGES

let profil = null;
let etapeConnexion = "Initialisation";

const SECTIONS = ["connexion", "espaceAdmin", "espaceEtudiant", "pageGroupes"];

function montrerSection(id) {
    SECTIONS.forEach(function(section) {
        const element = document.getElementById(section);

        if (element) {
            element.style.display = section === id ? "block" : "none";
        }
    });

    window.scrollTo(0, 0);
}

function afficherMessage(element, texte, type) {
    if (!element) return;

    element.textContent = texte;
    element.className = "message" + (type ? " " + type : "");
}

function afficherToast(texte, type) {
    const toast = document.createElement("div");

    toast.className = "toast" + (type ? " " + type : "");
    toast.setAttribute("role", "status");
    toast.textContent = texte;

    document.body.appendChild(toast);

    setTimeout(function() {
        toast.remove();
    }, 4000);
}

// GESTION DES ERREURS

function messageErreur(erreur, defaut) {
    console.error(erreur);

    if (erreur && erreur.code === "P0001" && erreur.message) {
        return erreur.message;
    }

    return defaut;
}

async function lireErreurFonction(error, data, defaut) {
    if (data && data.erreur) return data.erreur;

    if (error && error.context && typeof error.context.json === "function") {
        try {
            const corps = await error.context.json();

            if (corps && corps.erreur) {
                return corps.erreur;
            }
        } catch (e) {}
    }

    return defaut;
}

// PROFIL DE L'UTILISATEUR CONNECTE

async function chargerProfil() {

    const { data: utilisateur, error } = await client.auth.getUser();

    if (error || !utilisateur.user) {
        console.error("chargerProfil / getUser :", error);
        return null;
    }

    const authId = utilisateur.user.id;

    let { data, error: erreurProfil } = await client
        .from("etudiants")
        .select("id, matricule, nom, role")
        .eq("auth_id", authId)
        .maybeSingle();

    if (erreurProfil) {

        console.warn("chargerProfil avec id impossible :", erreurProfil);

        ({ data, error: erreurProfil } = await client
            .from("etudiants")
            .select("matricule, nom, role")
            .eq("auth_id", authId)
            .maybeSingle());
    }

    if (erreurProfil || !data) {
        console.error("chargerProfil / etudiants :", erreurProfil);
        return null;
    }

    return {
        id: data.id || null,
        authId: authId,
        matricule: data.matricule,
        nom: data.nom,
        role: data.role
    };
}

// OUVRIR L'ESPACE SELON LE ROLE

async function ouvrirEspace(p) {

    etapeConnexion = "Vérification du rôle";

    if (p.role !== "admin" && p.role !== "etudiant") {
        await client.auth.signOut();
        return false;
    }

    profil = p;

    const admin = p.role === "admin";

    etapeConnexion = "Affichage de l'identité";

    const identite = document.getElementById(
        admin ? "identiteAdmin" : "identiteEtudiant"
    );

    if (identite) {
        identite.textContent =
            p.nom + " — Matricule : " + p.matricule;
    }

    if (admin) {
        etapeConnexion = "Chargement de la liste des étudiants";
        chargerEtudiants("listeAdmin", "nombreAdmin");
    }

    etapeConnexion = "Chargement des activités";
    chargerActivites();

    etapeConnexion = "Initialisation des notifications";
    demarrerActualisationNotifications();

    etapeConnexion = "Chargement des statistiques";
    chargerStatistiques(p.role);

    if (typeof naviguerPage === "function") {

        etapeConnexion = "Navigation vers le tableau de bord";

        naviguerPage(
            admin ? "admin" : "etudiant",
            "tableau"
        );

    } else {

        etapeConnexion = "Affichage de l'espace utilisateur";

        montrerSection(
            admin ? "espaceAdmin" : "espaceEtudiant"
        );
    }

    return true;
}

// CONNEXION

async function seConnecter(event) {

    if (event) event.preventDefault();

    const matricule = document.getElementById("matricule").value.trim();
    const mot_de_passe = document.getElementById("password").value;

    const message = document.getElementById("messageConnexion");
    const bouton = document.getElementById("boutonConnexion");

    if (!matricule || !mot_de_passe) {
        afficherMessage(message, "Remplissez tous les champs.", "erreur");
        return;
    }

    bouton.disabled = true;

    afficherMessage(message, "Connexion en cours...");

    etapeConnexion = "Initialisation";

    try {

        // ETAPE 1 : AUTHENTIFICATION

        etapeConnexion = "Appel de connexion-etudiant";

        const { data, error } = await client.functions.invoke(
            "connexion-etudiant",
            {
                body: {
                    matricule: matricule,
                    mot_de_passe: mot_de_passe
                }
            }
        );

        if (error || !data || !data.succes) {

            console.error("Erreur authentification :", error, data);

            afficherMessage(
                message,
                await lireErreurFonction(
                    error,
                    data,
                    "Échec de connexion."
                ),
                "erreur"
            );

            return;
        }

        // ETAPE 2 : CREATION DE LA SESSION

        etapeConnexion = "Création de la session";

        if (!data.session || !data.session.access_token || !data.session.refresh_token) {
            throw new Error("La fonction de connexion n'a pas retourné une session valide.");
        }

        const { error: sessionError } = await client.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
        });

        if (sessionError) {
            throw sessionError;
        }

        // ETAPE 3 : CHARGEMENT DU PROFIL

        etapeConnexion = "Chargement du profil";

        const p = await chargerProfil();

        if (!p) {

            await client.auth.signOut();

            afficherMessage(
                message,
                "Profil introuvable ou rôle non reconnu.",
                "erreur"
            );

            return;
        }

        // ETAPE 4 : OUVERTURE DE L'ESPACE

        etapeConnexion = "Ouverture de l'espace utilisateur";

        if (!(await ouvrirEspace(p))) {

            await client.auth.signOut();

            afficherMessage(
                message,
                "Profil introuvable ou rôle non reconnu.",
                "erreur"
            );

            return;
        }

        afficherMessage(message, "");

    } catch (erreur) {

        console.error("ÉTAPE DE L'ÉCHEC :", etapeConnexion);
        console.error("ERREUR COMPLÈTE :", erreur);

        afficherMessage(
            message,
            "Erreur à l'étape : " + etapeConnexion,
            "erreur"
        );

    } finally {

        bouton.disabled = false;

    }
}

// DECONNEXION

async function deconnexion() {

    await client.auth.signOut();

    if (
        typeof intervalleChrono !== "undefined" &&
        intervalleChrono !== null
    ) {
        clearInterval(intervalleChrono);
        intervalleChrono = null;
    }

    profil = null;

    if (typeof activiteActuelle !== "undefined") {
        activiteActuelle = {
            id: null,
            nombreMax: null,
            titre: null
        };
    }

    const elements = [
        "listeActivitesAdmin",
        "listeActivitesEtudiant",
        "listeAdmin",
        "listeEtudiant",
        "listeGroupesPage",
        "nombreAdmin",
        "nombreEtudiant",
        "identiteAdmin",
        "identiteEtudiant",
        "messageCreation",
        "messageActivite"
    ];

    elements.forEach(function(id) {
        const element = document.getElementById(id);

        if (element) {
            element.textContent = "";
        }
    });

    document.getElementById("password").value = "";
    document.getElementById("matricule").value = "";

    afficherMessage(
        document.getElementById("messageConnexion"),
        ""
    );

    montrerSection("connexion");
    arreterActualisationNotifications();
}