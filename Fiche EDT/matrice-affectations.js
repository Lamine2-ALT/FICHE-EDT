/* ==========================================================
MATRICE D'AFFECTATIONS — vue par matière / par classe / vérification
Fichier indépendant : en cas d'erreur ici, le reste de la fiche
continue de fonctionner normalement.
========================================================== */

var mxState = { mode: "mat", matiere: "", classe: "", spec: true, onlyInc: false };

function mxToggleCls(el, cls, on){
  if(!el) return;
  if(on){ el.classList.add(cls); } else { el.classList.remove(cls); }
}
function mxSetMode(mode){ mxState.mode = mode; refreshMatrix(); }
function mxSetSpec(v){ mxState.spec = !!v; refreshMatrix(); }
function mxSetOnlyInc(v){ mxState.onlyInc = !!v; refreshMatrix(); }

function mxSubjects(){
  var out = [];
  var opts = document.querySelectorAll("#matieres option");
  for(var i=0;i<opts.length;i++){ if(opts[i].value) out.push(opts[i].value); }
  return out;
}
function mxGetClassesFull(){
  var rows = document.querySelectorAll("#tb-classes tr");
  var out = [];
  for(var i=0;i<rows.length;i++){
    var name = val(rows[i], "classe-name");
    if(!name) continue;
    var dup = false;
    for(var d=0;d<out.length;d++){ if(out[d].name === name){ dup = true; break; } }
    if(dup) continue;
    out.push({ name: name, niveau: val(rows[i], "classe-niveau"), profil: val(rows[i], "classe-profil") });
  }
  return out;
}
function mxGetProfsFull(){
  var rows = document.querySelectorAll("#tb-professeurs tr");
  var out = [];
  for(var i=0;i<rows.length;i++){
    var nom = val(rows[i], "prof-nom");
    if(!nom) continue;
    out.push({ nom: nom, mat: val(rows[i], "prof-mat"), autres: val(rows[i], "prof-autres") });
  }
  return out;
}
function mxProfSpecialties(p){
  var list = [];
  if(p.mat) list.push(normalizeDiscipline(p.mat));
  if(p.autres){
    var parts = String(p.autres).split(/[,;/]+/);
    for(var i=0;i<parts.length;i++){
      var t = parts[i].trim();
      if(t) list.push(normalizeDiscipline(t));
    }
  }
  return list;
}
function mxIsSpecialist(p, matiere){
  var target = normalizeDiscipline(matiere);
  var specs = mxProfSpecialties(p);
  for(var i=0;i<specs.length;i++){ if(specs[i] === target) return true; }
  return false;
}
function mxOfficialSubjects(niveau, profil){
  var out = [];
  if(!niveau || !profil) return out;
  var subjects = mxSubjects();
  var seen = {};
  for(var i=0;i<subjects.length;i++){
    var key = normalizeText(niveau) + "|" + normalizeText(profil) + "|" + normalizeDiscipline(subjects[i]);
    if(REF_MAP.hasOwnProperty(key) && !seen[key]){
      seen[key] = true;
      out.push({ matiere: subjects[i], heures: REF_MAP[key] });
    }
  }
  return out;
}
function mxGetAffectRows(){
  return document.querySelectorAll("#tb-affectations tr");
}
function mxRowMatch(row, classe, matiere, prof){
  if(classe !== null && val(row, "affect-classe") !== classe) return false;
  if(matiere !== null && normalizeDiscipline(val(row, "affect-matiere")) !== normalizeDiscipline(matiere)) return false;
  if(prof !== null && val(row, "affect-prof") !== prof) return false;
  return true;
}
function mxIsAssigned(classe, matiere, prof){
  var rows = mxGetAffectRows();
  for(var i=0;i<rows.length;i++){
    if(mxRowMatch(rows[i], classe, matiere, prof)) return true;
  }
  return false;
}
function mxTotals(){
  var rows = mxGetAffectRows();
  var totals = {};
  for(var i=0;i<rows.length;i++){
    var prof = val(rows[i], "affect-prof");
    var h = parseFloat(val(rows[i], "affect-heures"));
    if(isNaN(h)) h = 0;
    if(prof) totals[prof] = (totals[prof] || 0) + h;
  }
  return totals;
}
function mxAssign(classe, matiere, prof){
  refreshClassSelects();
  refreshProfSelects();
  var row = appendBlankRow("tb-affectations", "tpl-affectations");
  if(!row) return;
  setSelectValue(row.querySelector(".affect-classe"), classe);
  setVal(row, "affect-matiere", matiere);
  setSelectValue(row.querySelector(".affect-prof"), prof);
  var heuresEl = row.querySelector(".affect-heures");
  if(heuresEl) heuresEl.dataset.manual = "";
  updateAffectRowHeures(row);
  renumber("tb-affectations");
  updateProfTotals();
}
function mxUnassign(classe, matiere, prof){
  var rows = mxGetAffectRows();
  var toRemove = [];
  for(var i=0;i<rows.length;i++){
    if(mxRowMatch(rows[i], classe, matiere, prof)) toRemove.push(rows[i]);
  }
  if(toRemove.length === 0) return;
  var hasExtra = false;
  for(var j=0;j<toRemove.length;j++){
    var hEl = toRemove[j].querySelector(".affect-heures");
    var obs = val(toRemove[j], "affect-obs");
    if(obs || (hEl && hEl.dataset.manual === "1")) hasExtra = true;
  }
  if(hasExtra && !confirm("Cette affectation contient des heures modifiées manuellement ou des observations. La retirer quand même ?")) return;
  for(var k=0;k<toRemove.length;k++) toRemove[k].remove();
  renumber("tb-affectations");
  updateProfTotals();
}
function mxCellClick(btn){
  var classe = btn.getAttribute("data-classe") || "";
  var matiere = btn.getAttribute("data-matiere") || "";
  var prof = btn.getAttribute("data-prof") || "";
  if(btn.classList.contains("on")){
    mxUnassign(classe, matiere, prof);
  }else{
    mxAssign(classe, matiere, prof);
  }
}
function mxPickMatIdx(i){
  var s = mxSubjects();
  if(s[i]) mxState.matiere = s[i];
  refreshMatrix();
}
function mxPickClIdx(i){
  var classes = mxGetClassesFull();
  if(classes[i]) mxState.classe = classes[i].name;
  refreshMatrix();
}
function mxGoClIdx(i){
  var classes = mxGetClassesFull();
  if(!classes[i]) return;
  mxState.mode = "cl";
  mxState.classe = classes[i].name;
  refreshMatrix();
}
function mxCellHtml(classe, matiere, prof, on, extraCls, title){
  return "<td><button type=\"button\" class=\"mx-cell" + (on ? " on" : "") + (extraCls || "") +
  "\" data-classe=\"" + escapeHtml(classe) + "\" data-matiere=\"" + escapeHtml(matiere) +
  "\" data-prof=\"" + escapeHtml(prof) + "\" title=\"" + escapeHtml(title || "") +
  "\" aria-pressed=\"" + on + "\" onclick=\"mxCellClick(this)\"></button></td>";
}

function mxRenderMat(chipsEl, tableEl, footEl, classes, profs){
  var subjects = mxSubjects();
  if(!mxState.matiere || subjects.indexOf(mxState.matiere) === -1) mxState.matiere = subjects[0] || "";
  var m = mxState.matiere;
  var html = "";
  for(var i=0;i<subjects.length;i++){
    var s = subjects[i];
    var required = 0, covered = 0;
    for(var c=0;c<classes.length;c++){
      var off = mxOfficialSubjects(classes[c].niveau, classes[c].profil);
      var demands = false;
      for(var o=0;o<off.length;o++){
        if(normalizeDiscipline(off[o].matiere) === normalizeDiscipline(s)){ demands = true; break; }
      }
      if(demands){
        required++;
        if(mxIsAssigned(classes[c].name, s, null)) covered++;
      }
    }
    var cls = "mx-chip" + (s === m ? " active" : "") + (required > 0 && covered === required ? " full" : "");
    html += "<button type=\"button\" class=\"" + cls + "\" onclick=\"mxPickMatIdx(" + i + ")\">" +
    escapeHtml(s) + " <em>" + covered + "/" + required + "</em></button>";
  }
  chipsEl.innerHTML = html;
  var list = [];
  for(var p=0;p<profs.length;p++){
    if(mxState.spec && !mxIsSpecialist(profs[p], m)) continue;
    list.push(profs[p]);
  }
  if(!mxState.spec){
    list.sort(function(a,b){ return (mxIsSpecialist(b,m)?1:0) - (mxIsSpecialist(a,m)?1:0); });
  }
  var totals = mxTotals();
  var t = "<thead><tr><th class=\"mx-corner\">Professeur ↓ / Classe →</th>";
  for(var c2=0;c2<classes.length;c2++){
    var done = mxIsAssigned(classes[c2].name, m, null);
    t += "<th>" + escapeHtml(classes[c2].name) + "<span class=\"mx-dot" + (done ? " on" : "") + "\"></span></th>";
  }
  t += "</tr></thead><tbody>";
  if(list.length === 0){
    t += "<tr><th class=\"mx-rowh\">Aucun professeur spécialisé</th><td colspan=\"" + Math.max(classes.length,1) +
    "\" style=\"text-align:left;font-size:.8rem;color:#777\">Décochez « Spécialistes uniquement » pour afficher tous les professeurs.</td></tr>";
  }
  for(var p2=0;p2<list.length;p2++){
    var pr = list[p2];
    var spec = mxIsSpecialist(pr, m);
    var tot = totals[pr.nom] || 0;
    t += "<tr><th class=\"mx-rowh\"><span class=\"mx-name\">" + escapeHtml(pr.nom) +
    (spec ? "" : " <span class=\"mx-dot ko\" title=\"Hors spécialité déclarée\"></span>") + "</span>";
    var subs = [];
    if(pr.mat) subs.push(escapeHtml(pr.mat));
    if(pr.autres) subs.push(escapeHtml(pr.autres));
    if(subs.length) t += "<span class=\"mx-sub\">" + subs.join(" · ") + "</span>";
    if(tot > 0) t += "<span class=\"mx-total\" style=\"background:" + colorForHours(tot) + "\">" + formatHours(tot) + "</span>";
    t += "</th>";
    for(var c3=0;c3<classes.length;c3++){
      var on = mxIsAssigned(classes[c3].name, m, pr.nom);
      var title = pr.nom + " — " + m + " — " + classes[c3].name + (on ? " (affecté, cliquer pour retirer)" : " (cliquer pour affecter)");
      t += mxCellHtml(classes[c3].name, m, pr.nom, on, "", title);
    }
    t += "</tr>";
  }
  t += "</tbody>";
  tableEl.innerHTML = t;
  var missReq = [], noProfil = [];
  for(var c4=0;c4<classes.length;c4++){
    if(!classes[c4].niveau || !classes[c4].profil){
      if(!mxIsAssigned(classes[c4].name, m, null)) noProfil.push(classes[c4].name);
      continue;
    }
    var off2 = mxOfficialSubjects(classes[c4].niveau, classes[c4].profil);
    var demands2 = false;
    for(var o2=0;o2<off2.length;o2++){
      if(normalizeDiscipline(off2[o2].matiere) === normalizeDiscipline(m)){ demands2 = true; break; }
    }
    if(demands2 && !mxIsAssigned(classes[c4].name, m, null)) missReq.push(classes[c4].name);
  }
  var foot = "";
  if(missReq.length){
    foot += "<b>Classes sans professeur de " + escapeHtml(m) + " (matière officielle) :</b> " +
    missReq.map(function(x){ return "<span class=\"mx-miss-tag\">" + escapeHtml(x) + "</span>"; }).join(" ");
  }else{
    foot += "<span style=\"color:#006b32;font-weight:700\">✔ Toutes les classes qui demandent officiellement " + escapeHtml(m) + " ont un professeur.</span>";
  }
  if(noProfil.length){
    foot += "<br><span class=\"mx-small-note\">Niveau/profil non renseignés (vérification impossible) : " +
    noProfil.map(escapeHtml).join(", ") + "</span>";
  }
  footEl.innerHTML = foot;
}

function mxRenderCl(chipsEl, tableEl, footEl, classes, profs){
  var names = [];
  for(var n0=0;n0<classes.length;n0++) names.push(classes[n0].name);
  if(!mxState.classe || names.indexOf(mxState.classe) === -1) mxState.classe = names[0] || "";
  var html = "";
  for(var i=0;i<classes.length;i++){
    var cl = classes[i];
    var off = mxOfficialSubjects(cl.niveau, cl.profil);
    var covered = 0;
    for(var o=0;o<off.length;o++){ if(mxIsAssigned(cl.name, off[o].matiere, null)) covered++; }
    var cls = "mx-chip" + (cl.name === mxState.classe ? " active" : "") + (off.length > 0 && covered === off.length ? " full" : "");
    html += "<button type=\"button\" class=\"" + cls + "\" onclick=\"mxPickClIdx(" + i + ")\">" +
    escapeHtml(cl.name) + " <em>" + covered + "/" + off.length + "</em></button>";
  }
  chipsEl.innerHTML = html;
  var clObj = null;
  for(var f=0;f<classes.length;f++){ if(classes[f].name === mxState.classe){ clObj = classes[f]; break; } }
  var rowSubjects = [];
  var off2 = clObj ? mxOfficialSubjects(clObj.niveau, clObj.profil) : [];
  for(var o2=0;o2<off2.length;o2++) rowSubjects.push({ matiere: off2[o2].matiere, heures: off2[o2].heures, hors: false });
  var rowsA = mxGetAffectRows();
  for(var r=0;r<rowsA.length;r++){
    if(val(rowsA[r], "affect-classe") !== mxState.classe) continue;
    var rm = val(rowsA[r], "affect-matiere");
    if(!rm) continue;
    var found = false;
    for(var s2=0;s2<rowSubjects.length;s2++){
      if(normalizeDiscipline(rowSubjects[s2].matiere) === normalizeDiscipline(rm)){ found = true; break; }
    }
    if(!found) rowSubjects.push({ matiere: rm, heures: null, hors: true });
  }
  var totals = mxTotals();
  var t = "<thead><tr><th class=\"mx-corner\">Matière ↓ / Professeur →</th>";
  for(var p=0;p<profs.length;p++){
    var tot0 = totals[profs[p].nom] || 0;
    t += "<th>" + escapeHtml(profs[p].nom) + (tot0 > 0 ? " (" + formatHours(tot0) + ")" : "") + "</th>";
  }
  t += "</tr></thead><tbody>";
  if(rowSubjects.length === 0){
    t += "<tr><th class=\"mx-rowh\">Aucune matière</th><td colspan=\"" + Math.max(profs.length,1) +
    "\" style=\"text-align:left;font-size:.8rem;color:#777\">Renseignez le niveau et le profil de cette classe (rubrique 2) pour afficher les matières officielles.</td></tr>";
  }
  for(var s3=0;s3<rowSubjects.length;s3++){
    var sub = rowSubjects[s3];
    var assigned = mxIsAssigned(mxState.classe, sub.matiere, null);
    t += "<tr><th class=\"mx-rowh\"><span class=\"mx-name\">" + escapeHtml(sub.matiere) +
    (sub.heures !== null ? " <span class=\"mx-sub\">officiel : " + sub.heures + " h</span>" : "") +
    (sub.hors ? " <span class=\"mx-sub\" style=\"color:#e65100\">hors grille officielle</span>" : "") +
    "<span class=\"mx-dot" + (assigned ? " on" : "") + "\"></span></span></th>";
    for(var p2=0;p2<profs.length;p2++){
      var pr = profs[p2];
      var on = mxIsAssigned(mxState.classe, sub.matiere, pr.nom);
      var spec = mxIsSpecialist(pr, sub.matiere);
      var extra = (!on && mxState.spec) ? (spec ? " rec" : " off") : "";
      var title = pr.nom + " — " + sub.matiere + " — " + mxState.classe +
      (spec ? " (spécialiste)" : " (hors spécialité)") + (on ? " — affecté, cliquer pour retirer" : " — cliquer pour affecter");
      t += mxCellHtml(mxState.classe, sub.matiere, pr.nom, on, extra, title);
    }
    t += "</tr>";
  }
  t += "</tbody>";
  tableEl.innerHTML = t;
  var miss = [];
  for(var o3=0;o3<off2.length;o3++){
    if(!mxIsAssigned(mxState.classe, off2[o3].matiere, null)) miss.push(off2[o3].matiere);
  }
  if(off2.length === 0){
    footEl.innerHTML = "<span class=\"mx-small-note\">Niveau ou profil non renseigné pour cette classe : les matières officielles ne peuvent pas être listées. Complétez la rubrique 2.</span>";
  }else if(miss.length){
    footEl.innerHTML = "<b>Matières officielles sans professeur pour " + escapeHtml(mxState.classe) + " :</b> " +
    miss.map(function(x){ return "<span class=\"mx-miss-tag\">" + escapeHtml(x) + "</span>"; }).join(" ");
  }else{
    footEl.innerHTML = "<span style=\"color:#006b32;font-weight:700\">✔ Classe " + escapeHtml(mxState.classe) + " : toutes les matières officielles ont un professeur.</span>";
  }
}

function mxRenderVerif(chipsEl, tableEl, footEl, classes, profs){
  var incCount = 0, naCount = 0;
  var states = [];
  for(var i=0;i<classes.length;i++){
    var cl = classes[i];
    var off = mxOfficialSubjects(cl.niveau, cl.profil);
    if(!cl.niveau || !cl.profil){
      states.push({ cl: cl, off: off, missing: [], na: true });
      naCount++;
      continue;
    }
    var missing = [];
    for(var o=0;o<off.length;o++){
      if(!mxIsAssigned(cl.name, off[o].matiere, null)) missing.push(off[o].matiere);
    }
    states.push({ cl: cl, off: off, missing: missing, na: false });
    if(missing.length > 0) incCount++;
  }
  chipsEl.innerHTML =
  "<button type=\"button\" class=\"mx-chip" + (!mxState.onlyInc ? " active" : "") + "\" onclick=\"mxSetOnlyInc(false)\">Toutes les classes <em>" + classes.length + "</em></button>" +
  "<button type=\"button\" class=\"mx-chip" + (mxState.onlyInc ? " active" : "") + "\" onclick=\"mxSetOnlyInc(true)\">⚠ Incomplètes seulement <em>" + incCount + "</em></button>";
  var t = "<thead><tr><th>Classe</th><th>Niveau / Profil</th><th>Matières couvertes</th><th>Matières manquantes</th><th>État</th><th></th></tr></thead><tbody>";
  var shown = 0;
  for(var j=0;j<states.length;j++){
    var st = states[j];
    if(mxState.onlyInc && (st.na || st.missing.length === 0)) continue;
    shown++;
    var covered = st.off.length - st.missing.length;
    t += "<tr><td style=\"text-align:left;font-weight:700\">" + escapeHtml(st.cl.name) + "</td>";
    t += "<td style=\"text-align:left\">" + escapeHtml(st.cl.niveau || "—") + " / " + escapeHtml(st.cl.profil || "—") + "</td>";
    if(st.na){
      t += "<td>—</td><td>—</td><td><span class=\"mx-badge na\">Profil à renseigner</span></td><td></td></tr>";
      continue;
    }
    t += "<td>" + covered + " / " + st.off.length + "</td>";
    t += "<td style=\"text-align:left\">" + (st.missing.length
    ? st.missing.map(function(x){ return "<span class=\"mx-miss-tag\">" + escapeHtml(x) + "</span>"; }).join(" ")
    : "<span style=\"color:#006b32;font-weight:700\">aucune</span>") + "</td>";
    t += "<td>" + (st.missing.length
    ? "<span class=\"mx-badge ko\">⚠ " + st.missing.length + " manquante" + (st.missing.length > 1 ? "s" : "") + "</span>"
    : "<span class=\"mx-badge ok\">✔ complète</span>") + "</td>";
    t += "<td>" + (st.missing.length ? "<button type=\"button\" class=\"mx-btn\" style=\"padding:4px 10px;font-size:.75rem\" onclick=\"mxGoClIdx(" + j + ")\">Pourvoir →</button>" : "") + "</td></tr>";
  }
  if(shown === 0){
    t += "<tr><td colspan=\"6\" style=\"text-align:left;color:#777;font-size:.85rem\">Aucune classe incomplète : tout est pourvu. ✔</td></tr>";
  }
  t += "</tbody>";
  tableEl.innerHTML = t;
  var completeCount = classes.length - incCount - naCount;
  var totalMissing = 0;
  for(var k2=0;k2<states.length;k2++) totalMissing += states[k2].missing.length;
  var foot = "<b>" + completeCount + " / " + classes.length + " classes complètes</b> — " + totalMissing + " matière(s) manquante(s) au total.";
  if(naCount > 0){
    var naNames = [];
    for(var n1=0;n1<states.length;n1++){ if(states[n1].na) naNames.push(states[n1].cl.name); }
    foot += "<br><span class=\"mx-small-note\">Vérification impossible (niveau/profil non renseignés) : " + naNames.map(escapeHtml).join(", ") + "</span>";
  }
  footEl.innerHTML = foot;
}

function refreshMatrix(){
  try{
    if(!document.getElementById("mx-zone")) return;
    mxToggleCls(document.getElementById("mx-mode-mat"), "active", mxState.mode === "mat");
    mxToggleCls(document.getElementById("mx-mode-cl"), "active", mxState.mode === "cl");
    mxToggleCls(document.getElementById("mx-mode-verif"), "active", mxState.mode === "verif");
    var specEl = document.getElementById("mx-spec");
    if(specEl) specEl.checked = mxState.spec;
    var chipsEl = document.getElementById("mx-chips");
    var tableEl = document.getElementById("mx-table");
    var wrapEl = document.getElementById("mx-wrap");
    var footEl = document.getElementById("mx-foot");
    var hintEl = document.getElementById("mx-hint");
    if(!chipsEl || !tableEl || !wrapEl || !footEl || !hintEl) return;
    var classes = mxGetClassesFull();
    var profs = mxGetProfsFull();
    if(classes.length === 0 || profs.length === 0){
      chipsEl.innerHTML = "";
      footEl.innerHTML = "";
      wrapEl.style.display = "none";
      hintEl.style.display = "block";
      hintEl.innerHTML = "La matrice se construira automatiquement dès que vous aurez saisi <b>au moins une classe</b> (rubrique 2) et <b>au moins un professeur</b> (rubrique 3).";
      return;
    }
    hintEl.style.display = "none";
    wrapEl.style.display = "";
    if(mxState.mode === "cl") mxRenderCl(chipsEl, tableEl, footEl, classes, profs);
    else if(mxState.mode === "verif") mxRenderVerif(chipsEl, tableEl, footEl, classes, profs);
    else mxRenderMat(chipsEl, tableEl, footEl, classes, profs);
  }catch(err){
    if(window.console) console.log("Matrice : " + err);
  }
}

/* Branchement sur les fonctions existantes de la fiche (aucune modification du fichier principal) */
(function(){
  function wrap(name){
    var orig = window[name];
    if(typeof orig !== "function") return;
    window[name] = function(){
      var r = orig.apply(this, arguments);
      try{ refreshMatrix(); }catch(e){}
      return r;
    };
  }
  wrap("refreshClassSelects");
  wrap("refreshProfSelects");
  wrap("updateProfTotals");
  if(window.console) console.log("Matrice affectations chargée.");
})();