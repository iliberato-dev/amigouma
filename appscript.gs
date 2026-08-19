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
    var evangelico = normalizeSpaces(p.evangelico || "");
    var diaEvento = normalizeSpaces(p.dia_evento || "");
    var presencaEvento = normalizeSpaces(p.presenca_evento || "");
    var observacoes = normalizeSpaces(p.observacoes || "");
    var endereco = normalizeSpaces(p.endereco || "");

    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      var existingValues = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
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
      evangelico,
      diaEvento,
      presencaEvento,
      observacoes,
    ]);
    return outputJsonp({ result: "success" }, callback);
  }

  if (action === "updatePresence") {
    var rowNumber = Number(p.row || 0);
    var presencaEvento = normalizeSpaces(p.presenca_evento || "");

    if (!rowNumber || rowNumber < 2 || rowNumber > sheet.getLastRow()) {
      return outputJsonp(
        { result: "error", message: "Linha invalida." },
        callback,
      );
    }

    sheet
      .getRange(rowNumber, 8)
      .setValue(presencaEvento || "Ainda não confirmou");
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

    var values = sheet.getRange(2, 1, lastRow - 1, 9).getValues();
    var rows = values.map(function (r, index) {
      return {
        row_number: index + 2,
        nome_cadastrante: r[0] || "",
        congregacao: r[1] || "",
        nome_amigo: r[2] || "",
        telefone: r[3] || "",
        endereco: r[4] || "",
        evangelico: r[5] || "",
        dia_evento: r[6] || "",
        presenca_evento: r[7] || "Ainda não confirmou",
        observacoes: r[8] || "",
      };
    });

    return outputJsonp({ rows: rows }, callback);
  }

  return outputJsonp({ result: "ok" }, callback);
}
