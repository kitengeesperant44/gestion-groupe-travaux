// CREATION ETUDIANT

async function creerEtudiant() {

    const matricule = document.getElementById("nouveauMatricule").value.trim();

    const nom = document.getElementById("nouveauNom").value.trim();

    const mot_de_passe = document.getElementById("nouveauPassword").value;

    const message = document.getElementById("messageCreation");

    const bouton = document.getElementById("boutonCreation");

    if (!matricule || !nom || !mot_de_passe) {

        message.textContent = "Tous les champs sont obligatoires.";
        return;

    }

    bouton.disabled = true;

    message.textContent = "Création en cours...";

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

            message.textContent = data?.erreur || "Erreur pendant la création.";
            return;

        }

        message.textContent = "Étudiant créé avec succès !";

        document.getElementById("nouveauMatricule").value = "";

        document.getElementById("nouveauNom").value = "";

        document.getElementById("nouveauPassword").value = "";

        chargerEtudiants("listeAdmin", "nombreAdmin");

    } catch (erreur) {

        message.textContent = "Erreur pendant la création.";

    } finally {

        bouton.disabled = false;

    }

}


// CHARGER LA LISTE DES ETUDIANTS

async function chargerEtudiants(idListe, idNombre) {

    const liste = document.getElementById(idListe);

    const nombre = document.getElementById(idNombre);

    liste.textContent = "Chargement...";

    const { data, error } = await client
        .from("etudiants")
        .select("matricule, nom")
        .eq("role", "etudiant")
        .order("nom");

    if (error) {

        liste.textContent = "Erreur : " + error.message;
        return;

    }

    nombre.textContent = data.length + " étudiant(s) enregistré(s)";

    liste.innerHTML = "";

    if (data.length === 0) {

        liste.textContent = "Aucun étudiant enregistré.";
        return;

    }

    data.forEach(function(etudiant) {

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