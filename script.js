import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, push, remove } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyC4tcA_TjLw6tsxjUyuhlIQkj2Yg4EZ530",
  authDomain: "novavault-e5e9f.firebaseapp.com",
  projectId: "novavault-e5e9f",
  databaseURL: "https://novavault-e5e9f-default-rtdb.firebaseio.com/",
  appId: "1:24832406592:web:1b1b185bfc0310e9e55ba5"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- UTILITIES ---
const simpleCrypt = (text, key) => text.split('').map((char, i) => String.fromCharCode(char.charCodeAt(0) ^ key.charCodeAt(i % key.length))).join('');

// --- GENERATOR ---
window.displayGeneratedPasswords = async () => {
    const uid = sessionStorage.getItem('currentUID');
    let globalRules = [];
    if (uid) {
        const snapshot = await get(ref(db, `users/${uid}/globalConstraints`));
        if (snapshot.exists()) globalRules = snapshot.val();
    }
    const sessionRules = JSON.parse(localStorage.getItem("passwordConstraints") || "[]");
    const all = [...new Set([...globalRules, ...sessionRules])];
    
    const gen = (rules) => {
        let p = "", c = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()";
        let rem = 16 - rules.reduce((s, r) => s + r.length, 0);
        for(let i=0; i<rem; i++) p += c[Math.floor(Math.random()*c.length)];
        let res = [...rules, ...p.split('')];
        for (let i = res.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [res[i], res[j]] = [res[j], res[i]]; }
        return res.join('');
    };

    document.getElementById("pass1").innerHTML = gen(all);
    document.getElementById("pass2").innerHTML = gen(all);
    document.getElementById("pass3").innerHTML = gen(all);
};

// --- MANAGER ---
window.savePassword = async (id) => {
    const uid = sessionStorage.getItem('currentUID');
    const mk = sessionStorage.getItem('currentMasterKey');
    const web = document.getElementById("websiteInput").value.trim();
    const pass = document.getElementById(id).textContent.trim();

    if(!uid || !web || pass.includes("Click")) return alert("Missing info");
    if(prompt("Confirm Master Key:") !== mk) return alert("Wrong Key");

    const enc = btoa(simpleCrypt(pass, mk));
    await set(ref(db, `users/${uid}/vault/${web}`), { password: enc, timestamp: new Date().toLocaleString() });
    alert("Saved to Cloud!");
    window.location.href = "password_manager.html";
};

window.displayStoredPasswords = async () => {
    const uid = sessionStorage.getItem('currentUID');
    const mk = sessionStorage.getItem('currentMasterKey');
    const inputKey = document.getElementById("masterKeyInput").value;
    if(inputKey !== mk) return alert("Invalid Key");

    const snapshot = await get(ref(db, `users/${uid}/vault`));
    const div = document.getElementById("storedPasswordsDiv");
    div.innerHTML = "";

    if(!snapshot.exists()) return div.innerHTML = "<p>Vault Empty</p>";

    Object.entries(snapshot.val()).forEach(([web, data]) => {
        const dec = simpleCrypt(atob(data.password), mk);
        div.innerHTML += `<div class="vault-item"><p><strong>${web}</strong></p><p>${dec}</p><button onclick="deleteCloudPass('${web}')">Delete</button></div>`;
    });
};

window.deleteCloudPass = async (web) => {
    const uid = sessionStorage.getItem('currentUID');
    await remove(ref(db, `users/${uid}/vault/${web}`));
    window.displayStoredPasswords();
};

window.saveGlobalConstraints = async () => {
    const uid = sessionStorage.getItem('currentUID');
    const inputs = document.getElementsByClassName("constraint-input");
    let globals = [];
    for (let i=0; i<inputs.length; i++) if(inputs[i].value.trim()) globals.push(inputs[i].value.trim());
    await set(ref(db, `users/${uid}/globalConstraints`), globals);
    alert("Personal rules synced!");
    window.location.href = "Home_Page.html";
};

window.createConstraintInputs = () => {
    const num = parseInt(document.getElementById("numConstraints").value);
    const div = document.getElementById("constraintInputs");
    div.innerHTML = "";
    for (let i=0; i<num; i++) div.innerHTML += `<input type="text" class="constraint-input" placeholder="Rule ${i+1}"><br>`;
};

window.saveConstraints = () => {
    const ins = document.getElementsByClassName("constraint-input");
    let res = [];
    for (let i=0; i<ins.length; i++) if(ins[i].value.trim()) res.push(ins[i].value.trim());
    localStorage.setItem("passwordConstraints", JSON.stringify(res));
    window.location.href = "password_generator.html";
};