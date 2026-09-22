(function(){
  "use strict";

  var CFG = window.QUIZ_CONFIG || {};
  var SCRIPT_URL = CFG.googleScriptUrl || "";
  var app = document.getElementById("app");

  var password = "";
  var state = { modules: [], questions: [] }; // questions: all modules together, each has .module
  var selectedModule = "";

  function esc(s){
    var d = document.createElement("div");
    d.textContent = String(s == null ? "" : s);
    return d.innerHTML;
  }

  function toast(msg){
    var t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 2400);
  }

  function renderConfigError(){
    app.innerHTML = '<div class="gate-wrap"><div class="card register-card">' +
      '<h1>Configuration manquante</h1>' +
      '<p class="lead">L\'URL du script Google n\'est pas renseignée dans config.js.</p>' +
    '</div></div>';
  }

  function renderGate(error){
    app.innerHTML = '<div class="gate-wrap"><div class="card register-card">' +
      '<h1>Accès administrateur</h1>' +
      '<p class="lead">Entre le mot de passe défini dans Code.gs (fonction setAdminPassword).</p>' +
      (error ? '<div class="error-box">' + esc(error) + '</div>' : '') +
      '<form id="gateForm">' +
        '<div class="field"><label for="fPass">Mot de passe</label><input id="fPass" type="password" required></div>' +
        '<button type="submit" class="btn btn-primary" style="width:100%;" id="gateBtn">Se connecter</button>' +
      '</form>' +
    '</div></div>';

    document.getElementById("gateForm").addEventListener("submit", function(ev){
      ev.preventDefault();
      var btn = document.getElementById("gateBtn");
      btn.disabled = true; btn.textContent = "Vérification…";
      password = document.getElementById("fPass").value;
      loadAdminData(function(ok, err){
        if (!ok){
          btn.disabled = false; btn.textContent = "Se connecter";
          renderGate(err || "Mot de passe incorrect.");
          return;
        }
        try{ sessionStorage.setItem("quizAdminPass", password); }catch(e){}
        renderDashboard();
      });
    });
  }

  function loadAdminData(cb){
    fetch(SCRIPT_URL + "?action=admin&password=" + encodeURIComponent(password), {method:"GET"})
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (!data || data.error === "unauthorized"){ cb(false, "Mot de passe incorrect."); return; }
        if (!data.questions || !data.modules){ cb(false, "Réponse inattendue du serveur."); return; }
        state.modules = data.modules.map(function(m){
          return { module: m.module, dureeMinutes: Number(m.dureeMinutes)||10, pointsParQuestion: Number(m.pointsParQuestion)||0.25, actif: m.actif !== false };
        });
        state.questions = data.questions.map(function(q){
          return { module: q.module || "", q: q.q || "", opts: {A:(q.opts&&q.opts.A)||"", B:(q.opts&&q.opts.B)||"", C:(q.opts&&q.opts.C)||"", D:(q.opts&&q.opts.D)||""}, correct: q.correct || "A" };
        });
        if (!selectedModule || !state.modules.some(function(m){ return m.module === selectedModule; })){
          selectedModule = state.modules.length ? state.modules[0].module : "";
        }
        cb(true);
      })
      .catch(function(){ cb(false, "Connexion au serveur impossible. Réessaie."); });
  }

  function renderDashboard(){
    app.innerHTML =
      '<div class="card admin-section">' +
        '<div class="admin-toolbar">' +
          '<div><h2 style="margin-bottom:2px;">Modules / évaluations</h2><p class="sublead" style="margin:0;">Chaque module a ses propres questions, sa durée et ses points. Décoche "Actif" pour le retirer temporairement du site sans le supprimer.</p></div>' +
        '</div>' +
        '<div id="modList"></div>' +
        '<div class="admin-toolbar" style="margin-top:4px;">' +
          '<button class="btn" id="addModBtn">+ Ajouter un module</button>' +
          '<button class="btn btn-primary" id="saveModBtn">Enregistrer les modules</button>' +
        '</div>' +
      '</div>' +

      '<div class="card admin-section">' +
        '<div class="admin-toolbar">' +
          '<div><h2 style="margin-bottom:2px;">Questions</h2><p class="sublead" style="margin:0;">Choisis le module à modifier ci-dessous.</p></div>' +
          '<select id="modSelForQ" style="max-width:220px;"></select>' +
        '</div>' +
        '<div class="admin-toolbar">' +
          '<div></div>' +
          '<button class="btn" id="addQBtn">+ Ajouter une question</button>' +
        '</div>' +
        '<div id="qList"></div>' +
        '<button class="btn btn-primary" id="saveQBtn" style="margin-top:8px;">Enregistrer les questions de ce module</button>' +
      '</div>';

    renderModuleList();
    renderModuleSelect();
    renderQuestionList();

    document.getElementById("addModBtn").addEventListener("click", function(){
      state.modules.push({module:"", dureeMinutes:10, pointsParQuestion:0.25, actif:true});
      renderModuleList();
    });
    document.getElementById("saveModBtn").addEventListener("click", saveModules);
    document.getElementById("modSelForQ").addEventListener("change", function(ev){
      selectedModule = ev.target.value;
      renderQuestionList();
    });
    document.getElementById("addQBtn").addEventListener("click", function(){
      if (!selectedModule){ toast("Ajoute d'abord un module."); return; }
      state.questions.push({module:selectedModule, q:"", opts:{A:"",B:"",C:"",D:""}, correct:"A"});
      renderQuestionList();
    });
    document.getElementById("saveQBtn").addEventListener("click", saveQuestions);
  }

  function renderModuleList(){
    var el = document.getElementById("modList");
    if (!el) return;
    el.innerHTML = state.modules.map(function(m, idx){
      return '<div class="qedit" data-idx="' + idx + '">' +
        '<div class="row2" style="margin-bottom:8px;">' +
          '<div class="field" style="margin:0;"><label>Nom du module</label>' +
            '<input type="text" class="modName" data-idx="' + idx + '" value="' + esc(m.module) + '" placeholder="ex : Python"' + (m.module ? ' readonly' : '') + '></div>' +
          '<div class="row2" style="margin:0;">' +
            '<div class="field" style="margin:0;"><label>Durée (min)</label><input type="number" class="modDuree" data-idx="' + idx + '" min="1" max="180" value="' + esc(m.dureeMinutes) + '"></div>' +
            '<div class="field" style="margin:0;"><label>Pts/question</label><input type="number" class="modPoints" data-idx="' + idx + '" step="0.05" min="0" value="' + esc(m.pointsParQuestion) + '"></div>' +
          '</div>' +
        '</div>' +
        '<div class="qedit-foot">' +
          '<label style="display:flex;align-items:center;gap:6px;font-size:13px;"><input type="checkbox" class="modActif" data-idx="' + idx + '"' + (m.actif ? ' checked' : '') + '> Actif (visible par les étudiants)</label>' +
          '<button class="icon-btn delModBtn" data-idx="' + idx + '">Supprimer</button>' +
        '</div>' +
      '</div>';
    }).join("") || '<p class="sublead">Aucun module. Clique sur « + Ajouter un module ».</p>';

    el.querySelectorAll(".modName").forEach(function(input){
      input.addEventListener("input", function(){ state.modules[Number(input.getAttribute("data-idx"))].module = input.value; });
    });
    el.querySelectorAll(".modDuree").forEach(function(input){
      input.addEventListener("input", function(){ state.modules[Number(input.getAttribute("data-idx"))].dureeMinutes = Number(input.value)||10; });
    });
    el.querySelectorAll(".modPoints").forEach(function(input){
      input.addEventListener("input", function(){ state.modules[Number(input.getAttribute("data-idx"))].pointsParQuestion = Number(input.value)||0.25; });
    });
    el.querySelectorAll(".modActif").forEach(function(input){
      input.addEventListener("change", function(){ state.modules[Number(input.getAttribute("data-idx"))].actif = input.checked; });
    });
    el.querySelectorAll(".delModBtn").forEach(function(btn){
      btn.addEventListener("click", function(){
        var idx = Number(btn.getAttribute("data-idx"));
        var removed = state.modules[idx];
        if (removed.module && state.questions.some(function(q){ return q.module === removed.module; })){
          if (!confirm('Ce module contient des questions. Les supprimer aussi ? (Annuler pour juste le décocher "Actif" à la place)')){
            return;
          }
          state.questions = state.questions.filter(function(q){ return q.module !== removed.module; });
        }
        state.modules.splice(idx, 1);
        renderModuleList();
        renderModuleSelect();
        renderQuestionList();
      });
    });
  }

  function renderModuleSelect(){
    var sel = document.getElementById("modSelForQ");
    if (!sel) return;
    var names = state.modules.map(function(m){ return m.module; }).filter(Boolean);
    sel.innerHTML = names.map(function(n){ return '<option value="' + esc(n) + '"' + (n === selectedModule ? " selected" : "") + '>' + esc(n) + '</option>'; }).join("") || '<option value="">Aucun module</option>';
  }

  function renderQuestionList(){
    var listEl = document.getElementById("qList");
    if (!listEl) return;
    var qCountEl = document.querySelector(".admin-section:nth-of-type(2) .sublead");
    var moduleQs = state.questions.map(function(item, globalIdx){ return {item:item, globalIdx:globalIdx}; })
      .filter(function(x){ return x.item.module === selectedModule; });

    listEl.innerHTML = moduleQs.map(function(entry, i){
      var item = entry.item;
      var globalIdx = entry.globalIdx;
      var letters = ["A","B","C","D"];
      var optsHtml = letters.map(function(l){
        return '<div class="qedit-opt">' +
          '<input type="radio" name="correct' + globalIdx + '" value="' + l + '"' + (item.correct === l ? " checked" : "") + ' data-gidx="' + globalIdx + '" class="correctRadio">' +
          '<span class="optletter">' + l + '</span>' +
          '<input type="text" placeholder="Proposition ' + l + (l === "D" ? " (optionnel)" : "") + '" value="' + esc(item.opts[l]) + '" data-gidx="' + globalIdx + '" data-letter="' + l + '" class="optInput">' +
        '</div>';
      }).join("");
      return '<div class="qedit" data-gidx="' + globalIdx + '">' +
        '<div class="qedit-top">' +
          '<div class="qnum">' + (i+1) + '</div>' +
          '<textarea class="qtextInput" data-gidx="' + globalIdx + '" placeholder="Texte de la question">' + esc(item.q) + '</textarea>' +
        '</div>' +
        '<div class="qedit-opts">' + optsHtml + '</div>' +
        '<div class="qedit-foot">' +
          '<span class="qedit-hint">Bonne réponse : ' + item.correct + '</span>' +
          '<button class="icon-btn delQBtn" data-gidx="' + globalIdx + '">Supprimer</button>' +
        '</div>' +
      '</div>';
    }).join("") || '<p class="sublead">Aucune question pour ce module. Clique sur « + Ajouter une question ».</p>';

    listEl.querySelectorAll(".qtextInput").forEach(function(el){
      el.addEventListener("input", function(){ state.questions[Number(el.getAttribute("data-gidx"))].q = el.value; });
    });
    listEl.querySelectorAll(".optInput").forEach(function(el){
      el.addEventListener("input", function(){
        var gidx = Number(el.getAttribute("data-gidx"));
        var letter = el.getAttribute("data-letter");
        state.questions[gidx].opts[letter] = el.value;
      });
    });
    listEl.querySelectorAll(".correctRadio").forEach(function(el){
      el.addEventListener("change", function(){
        state.questions[Number(el.getAttribute("data-gidx"))].correct = el.value;
        renderQuestionList();
      });
    });
    listEl.querySelectorAll(".delQBtn").forEach(function(el){
      el.addEventListener("click", function(){
        state.questions.splice(Number(el.getAttribute("data-gidx")), 1);
        renderQuestionList();
      });
    });
  }

  function saveModules(){
    var btn = document.getElementById("saveModBtn");
    var cleaned = state.modules
      .map(function(m){ return { module: (m.module||"").trim(), dureeMinutes: Number(m.dureeMinutes)||10, pointsParQuestion: Number(m.pointsParQuestion)||0.25, actif: !!m.actif }; })
      .filter(function(m){ return m.module; });
    var names = cleaned.map(function(m){ return m.module; });
    var dupes = names.filter(function(n, i){ return names.indexOf(n) !== i; });
    if (dupes.length){
      toast("Deux modules ne peuvent pas avoir le même nom (" + dupes[0] + ").");
      return;
    }
    btn.disabled = true; btn.textContent = "Enregistrement…";
    fetch(SCRIPT_URL, {
      method:"POST", mode:"no-cors", headers:{"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify({action:"saveModules", password: password, modules: cleaned})
    }).then(function(){
      state.modules = cleaned;
      btn.disabled = false; btn.textContent = "Enregistrer les modules";
      toast("Modules enregistrés ✓");
      renderModuleSelect();
    }).catch(function(){
      btn.disabled = false; btn.textContent = "Enregistrer les modules";
      toast("Échec de l'enregistrement");
    });
  }

  function saveQuestions(){
    if (!selectedModule){ toast("Choisis ou crée un module d'abord."); return; }
    var btn = document.getElementById("saveQBtn");
    var cleaned = state.questions
      .filter(function(item){ return item.module === selectedModule; })
      .filter(function(item){ return item.q && item.q.trim() && item.opts.A && item.opts.A.trim() && item.opts.B && item.opts.B.trim(); })
      .map(function(item){
        return { q: item.q.trim(), opts: {A:item.opts.A.trim(), B:item.opts.B.trim(), C:(item.opts.C||"").trim(), D:(item.opts.D||"").trim()}, correct: item.correct };
      });
    if (!cleaned.length){
      toast("Chaque question a besoin d'un texte et au moins des propositions A et B.");
      return;
    }
    btn.disabled = true; btn.textContent = "Enregistrement…";
    fetch(SCRIPT_URL, {
      method:"POST", mode:"no-cors", headers:{"Content-Type":"text/plain;charset=utf-8"},
      body: JSON.stringify({action:"saveQuestions", password: password, module: selectedModule, questions: cleaned})
    }).then(function(){
      state.questions = state.questions.filter(function(q){ return q.module !== selectedModule; })
        .concat(cleaned.map(function(c){ return {module:selectedModule, q:c.q, opts:c.opts, correct:c.correct}; }));
      btn.disabled = false; btn.textContent = "Enregistrer les questions de ce module";
      toast(cleaned.length + " question(s) enregistrée(s) pour « " + selectedModule + " » ✓");
      renderQuestionList();
    }).catch(function(){
      btn.disabled = false; btn.textContent = "Enregistrer les questions de ce module";
      toast("Échec de l'enregistrement");
    });
  }

  function init(){
    if (!SCRIPT_URL || SCRIPT_URL.indexOf("http") !== 0){
      renderConfigError();
      return;
    }
    var saved = "";
    try{ saved = sessionStorage.getItem("quizAdminPass") || ""; }catch(e){}
    if (saved){
      password = saved;
      loadAdminData(function(ok){
        if (ok){ renderDashboard(); } else { renderGate(); }
      });
    } else {
      renderGate();
    }
  }

  init();
})();
