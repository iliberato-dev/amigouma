const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzKwVva_8YzAw97X4H86gGqIRZa3azbmZ5qhPGr8u8BPGBR7E2QnddqOEtP1IZaJ6oz7Q/exec";

// Requisição JSONP para contornar CORS no Google Apps Script.
function jsonpRequest(url, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `cb_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
    const script = document.createElement("script");
    const query = new URLSearchParams({ ...params, callback: callbackName });
    const fullUrl = `${url}?${query.toString()}`;

    let timeoutId;

    window[callbackName] = (data) => {
      clearTimeout(timeoutId);
      resolve(data);
      cleanup();
    };

    const cleanup = () => {
      delete window[callbackName];
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };

    script.onerror = () => {
      clearTimeout(timeoutId);
      cleanup();
      reject(new Error("Falha na requisição"));
    };

    timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error("Tempo de resposta excedido"));
    }, 12000);

    script.src = fullUrl;
    document.body.appendChild(script);
  });
}

// Funções para alternar entre abas
function showForm() {
  document.getElementById("main-content").innerHTML = `
        <h2>Cadastro UMA</h2>
        <form id="cadastroForm">
            <label>Seu nome:
                <input type="text" name="nome_cadastrante" required>
            </label>
            <label>Congregação:
                <input type="text" name="congregacao" required>
            </label>
            <label>Nome do amigo UMA:
                <input type="text" name="nome_amigo" required>
            </label>
            <label>Telefone do amigo UMA:
                <input type="tel" name="telefone" required>
            </label>
            <label>Endereço do amigo UMA:
                <textarea name="endereco" required></textarea>
            </label>
            <button type="submit">Cadastrar</button>
            <div id="form-message"></div>
        </form>
    `;
  document.getElementById("cadastroForm").onsubmit = enviarCadastro;
}

function showCount() {
  document.getElementById("main-content").innerHTML = `
        <h2>Contagem de Amigos UMA</h2>
        <div id="count">Carregando...</div>
    `;
  fetchCount();
}

// Função para enviar cadastro para Google Sheets
function enviarCadastro(e) {
  e.preventDefault();
  const form = e.target;
  const data = {
    nome_cadastrante: form.nome_cadastrante.value,
    congregacao: form.congregacao.value,
    nome_amigo: form.nome_amigo.value,
    telefone: form.telefone.value,
    endereco: form.endereco.value,
  };
  jsonpRequest(APPS_SCRIPT_URL, {
    action: "add",
    ...data,
  })
    .then((resp) => {
      if (resp.result === "success") {
        document.getElementById("form-message").innerHTML =
          '<span class="success">Cadastro realizado com sucesso!</span>';
        form.reset();
      } else {
        document.getElementById("form-message").innerHTML =
          '<span class="error">Erro ao cadastrar. Tente novamente.</span>';
      }
    })
    .catch(() => {
      document.getElementById("form-message").innerHTML =
        '<span class="error">Erro de conexão.</span>';
    });
}

// Função para buscar a contagem de cadastros
function fetchCount() {
  jsonpRequest(APPS_SCRIPT_URL, { action: "count" })
    .then((data) => {
      document.getElementById("count").textContent =
        data.count + " pessoas cadastradas";
    })
    .catch(() => {
      document.getElementById("count").textContent =
        "Erro ao carregar contagem.";
    });
}

// Inicializa na aba de cadastro
showForm();
