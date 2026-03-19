// -----------------------------
// app.js - Supabase version
// -----------------------------

// Setup Supabase
const supabaseUrl = "https://lvcxpqpwgwqkrfbxpewt.supabase.co";   
const supabaseKey = "sb_publishable_DhnOyzW9vyvWCEdbnhaZpw_4vIPHmS1";      
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;

// -----------------------------
// Auth state listener
// -----------------------------
supabase.auth.onAuthStateChange((event, session) => {
  if (session?.user) {
    currentUser = session.user;
    loadDashboard();
  } else {
    currentUser = null;
    document.getElementById("loginPage").style.display = "block";
    document.getElementById("dashboard").style.display = "none";
  }
});

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

  currentUser = data.user;

  // Ajouter user dans table "users"
  await supabase.from("users").insert([
    {
      id: currentUser.id,
      email,
      nom,
      telephone,
      photo: "",
      solde: 0
    }
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

  currentUser = data.user;
  alert("Connecté !");
  loadDashboard();
}

// -----------------------------
// LOGOUT
// -----------------------------
async function logout() {
  await supabase.auth.signOut();
  location.reload();
}

// -----------------------------
// Upload photo profil
// -----------------------------
async function uploadPhoto() {
  const file = document.getElementById("photo").files[0];
  if (!file || !currentUser) return alert("Sélectionnez un fichier et connectez-vous");

  // Upload dans Supabase Storage
  const { data, error } = await supabase.storage
    .from("profiles")
    .upload(currentUser.id + "/" + file.name, file, { upsert: true });

  if (error) return alert(error.message);

  const { publicURL } = supabase.storage
    .from("profiles")
    .getPublicUrl(currentUser.id + "/" + file.name);

  // Mise à jour table users
  await supabase.from("users").update({ photo: publicURL }).eq("id", currentUser.id);

  alert("Photo mise à jour !");
  loadDashboard();
}

// -----------------------------
// Load Dashboard
// -----------------------------
async function loadDashboard() {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("dashboard").style.display = "block";

  // Récupérer user
  const { data: userData, error } = await supabase.from("users").select("*").eq("id", currentUser.id).single();
  if (error) return alert(error.message);

  document.getElementById("solde").innerText = userData.solde + " Ar";
  document.getElementById("profilePic").src = userData.photo || "https://via.placeholder.com/40";
  document.getElementById("profilNom").innerText = userData.nom;
  document.getElementById("profilTelephone").innerText = userData.telephone;

  loadTransactions();
  loadNotifications();
}

// -----------------------------
// ENVOYER
// -----------------------------
async function envoyer() {
  let montant = prompt("Montant:");
  montant = parseFloat(montant);
  const service = prompt("Service (crypto, wallet, starlink, xbet):").toLowerCase();

  const { data: userData } = await supabase.from("users").select("*").eq("id", currentUser.id).single();

  if (userData.solde < montant) return alert("Solde insuffisant");

  const reference = "TRX-" + Math.random().toString(36).substring(2,10).toUpperCase();

  // Mise à jour solde
  await supabase.from("users").update({ solde: userData.solde - montant }).eq("id", currentUser.id);

  // Ajouter transaction
  await supabase.from("transactions").insert([
    {
      user_id: currentUser.id,
      type: "envoyer",
      service,
      montant,
      reference,
      status: "confirmé",
      created_at: new Date()
    }
  ]);

  // Notification
  await supabase.from("notifications").insert([
    {
      user_id: currentUser.id,
      message: `Transfert réussi - Ref: ${reference}`,
      lu: false,
      created_at: new Date()
    }
  ]);

  alert("Transfert réussi !");
  loadDashboard();
}

// -----------------------------
// RECEVOIR
// -----------------------------
async function recevoir() {
  let montant = prompt("Montant:");
  const service = prompt("Service (crypto, wallet, starlink, xbet):").toLowerCase();

  const { data: userData } = await supabase.from("users").select("*").eq("id", currentUser.id).single();

  const reference = "TRX-" + Math.random().toString(36).substring(2,10).toUpperCase();

  await supabase.from("users").update({ solde: userData.solde + montant }).eq("id", currentUser.id);

  await supabase.from("transactions").insert([
    {
      user_id: currentUser.id,
      type: "recevoir",
      service,
      montant,
      reference,
      status: "confirmé",
      created_at: new Date()
    }
  ]);

  await supabase.from("notifications").insert([
    {
      user_id: currentUser.id,
      message: `Montant reçu - Ref: ${reference}`,
      lu: false,
      created_at: new Date()
    }
  ]);

  alert("Montant reçu !");
  loadDashboard();
}

// -----------------------------
// Historique transactions
// -----------------------------
async function loadTransactions() {
  const { data: transactions } = await supabase.from("transactions").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false });

  const tbody = document.getElementById("transactionBody");
  tbody.innerHTML = "";

  transactions.forEach(tx => {
    tbody.innerHTML += `<tr>
      <td>${new Date(tx.created_at).toLocaleString()}</td>
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
  const { data: notifs } = await supabase.from("notifications").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false });

  const ul = document.getElementById("notificationList");
  ul.innerHTML = "";

  notifs.forEach(n => {
    ul.innerHTML += `<li>${n.message}</li>`;
  });
}
