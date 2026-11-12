/* =========================================
   SYSTEME DE NOTIFICATIONS
   ========================================= */

let listeNotifications = [];
let intervalleNotifications = null;


/* =========================================
   CHARGER LES NOTIFICATIONS
   ========================================= */

async function chargerNotifications() {

    if (!profil || !profil.authId) {
        return;
    }

    try {

        const { data, error } = await client
            .from("notifications")
            .select("*")
            .eq("destinataire", profil.authId)
            .order("date_creation", {
                ascending: false
            })
            .limit(50);

        if (error) {
            throw error;
        }

        listeNotifications = data || [];

        actualiserBadgeNotifications();

    } catch (erreur) {

        console.error(
            "Erreur chargement notifications :",
            erreur
        );

    }

}


/* =========================================
   ACTUALISER LE BADGE
   ========================================= */

function actualiserBadgeNotifications() {

    let nombreNonLues = listeNotifications.filter(
        function(notification) {
            return notification.lu === false;
        }
    ).length;

    let badgeAdmin = document.getElementById(
        "badgeNotificationsAdmin"
    );

    let badgeEtudiant = document.getElementById(
        "badgeNotificationsEtudiant"
    );

    [badgeAdmin, badgeEtudiant].forEach(
        function(badge) {

            if (!badge) return;

            badge.textContent =
                nombreNonLues > 99 ? "99+" : nombreNonLues;

            badge.style.display =
                nombreNonLues > 0 ? "flex" : "none";

        }
    );

}


/* =========================================
   CREER LE PANNEAU DES NOTIFICATIONS
   ========================================= */

function creerPanneauNotifications() {

    let panneau = document.getElementById(
        "panneauNotifications"
    );

    if (panneau) {
        return panneau;
    }

    panneau = document.createElement("div");

    panneau.id = "panneauNotifications";
    panneau.className = "notification-panel";

    panneau.innerHTML = `
        <div class="notification-header">

            <div>
                <h3>Notifications</h3>
                <p>Vos dernières informations</p>
            </div>

            <button
                type="button"
                class="notification-close"
                onclick="fermerNotifications()">
                ×
            </button>

        </div>

        <div class="notification-actions">

            <button
                type="button"
                onclick="marquerToutesLues()">
                Tout marquer comme lu
            </button>

        </div>

        <div
            id="contenuNotifications"
            class="notification-list">
        </div>
    `;

    document.body.appendChild(panneau);

    return panneau;

}


/* =========================================
   OUVRIR LES NOTIFICATIONS
   ========================================= */
async function ouvrirNotifications() {


    await chargerNotifications();

    let panneau = creerPanneauNotifications();

    panneau.classList.add("notification-panel-open");

    afficherListeNotifications();
}


/* =========================================
   FERMER LES NOTIFICATIONS
   ========================================= */

function fermerNotifications() {

    let panneau = document.getElementById(
        "panneauNotifications"
    );

    if (panneau) {
        panneau.classList.remove(
            "notification-panel-open"
        );
    }

}


/* =========================================
   AFFICHER LA LISTE
   ========================================= */

function afficherListeNotifications() {

let contenu = document.getElementById("contenuNotifications");

if (!contenu) return;

contenu.innerHTML = "";

if (listeNotifications.length === 0) {

    contenu.innerHTML = `
        <div class="notification-empty">
            <span>🔔</span>
            <p>Aucune notification pour le moment.</p>
        </div>
    `;

    return;
}

listeNotifications.forEach(function(notification) {

    let carte = document.createElement("div");

    carte.className = "notification-item";

    if (!notification.lu) {
        carte.classList.add("notification-unread");
    }

    // Rendre la carte cliquable
    carte.style.cursor = "pointer";

    let titre = document.createElement("h4");
    titre.textContent = notification.titre;

    let message = document.createElement("p");
    message.textContent = notification.message;

    let date = document.createElement("small");

    date.textContent = new Date(
        notification.date_creation
    ).toLocaleString("fr-FR");

    carte.appendChild(titre);
    carte.appendChild(message);
    carte.appendChild(date);

    // Bouton marquer comme lu
    if (!notification.lu) {

        let bouton = document.createElement("button");

        bouton.type = "button";
        bouton.textContent = "Marquer comme lu";

        bouton.onclick = function(e) {

            e.stopPropagation();

            marquerNotificationLue(notification.id);

        };

        carte.appendChild(bouton);
    }

// Navigation au clic sur la carte
carte.onclick = async function() {

    if (!notification.lu) {
        await marquerNotificationLue(notification.id);
    }

    fermerNotifications();

    if (!profil) return;

    let role = profil.role;

    if (notification.lien === "activites") {

        naviguerPage(role, "activites");

    } else if (
        notification.lien &&
        notification.lien.indexOf("groupes/") === 0
    ) {

        await ouvrirGroupeDepuisNotification(notification.lien);

    } else if (notification.lien === "groupes") {

        // Anciennes notifications sans identifiant de groupe
        naviguerPage(role, "activites");

    } else {

        console.log("Aucune destination définie pour cette notification.");

    }

};
    contenu.appendChild(carte);

});

}

/* =========================================
   MARQUER UNE NOTIFICATION COMME LUE
   ========================================= */

async function marquerNotificationLue(id) {

    try {

        const { error } = await client
            .from("notifications")
            .update({
                lu: true
            })
            .eq("id", id)
            .eq("destinataire", profil.authId);

        if (error) {
            throw error;
        }

        await chargerNotifications();

        afficherListeNotifications();

    } catch (erreur) {

        console.error(
            "Erreur lecture notification :",
            erreur
        );

        afficherToast(
            "Impossible de modifier cette notification.",
            "erreur"
        );

    }

}


/* =========================================
   MARQUER TOUTES LES NOTIFICATIONS COMME LUES
   ========================================= */

async function marquerToutesLues() {

    if (!profil || !profil.authId) return;

    try {

        const { error } = await client
            .from("notifications")
            .update({
                lu: true
            })
            .eq("destinataire", profil.authId)
            .eq("lu", false);

        if (error) {
            throw error;
        }

        await chargerNotifications();

        afficherListeNotifications();

        afficherToast(
            "Toutes les notifications ont été lues.",
            "succes"
        );

    } catch (erreur) {

        console.error(
            "Erreur mise à jour notifications :",
            erreur
        );

        afficherToast(
            "Impossible de mettre à jour les notifications.",
            "erreur"
        );

    }

}


/* =========================================
   ACTUALISATION AUTOMATIQUE
   ========================================= */

function demarrerActualisationNotifications() {

    if (intervalleNotifications) {
        clearInterval(intervalleNotifications);
    }

    chargerNotifications();

    intervalleNotifications = setInterval(
        function() {
            chargerNotifications();
        },
        30000
    );

}


/* =========================================
   ARRETER L'ACTUALISATION
   ========================================= */

function arreterActualisationNotifications() {

    if (intervalleNotifications) {

        clearInterval(intervalleNotifications);

        intervalleNotifications = null;

    }

}
/* =====================================
   OUVRIR UN GROUPE DEPUIS UNE NOTIFICATION
   ===================================== */

async function ouvrirGroupeDepuisNotification(lien) {

    const correspondance = /^groupes\/(\d+)$/.exec(lien || "");

    if (!correspondance) {
        naviguerPage(profil.role, "activites");
        return;
    }

    const groupeId = Number(correspondance[1]);

    try {

        // RETROUVER LE GROUPE

        const resultatGroupe = await client
            .from("groupes")
            .select("id, activite_id")
            .eq("id", groupeId)
            .single();

        if (resultatGroupe.error) {
            throw resultatGroupe.error;
        }

        // RETROUVER L'ACTIVITE DU GROUPE

        const resultatActivite = await client
            .from("activites")
            .select("id, titre, nombre_max")
            .eq("id", resultatGroupe.data.activite_id)
            .single();

        if (resultatActivite.error) {
            throw resultatActivite.error;
        }

        const activite = resultatActivite.data;

        // CHARGER LES GROUPES ET CIBLER LE BON

        await chargerGroupes(
            activite.id,
            activite.nombre_max,
            activite.titre,
            groupeId
        );

    } catch (erreur) {

        console.error(
            "Erreur lors de l'ouverture du groupe :",
            erreur
        );

        alert("Impossible d'ouvrir le groupe concerné.");

        naviguerPage(profil.role, "activites");
    }
}