// --- CONFIGURATION ---
const supabaseUrl = "https://lvcxpqwgwqkrfbxpewt.supabase.co"; 
const supabaseKey = "sb_publishable_DhnOyzW9vyvWCEdbnhaZpw_4vIPHmS1";
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

let currentUser = null;

// --- AUTH LISTENER ---
_supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        currentUser = session.user;
        loadDashboard();
    } else {
        document.getElementById("loginPage").style.display = "block";
        document.getElementById("dashboard").style.display = "none";
    }
});

// --- SIGNUP ---
async function signup() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const nom = document.getElementById("nom").value;
    const tel = document.getElementById("telephone").value;

    const { data, error } = await _supabase.auth.signUp({ email, password });
    if (error) return alert(error.message);

    // Mamorona profil ao amin'ny table 'users'
    await _supabase.from("users").insert([
        { id: data.user.id, email: email, nom: nom, telephone: tel, solde: 0 }
    ]);

    alert("Kaonty voaforona! Jereo ny email-nao raha misy fanamarinana.");
}

// --- LOGIN ---
async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const { error } = await _supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
}

// --- LOGOUT ---
async function logout() {
    await _supabase.auth.signOut();
}

// --- DASHBOARD ---
async function loadDashboard() {
    document.getElementById("loginPage").style.display = "none";
    document.getElementById("dashboard").style.display = "block";

    const { data: user, error } = await _supabase.from("users").select("*").eq("id", currentUser.id).single();
    if (error) return;

    document.getElementById("solde").innerText = new Intl.NumberFormat('mg-MG').format(user.solde) + " Ar";
    document.getElementById("profilNom").innerText = user.nom;
    document.getElementById("profilTelephone").innerText = user.telephone;
    if (user.photo) document.getElementById("profilePic").src = user.photo;

    loadTransactions();
    loadNotifications();
}

// --- UPLOAD PHOTO ---
async function uploadPhoto() {
    const file = document.getElementById("photo").files[0];
    const filePath = `avatars/${currentUser.id}_${Date.now()}`;

    const { error: uploadError } = await _supabase.storage.from("profiles").upload(filePath, file);
    if (uploadError) return alert(uploadError.message);

    const { data: urlData } = _supabase.storage.from("profiles").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;

    await _supabase.from("users").update({ photo: publicUrl }).eq("id", currentUser.id);
    loadDashboard();
}

// --- TRANSACTION (ENVOYER / RECEVOIR) ---
async function envoyer() {
    executeTransaction("envoyer");
}

async function recevoir() {
    executeTransaction("recevoir");
}

async function executeTransaction(type) {
    let montant = parseFloat(prompt("Firy ny vola?"));
    if (isNaN(montant) || montant <= 0) return alert("Vola tsy mitombina");

    const service = prompt("Inona ny service? (ex: 1xBet, Crypto...)");
    const { data: user } = await _supabase.from("users").select("solde").eq("id", currentUser.id).single();

    let vaovaoSolde = (type === "envoyer") ? user.solde - montant : user.solde + montant;
    if (vaovaoSolde < 0) return alert("Tsy ampy ny solde-nao");

    const ref = "TX-" + Math.random().toString(36).substring(7).toUpperCase();

    // Update solde
    await _supabase.from("users").update({ solde: vaovaoSolde }).eq("id", currentUser.id);

    // Save transaction
    await _supabase.from("transactions").insert([{
        user_id: currentUser.id, type, service, montant, reference: ref
    }]);

    // Add notification
    await _supabase.from("notifications").insert([{
        user_id: currentUser.id, message: `Transaction ${type} (${montant} Ar) vita. Ref: ${ref}`
    }]);

    loadDashboard();
}

// --- LOAD DATA ---
async function loadTransactions() {
    const { data } = await _supabase.from("transactions").select("*").eq("user_id", currentUser.id).order("id", { ascending: false });
    const tbody = document.getElementById("transactionBody");
    tbody.innerHTML = data.map(t => `
        <tr>
            <td>${new Date(t.created_at).toLocaleDateString()}</td>
            <td>${t.service}</td>
            <td>${t.type === 'envoyer' ? '🔴' : '🟢'}</td>
            <td>${t.montant}</td>
            <td>${t.reference}</td>
        </tr>
    `).join('');
}

async function loadNotifications() {
    const { data } = await _supabase.from("notifications").select("*").eq("user_id", currentUser.id).order("id", { ascending: false });
    const ul = document.getElementById("notificationList");
    ul.innerHTML = data.map(n => `<li>${n.message}</li>`).join('');
}
