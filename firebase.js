const firebaseConfig = {
  apiKey: "API_KEY",
  authDomain: "PROJECT_ID.firebaseapp.com",
  projectId: "PROJECT_ID",
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
