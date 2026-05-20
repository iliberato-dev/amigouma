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

function doGet(e) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheets()[0];
  var p = e && e.parameter ? e.parameter : {};
  var callback = p.callback;
  var action = p.action;

  if (action === "add") {
    sheet.appendRow([
      p.nome_cadastrante || "",
      p.congregacao || "",
      p.nome_amigo || "",
      p.telefone || "",
      p.endereco || "",
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
