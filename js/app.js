/* =====================================
   INITIALISATION DE L'APPLICATION
   ===================================== */

document.addEventListener("DOMContentLoaded", async function () {

    const { data, error } = await client.auth.getSession();

    if (error || !data.session) {
        return;
    }

    const p = await chargerProfil();

    if (!p) {
        await client.auth.signOut();
        montrerSection("connexion");
        return;
    }

    await ouvrirEspace(p);

    // Ouvrir la page d'accueil selon le rôle
    if (p.role === "admin") {
        naviguerPage("admin", "tableau");
    } else {
        naviguerPage("etudiant", "tableau");
    }

});


/* =====================================
   NAVIGATION ENTRE LES PAGES
   ===================================== */

function naviguerPage(role, page) {

    if (!profil) {
        return;
    }

    // Vérifier les autorisations
    if (role === "admin" && profil.role !== "admin") {
        return;
    }

    if (role === "etudiant" && profil.role !== "etudiant") {
        return;
    }

    // Déterminer l'espace concerné
    let espaceId = role === "admin"
        ? "espaceAdmin"
        : "espaceEtudiant";

    let prefixe = role === "admin"
        ? "adminPage"
        : "etudiantPage";

    // Construire l'identifiant de la page
    let pageId = prefixe +
        page.charAt(0).toUpperCase() +
        page.slice(1);

    let pageDemandee = document.getElementById(pageId);

    if (!pageDemandee) {
        console.error("Page introuvable :", pageId);
        return;
    }

    // Afficher le bon espace
    montrerSection(espaceId);

    // Masquer toutes les pages internes
    let pages = document.querySelectorAll(
        "#" + espaceId + " .page-interne"
    );

    pages.forEach(function (element) {

        element.style.display = "none";
        element.classList.remove("active");

    });

    // Afficher la page demandée
    pageDemandee.style.display = "block";
    pageDemandee.classList.add("active");

    // Actualiser le menu
    let navigation = document.querySelector(
        "#" + espaceId + " .dashboard-nav"
    );

    if (navigation) {

        let boutons = navigation.querySelectorAll(".nav-item");

        boutons.forEach(function (bouton) {

            bouton.classList.remove("active");

            let action = bouton.getAttribute("onclick");

            if (action && action.indexOf("'" + page + "'") !== -1) {
                bouton.classList.add("active");
            }

        });

    }

    // Actions particulières selon la page
    if (page === "activites") {
        chargerActivites();
    }

    if (page === "syllabus") {
        chargerSyllabus(role);
    }

    if (page === "archives") {
        chargerArchives(role);
    }

    // Afficher les informations du profil étudiant
    if (role === "etudiant" && page === "profil") {

        let nom = document.getElementById("profilNomEtudiant");
        let matricule = document.getElementById("profilMatriculeEtudiant");

        if (nom) {
            nom.textContent = profil.nom || "";
        }

        if (matricule) {
            matricule.textContent = profil.matricule || "";
        }

    }

    window.scrollTo(0, 0);

}


/* =====================================
   NAVIGATION VERS LES GROUPES
   ===================================== */

function ouvrirPageGroupes() {

    if (!profil) {
        return;
    }

    montrerSection("pageGroupes");

    window.scrollTo(0, 0);

}


/* =====================================
   RETOUR AU TABLEAU DE BORD
   ===================================== */

function allerTableauBord() {

    if (!profil) {
        return;
    }

    if (profil.role === "admin") {

        naviguerPage("admin", "tableau");

    } else {

        naviguerPage("etudiant", "tableau");

    }

}


/* ========================================
   STATISTIQUES DES TABLEAUX DE BORD
   ======================================== */

async function chargerStatistiques(role) {

    if (!profil) {
        return;
    }

    try {

        // =================================
        // 1. COMPTER LES ETUDIANTS
        // =================================

        if (role === "admin") {

            const { count: nombreEtudiants, error: erreurEtudiants } =
                await client
                    .from("etudiants")
                    .select("*", {
                        count: "exact",
                        head: true
                    })
                    .eq("role", "etudiant");

            if (erreurEtudiants) {
                throw erreurEtudiants;
            }

            let elementEtudiants =
                document.getElementById("statNombreEtudiants");

            if (elementEtudiants) {
                elementEtudiants.textContent = nombreEtudiants ?? 0;
            }

        }


        // =================================
        // 2. COMPTER LES ACTIVITES
        // =================================

        const { count: nombreActivites, error: erreurActivites } =
            await client
                .from("activites")
                .select("*", {
                    count: "exact",
                    head: true
                });

        if (erreurActivites) {
            throw erreurActivites;
        }

        if (role === "admin") {

            let element =
                document.getElementById("statNombreActivites");

            if (element) {
                element.textContent = nombreActivites ?? 0;
            }

        } else {

            let element =
                document.getElementById("statEtudiantActivites");

            if (element) {
                element.textContent = nombreActivites ?? 0;
            }

        }


        // =================================
        // 3. COMPTER LES GROUPES DE L'ETUDIANT
        // =================================

        if (role === "etudiant") {

            const { count: nombreGroupes, error: erreurGroupes } =
                await client
                    .from("membres_groupes")
                    .select("*", {
                        count: "exact",
                        head: true
                    })
                    .eq("etudiant_id", profil.authId);

            if (erreurGroupes) {
                throw erreurGroupes;
            }

            let elementGroupes =
                document.getElementById("statEtudiantGroupes");

            if (elementGroupes) {
                elementGroupes.textContent = nombreGroupes ?? 0;
            }

        }


        // =================================
        // 4. COMPTER LES DOCUMENTS DU SYLLABUS
        // =================================

        const { count: nombreSyllabus, error: erreurSyllabus } =
            await client
                .from("syllabus")
                .select("*", {
                    count: "exact",
                    head: true
                });

        if (erreurSyllabus) {
            throw erreurSyllabus;
        }


        // =================================
        // 5. COMPTER LES DOCUMENTS ARCHIVES
        // =================================

        const { count: nombreArchives, error: erreurArchives } =
            await client
                .from("archives")
                .select("*", {
                    count: "exact",
                    head: true
                });

        if (erreurArchives) {
            throw erreurArchives;
        }


        // =================================
        // 6. AFFICHER LES STATISTIQUES
        // =================================

        if (role === "admin") {

            let elementSyllabus =
                document.getElementById("statNombreSyllabus");

            let elementArchives =
                document.getElementById("statNombreArchives");

            if (elementSyllabus) {
                elementSyllabus.textContent = nombreSyllabus ?? 0;
            }

            if (elementArchives) {
                elementArchives.textContent = nombreArchives ?? 0;
            }

        } else {

            let elementSyllabus =
                document.getElementById("statEtudiantSyllabus");

            let elementArchives =
                document.getElementById("statEtudiantArchives");

            if (elementSyllabus) {
                elementSyllabus.textContent = nombreSyllabus ?? 0;
            }

            if (elementArchives) {
                elementArchives.textContent = nombreArchives ?? 0;
            }

        }

    } catch (erreur) {

        console.error(
            "Erreur chargement statistiques :",
            erreur
        );

        afficherToast(
            "Impossible de charger certaines statistiques.",
            "erreur"
        );

    }

}