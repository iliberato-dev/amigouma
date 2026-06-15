function outputJsonp(payload, callback) {
  var json = JSON.stringify(payload);
  if (callback) {
    return ContentService.createTextOutput(
      callback + "(" + json + ")",
    ).setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService.createTextOutput(json).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function normalizeSpaces(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatPhone(value) {
  var digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6)
    return "(" + digits.slice(0, 2) + ") " + digits.slice(2);
  if (digits.length <= 10) {
    return (
      "(" +
      digits.slice(0, 2) +
      ") " +
      digits.slice(2, 6) +
      "-" +
      digits.slice(6)
    );
  }
  return (
    "(" + digits.slice(0, 2) + ") " + digits.slice(2, 7) + "-" + digits.slice(7)
  );
}

function toTitleCaseWords(value) {
  return String(value || "")
    .split(" ")
    .map(function (word) {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function normalizeCongregacao(value) {
  var compact = normalizeSpaces(value).toLowerCase();
  return toTitleCaseWords(compact);
}

function normalizeKey(value) {
  return normalizeSpaces(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isDuplicateRow(values, congregacao, nomeAmigo, telefone) {
  var targetCongregacao = normalizeKey(congregacao);
  var targetNomeAmigo = normalizeKey(nomeAmigo);
  var targetTelefone = digitsOnly(telefone);

  return values.some(function (r) {
    return (
      normalizeKey(r[1]) === targetCongregacao &&
      normalizeKey(r[2]) === targetNomeAmigo &&
      digitsOnly(r[3]) === targetTelefone
    );
  });
}

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var p = e && e.parameter ? e.parameter : {};
  var callback = p.callback;
  var action = p.action;

  if (action === "add") {
    var nomeCadastrante = normalizeSpaces(p.nome_cadastrante || "");
    var congregacao = normalizeCongregacao(p.congregacao || "");
    var nomeAmigo = normalizeSpaces(p.nome_amigo || "");
    var telefone = formatPhone(p.telefone || "");
    var endereco = normalizeSpaces(p.endereco || "");

    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var existingValues = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
      if (isDuplicateRow(existingValues, congregacao, nomeAmigo, telefone)) {
        return outputJsonp(
          { result: "duplicate", message: "Cadastro ja existente." },
          callback,
        );
      }
    }

    sheet.appendRow([
      nomeCadastrante,
      congregacao,
      nomeAmigo,
      telefone,
      endereco,
    ]);
    return outputJsonp({ result: "success" }, callback);
  }

  if (action === "count") {
    var total = Math.max(0, sheet.getLastRow() - 1);
    return outputJsonp({ count: total }, callback);
  }

  if (action === "list") {
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) {
      return outputJsonp({ rows: [] }, callback);
    }

    var values = sheet.getRange(2, 1, lastRow - 1, 5).getValues();
    var rows = values.map(function (r) {
      return {
        nome_cadastrante: r[0] || "",
        congregacao: r[1] || "",
        nome_amigo: r[2] || "",
        telefone: r[3] || "",
        endereco: r[4] || "",
      };
    });

    return outputJsonp({ rows: rows }, callback);
  }

  return outputJsonp({ result: "ok" }, callback);
}
