(function(){
  "use strict";

  var CFG = window.QUIZ_CONFIG || {};
  var SCRIPT_URL = CFG.googleScriptUrl || "";

  var app = document.getElementById("app");

  var MODULES = [];       // [{module, dureeMinutes, pointsParQuestion}]
  var QUESTIONS = [];
  var MODULE_NAME = "";
  var MINUTES = 10;
  var POINTS_PER_Q = 0.25;
  var TOTAL_POINTS = 0;

  var reg = null;
  var answers = {};
  var timerInterval = null;
  var secondsLeft = 0;
  var submitting = false;

  function esc(s){
    var d = document.createElement("div");
    d.textContent = String(s == null ? "" : s);
    return d.innerHTML;
  }

  function storageKey(module, id){
    return "quizDone_" + module + "_" + id;
  }

  function fmtTime(sec){
    sec = Math.max(0, sec);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return (m < 10 ? "0" + m : "" + m) + ":" + (s < 10 ? "0" + s : "" + s);
  }

  function renderLoading(msg){
    app.innerHTML = '<div class="center-msg">' + esc(msg || "Chargement…") + '</div>';
  }

  function renderConfigError(){
    app.innerHTML = '<div class="register-wrap"><div class="card register-card">' +
      '<h1>Configuration manquante</h1>' +
      '<p class="lead">L\'URL du script Google (dans config.js) n\'est pas renseignée. Contacte l\'enseignant.</p>' +
    '</div></div>';
  }

  function renderLoadError(){
    app.innerHTML = '<div class="register-wrap"><div class="card register-card">' +
      '<h1>Impossible de charger le quiz</h1>' +
      '<p class="lead">La connexion au serveur a échoué. Vérifie ta connexion internet et recharge la page. Si le problème persiste, préviens l\'enseignant.</p>' +
      '<button class="btn btn-primary" id="retryBtn" style="width:100%;">Réessayer</button>' +
    '</div></div>';
    var b = document.getElementById("retryBtn");
    if (b) b.addEventListener("click", loadModulesAndStart);
  }

  function loadModulesAndStart(){
    renderLoading();
    if (!SCRIPT_URL || SCRIPT_URL.indexOf("http") !== 0){
      renderConfigError();
      return;
    }
    fetch(SCRIPT_URL + "?action=modules", {method:"GET"})
      .then(function(r){ return r.json(); })
      .then(function(data){
        if (!data || !data.modules){ renderLoadError(); return; }
        MODULES = data.modules || [];
        if (!MODULES.length){
          app.innerHTML = '<div class="register-wrap"><div class="card register-card">' +
            '<h1>Aucune évaluation disponible</h1>' +
            '<p class="lead">L\'enseignant n\'a pas encore configuré de module. Réessaie plus tard.</p>' +
          '</div></div>';
          return;
        }
        renderRegister();
      })
      .catch(renderLoadError);
  }

  function renderRegister(opts){
    opts = opts || {};
    var moduleFieldHtml;
    if (MODULES.length > 1){
      moduleFieldHtml = '<div class="field"><label for="fModuleSel">Module / évaluation</label>' +
        '<select id="fModuleSel" required>' +
          '<option value="">Choisir…</option>' +
          MODULES.map(function(m){ return '<option value="' + esc(m.module) + '">' + esc(m.module) + '</option>'; }).join("") +
        '</select></div>';
    } else {
      moduleFieldHtml = '<input type="hidden" id="fModuleSel" value="' + esc(MODULES[0].module) + '">';
    }

    app.innerHTML =
      '<div class="register-wrap"><div class="card register-card">' +
        '<h1>Quiz' + (MODULES.length === 1 ? ' — ' + esc(MODULES[0].module) : '') + '</h1>' +
        '<p class="lead">' + (MODULES.length > 1 ? "Choisis ton évaluation, puis remplis tes informations." : (MODULES[0].dureeMinutes + " minutes · " + Number(MODULES[0].pointsParQuestion).toFixed(2).replace(".",",") + " pt par bonne réponse")) + '</p>' +
        (opts.error ? '<div class="error-box">' + esc(opts.error) + '</div>' : '') +
        '<form id="regForm">' +
          moduleFieldHtml +
          '<div class="field"><label for="fNom">Nom</label><input id="fNom" name="nom" autocomplete="family-name" required></div>' +
          '<div class="field"><label for="fPrenom">Prénom</label><input id="fPrenom" name="prenom" autocomplete="given-name" required></div>' +
          '<div class="row2">' +
            '<div class="field"><label for="fClasse">Classe</label>' +
              '<select id="fClasse" name="classe" required>' +
                '<option value="">Choisir…</option>' +
                '<option value="Master 1">Master 1</option>' +
                '<option value="Master 2">Master 2</option>' +
              '</select>' +
            '</div>' +
            '<div class="field"><label for="fId">Identifiant</label><input id="fId" name="identifiant" required placeholder="ex : e2451"></div>' +
          '</div>' +
          '<div class="hint" style="margin:-8px 0 18px;">Un seul essai par identifiant et par module, sur cet appareil.</div>' +
          '<button type="submit" class="btn btn-primary" style="width:100%;" id="startBtn">Commencer le quiz</button>' +
        '</form>' +
      '</div></div>';

    document.getElementById("regForm").addEventListener("submit", function(ev){
      ev.preventDefault();
      var moduleSel = document.getElementById("fModuleSel").value;
      var nom = document.getElementById("fNom").value.trim();
      var prenom = document.getElementById("fPrenom").value.trim();
      var classe = document.getElementById("fClasse").value;
      var identifiant = document.getElementById("fId").value.trim();
      if (!moduleSel || !nom || !prenom || !classe || !identifiant){ return; }

      var already = false;
      try{ already = !!localStorage.getItem(storageKey(moduleSel, identifiant)); }catch(e){}
      if (already){
        renderRegister({error:"Tu as déjà répondu à ce module avec cet identifiant sur cet appareil."});
        return;
      }

      reg = {nom:nom, prenom:prenom, classe:classe, identifiant:identifiant, module:moduleSel};
      var startBtn = document.getElementById("startBtn");
      startBtn.disabled = true; startBtn.textContent = "Chargement du quiz…";

      fetch(SCRIPT_URL + "?action=questions&module=" + encodeURIComponent(moduleSel), {method:"GET"})
        .then(function(r){ return r.json(); })
        .then(function(data){
          if (!data || !data.questions || !data.questions.length){
            renderRegister({error:"Aucune question disponible pour ce module pour le moment."});
            return;
          }
          QUESTIONS = data.questions;
          var cfg = data.config || {};
          MODULE_NAME = moduleSel;
          MINUTES = Number(cfg.dureeMinutes) || 10;
          POINTS_PER_Q = Number(cfg.pointsParQuestion) || 0.25;
          TOTAL_POINTS = Math.round(QUESTIONS.length * POINTS_PER_Q * 100) / 100;
          answers = {};
          secondsLeft = MINUTES * 60;
          renderQuiz();
          startTimer();
        })
        .catch(function(){
          renderRegister({error:"Impossible de charger les questions. Réessaie."});
        });
    });
  }

  function startTimer(){
    stopTimer();
    updateTimerBar();
    timerInterval = setInterval(function(){
      secondsLeft -= 1;
      if (secondsLeft <= 0){
        secondsLeft = 0;
        updateTimerBar();
        stopTimer();
        submitQuiz(true);
        return;
      }
      updateTimerBar();
    }, 1000);
  }
  function stopTimer(){ if (timerInterval){ clearInterval(timerInterval); timerInterval = null; } }

  function updateTimerBar(){
    var numEl = document.getElementById("timerNum");
    var wrapEl = document.getElementById("timerWrap");
    var barEl = document.getElementById("timerFill");
    var progEl = document.getElementById("progressTxt");
    if (!numEl) return;
    numEl.textContent = fmtTime(secondsLeft);
    var totalSec = MINUTES * 60;
    var pct = totalSec > 0 ? Math.max(0, Math.min(100, (secondsLeft / totalSec) * 100)) : 0;
    if (barEl) barEl.style.width = pct + "%";
    wrapEl.classList.remove("low","mid");
    if (secondsLeft <= 30) wrapEl.classList.add("low");
    else if (secondsLeft <= 60) wrapEl.classList.add("mid");
    if (progEl){
      var answered = Object.keys(answers).length;
      progEl.textContent = answered + " / " + QUESTIONS.length + " répondues";
    }
  }

  function renderQuiz(){
    var letters = ["A","B","C","D"];
    var qHtml = QUESTIONS.map(function(item, idx){
      var optsHtml = letters.filter(function(l){ return item.opts && item.opts[l] != null && item.opts[l] !== ""; }).map(function(l){
        return '<label class="opt">' +
          '<input type="radio" name="q' + idx + '" value="' + l + '">' +
          '<span class="optletter">' + l + '</span><span>' + esc(item.opts[l]) + '</span>' +
        '</label>';
      }).join("");
      return '<div class="card qcard">' +
        '<div class="qhead"><div class="qnum">' + (idx+1) + '</div><div class="qtext">' + esc(item.q) + '</div></div>' +
        '<div class="opts" data-qidx="' + idx + '">' + optsHtml + '</div>' +
      '</div>';
    }).join("");

    app.innerHTML =
      '<div class="timerbar" id="timerWrap">' +
        '<div><span class="mono timer-num" id="timerNum">--:--</span></div>' +
        '<div class="bar"><span id="timerFill" style="width:100%"></span></div>' +
        '<div class="progress-txt" id="progressTxt">0 / ' + QUESTIONS.length + ' répondues</div>' +
      '</div>' +
      qHtml +
      '<div class="submitbar"><button class="btn btn-primary" id="submitBtn">Envoyer mes réponses</button></div>';

    document.querySelectorAll(".opts").forEach(function(optsEl){
      var idx = Number(optsEl.getAttribute("data-qidx"));
      optsEl.addEventListener("change", function(ev){
        answers[idx] = ev.target.value;
        optsEl.querySelectorAll(".opt").forEach(function(o){ o.classList.remove("checked"); });
        ev.target.closest(".opt").classList.add("checked");
        updateTimerBar();
      });
    });
    document.getElementById("submitBtn").addEventListener("click", function(){ submitQuiz(false); });
    updateTimerBar();
  }

  function submitQuiz(auto){
    if (submitting) return;
    submitting = true;
    stopTimer();
    var btn = document.getElementById("submitBtn");
    if (btn){ btn.disabled = true; btn.textContent = "Envoi…"; }

    // La note n'est PAS calculée ici : seules les réponses brutes (A/B/C/D)
    // sont envoyées. Le script Google compare côté serveur à la clé de
    // correction stockée dans le Sheet — jamais visible du navigateur.
    var payload = {
      action: "submit",
      module: reg.module,
      nom: reg.nom, prenom: reg.prenom, classe: reg.classe, identifiant: reg.identifiant,
      auto: !!auto,
      reponses: answers,
      horodatage: new Date().toISOString()
    };

    try{ localStorage.setItem(storageKey(reg.module, reg.identifiant), "1"); }catch(e){}

    var finish = function(){ submitting = false; renderDone(); };

    fetch(SCRIPT_URL, {
      method: "POST",
      mode: "no-cors", // réponse illisible depuis un autre domaine ; on considère l'envoi réussi
      headers: {"Content-Type": "text/plain;charset=utf-8"},
      body: JSON.stringify(payload)
    }).then(finish).catch(finish);
  }

  function renderDone(){
    app.innerHTML =
      '<div class="done-wrap"><div class="card done-card">' +
        '<div class="done-mark">✓</div>' +
        '<h2>Merci d\'avoir répondu, à la prochaine !</h2>' +
        '<p>Ta réponse a bien été enregistrée. Tu peux fermer cette page.</p>' +
      '</div></div>';
  }

  loadModulesAndStart();
})();
