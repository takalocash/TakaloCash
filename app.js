firebase.auth().onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    loadDashboard();
  }
});
let currentUser = null;

// LOGIN
function signup() {

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  // 👉 APETRAKA ETO
  const nom = document.getElementById("nom").value;
  const telephone = document.getElementById("telephone").value;

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {

      let user = userCredential.user;

      db.collection("users").doc(user.uid).set({
        email: email,
        nom: nom,
        telephone: telephone,
        photo: "",
        solde: 0,
        createdAt: new Date()
      });

      currentUser = user;
      loadDashboard();

    })
    .catch(err => alert(err.message));
}

// LOGOUT
function logout() {
  firebase.auth().signOut();
  location.reload();
}

// LOAD DASHBOARD
function loadDashboard() {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("dashboard").style.display = "block";

  const uid = currentUser.uid;

  db.collection("users").doc(uid).onSnapshot(doc => {
    let data = doc.data();
    document.getElementById("solde").innerText = data.solde + " Ar";
  });

  loadHistory();
}

// RECEVOIR
function recevoir() {
  const uid = currentUser.uid;

  db.collection("users").doc(uid).update({
    solde: firebase.firestore.FieldValue.increment(10000)
  });

  addTransaction("recevoir", 10000);
}

// ENVOYER
function envoyer() {
  let montant = prompt("Montant:");
  montant = parseInt(montant);

  const uid = currentUser.uid;
  const userRef = db.collection("users").doc(uid);

  userRef.get().then(doc => {
    let solde = doc.data().solde;

    if (solde >= montant) {
      userRef.update({
        solde: solde - montant
      });
      addTransaction("envoyer", montant);
    } else {
      alert("Solde insuffisant");
    }
  });
}

// TRANSACTION
function addTransaction(type, montant) {
  db.collection("transactions").add({
    user: currentUser.uid,
    type: type,
    montant: montant,
    date: new Date()
  });
}

// HISTORIQUE
function loadHistory() {
  db.collection("transactions")
    .where("user", "==", currentUser.uid)
    .onSnapshot(snapshot => {
      let list = document.getElementById("history");
      list.innerHTML = "";

      snapshot.forEach(doc => {
        let data = doc.data();
        let li = document.createElement("li");
        li.innerText = data.type + " - " + data.montant + " Ar";
        list.appendChild(li);
      });
    });
}
function signup() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {

      let user = userCredential.user;

      // Création user dans database
      db.collection("users").doc(user.uid).set({
  email: email,
  nom: "",
  telephone: "",
  photo: "",
  solde: 0,
  createdAt: new Date()
});
      currentUser = user;

      // Miditra ho azy
      loadDashboard();

    })
    .catch(err => alert(err.message));
}
