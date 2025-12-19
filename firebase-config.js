// Firebase Configuration - GANTI dengan config Anda
const firebaseConfig = {
    apiKey: "AIzaSyBQ-z9GubBexPIdUd2f72T-meyEIlmWubE",
    authDomain: "teka-teki-hafidz-anak.firebaseapp.com",
    projectId: "teka-teki-hafidz-anak",
    storageBucket: "teka-teki-hafidz-anak.firebasestorage.app",
    messagingSenderId: "909269897458",
    appId: "1:909269897458:web:9e5ec9f850265cfacf806b",
    measurementId: "G-5ERGGEMEGY"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

db.enablePersistence({ synchronizeTabs: true })
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.log("Persistence failed: Multiple tabs open");
        } else if (err.code == 'unimplemented') {
            console.log("Persistence failed: Browser not supported");
        }
    });
