// INITIALISATION DE L'APPLICATION

document.addEventListener("DOMContentLoaded", async function() {

    const { data, error } = await client.auth.getSession();

    if (error || !data.session) {
        return;
    }

    const utilisateur = data.session.user;

    const { data: etudiant, error: erreurProfil } = await client
        .from("etudiants")
        .select("matricule, nom, role")
        .eq("auth_id", utilisateur.id)
        .single();

    if (erreurProfil || !etudiant) {

        await client.auth.signOut();

        return;

    }

    if (etudiant.role === "admin") {

        afficherEspaceAdmin(etudiant);

    } else if (etudiant.role === "etudiant") {

        afficherEspaceEtudiant(etudiant);

    } else {

        await client.auth.signOut();

    }

});