// -----------------------------
// supabase.js
// -----------------------------

const supabaseUrl = "VOTRE_PROJECT_URL";
const supabaseKey = "VOTRE_ANON_KEY";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// -----------------------------
// SIGNUP
// -----------------------------
async function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const nom = document.getElementById("nom").value;
  const telephone = document.getElementById("telephone").value;

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return alert(error.message);
  const user = data.user;

  await supabase.from("users").insert([
    { id: user.id, email, nom, telephone, photo: "", solde: 0 }
  ]);

  alert("Compte créé !");
  loadDashboard();
}

// -----------------------------
// LOGIN
// -----------------------------
async function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return alert(error.message);

  alert("Connecté !");
  loadDashboard();
}

// -----------------------------
// LOGOUT
// -----------------------------
async function logout() {
  await supabase.auth.signOut();
  window.location.reload();
}

// -----------------------------
// Upload photo profil
// -----------------------------
async function uploadPhoto() {
  const file = document.getElementById("photo").files[0];
  const user = supabase.auth.user();
  if (!file || !user) return alert("Sélectionnez un fichier et connectez-vous");

  const { data, error } = await supabase.storage
    .from("profiles")
    .upload(user.id + "/" + file.name, file, { upsert: true });

  if (error) return alert(error.message);

  const { publicURL } = supabase.storage
    .from("profiles")
    .getPublicUrl(user.id + "/" + file.name);

  await supabase.from("users").update({ photo: publicURL }).eq("id", user.id);

  alert("Photo profil mise à jour !");
  loadDashboard();
}

// -----------------------------
// Load dashboard
// -----------------------------
async function loadDashboard() {
  const user = supabase.auth.user();
  if (!user) return;

  const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();
  document.getElementById("solde").innerText = userData.solde + " Ar";
  document.getElementById("profilePic").src = userData.photo || "https://via.placeholder.com/40";

  loadTransactions();
  loadNotifications();
}

// -----------------------------
// Envoyer (Transfert)
// -----------------------------
async function envoyer() {
  const montant = parseFloat(document.getElementById("montant").value);
  const service = document.getElementById("service").value;
  const user = supabase.auth.user();

  const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();

  if (userData.solde < montant) return alert("Solde insuffisant !");

  // Mise à jour solde
  await supabase.from("users").update({ solde: userData.solde - montant }).eq("id", user.id);

  // Création transaction
  const reference = "TRX-" + Math.random().toString(36).substring(2, 10).toUpperCase();
  await supabase.from("transactions").insert([
    { user_id: user.id, type: "envoyer", service, montant, reference, status: "confirmé", created_at: new Date() }
  ]);

  // Notification
  await supabase.from("notifications").insert([
    { user_id: user.id, message: `Transfert réussi - Ref: ${reference}`, lu: false, created_at: new Date() }
  ]);

  alert("Transfert réussi !");
  loadDashboard();
}

// -----------------------------
// Recevoir (Reverse)
// -----------------------------
async function recevoir() {
  const montant = parseFloat(document.getElementById("montant").value);
  const service = document.getElementById("service").value;
  const user = supabase.auth.user();

  const { data: userData } = await supabase.from("users").select("*").eq("id", user.id).single();

  // Mise à jour solde
  await supabase.from("users").update({ solde: userData.solde + montant }).eq("id", user.id);

  // Création transaction
  const reference = "TRX-" + Math.random().toString(36).substring(2, 10).toUpperCase();
  await supabase.from("transactions").insert([
    { user_id: user.id, type: "recevoir", service, montant, reference, status: "confirmé", created_at: new Date() }
  ]);

  // Notification
  await supabase.from("notifications").insert([
    { user_id: user.id, message: `Montant reçu - Ref: ${reference}`, lu: false, created_at: new Date() }
  ]);

  alert("Montant reçu !");
  loadDashboard();
}

// -----------------------------
// Historique transactions
// -----------------------------
async function loadTransactions() {
  const user = supabase.auth.user();
  const { data: transactions } = await supabase.from("transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

  const tbody = document.getElementById("transactionBody");
  tbody.innerHTML = "";
  transactions.forEach(tx => {
    tbody.innerHTML += `<tr>
      <td>${tx.created_at}</td>
      <td>${tx.service}</td>
      <td>${tx.type}</td>
      <td>${tx.montant}</td>
      <td>${tx.status}</td>
      <td>${tx.reference}</td>
    </tr>`;
  });
}

// -----------------------------
// Notifications
// -----------------------------
async function loadNotifications() {
  const user = supabase.auth.user();
  const { data: notifs } = await supabase.from("notifications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });

  const ul = document.getElementById("notificationList");
  ul.innerHTML = "";
  notifs.forEach(n => {
    ul.innerHTML += `<li>${n.message}</li>`;
  });
}
