// CONNEXION

async function seConnecter() {

    const matricule = document.getElementById("matricule").value.trim();
    const mot_de_passe = document.getElementById("password").value;

    const message = document.getElementById("messageConnexion");
    const bouton = document.getElementById("boutonConnexion");

    if (!matricule || !mot_de_passe) {
        message.textContent = "Remplissez tous les champs.";
        return;
    }

    bouton.disabled = true;
    message.textContent = "Connexion en cours...";

    try {

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
            message.textContent = data?.erreur || "Échec de connexion.";
            return;
        }

        const { error: sessionError } = await client.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token
        });

        if (sessionError) {
            message.textContent = "Impossible d'ouvrir la session.";
            return;
        }

        if (data.etudiant.role === "admin") {

            afficherEspaceAdmin(data.etudiant);

        } else if (data.etudiant.role === "etudiant") {

            afficherEspaceEtudiant(data.etudiant);

        } else {

            await client.auth.signOut();
            message.textContent = "Rôle non reconnu.";

        }

    } catch (erreur) {

        message.textContent = "Erreur de connexion. Réessayez.";

    } finally {

        bouton.disabled = false;

    }
}


// ESPACE ADMINISTRATEUR

function afficherEspaceAdmin(etudiant) {

    document.getElementById("connexion").style.display = "none";

    document.getElementById("espaceEtudiant").style.display = "none";

    document.getElementById("espaceAdmin").style.display = "block";

    document.getElementById("identiteAdmin").textContent =
        etudiant.nom + " — Matricule : " + etudiant.matricule;

    chargerEtudiants("listeAdmin", "nombreAdmin");

    chargerActivites();
}


// ESPACE ETUDIANT

function afficherEspaceEtudiant(etudiant) {

    document.getElementById("connexion").style.display = "none";

    document.getElementById("espaceAdmin").style.display = "none";

    document.getElementById("espaceEtudiant").style.display = "block";

    document.getElementById("identiteEtudiant").textContent =
        etudiant.nom + " — Matricule : " + etudiant.matricule;

    chargerEtudiants("listeEtudiant", "nombreEtudiant");

    chargerActivites();
}


// DECONNEXION

async function deconnexion() {

    await client.auth.signOut();

    if (intervalleChrono !== null) {
        clearInterval(intervalleChrono);
        intervalleChrono = null;
    }

    document.getElementById("espaceAdmin").style.display = "none";

    document.getElementById("espaceEtudiant").style.display = "none";

    document.getElementById("connexion").style.display = "block";

    document.getElementById("password").value = "";

    document.getElementById("matricule").value = "";

    document.getElementById("messageConnexion").textContent = "";

}