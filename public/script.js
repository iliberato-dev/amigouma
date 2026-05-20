const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxIwBH8lpOJ4n0hlTjh_Knib5mY8viOSTlfsSmHS7KyvdI8tog6e5skIz3Y5Jj1KzbpkA/exec";

const GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1uQKBF1ADRcwUdTy8ORg9xDDeURV4gTL10oCRVf1cBys/edit?gid=0#gid=0";

const AUTH_STORAGE_KEY = "uma_auth_ok";
const LOGIN_USER = "admin";
const LOGIN_PASSWORD = "setor53";

let registeredRows = [];
let filteredRows = [];
let currentPage = 1;
const PAGE_SIZE = 10;

function isAuthenticated() {
  return sessionStorage.getItem(AUTH_STORAGE_KEY) === "1";
}

function setAuthenticated(value) {
  if (value) {
    sessionStorage.setItem(AUTH_STORAGE_KEY, "1");
  } else {
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
  }
  updateAuthUI();
}

function updateAuthUI() {
  const authButton = document.getElementById("auth-button");
  const sheetLink = document.getElementById("sheet-link");
  const logged = isAuthenticated();

  if (authButton) {
    authButton.textContent = logged ? "Sair" : "Entrar";
  }

  if (sheetLink) {
    if (logged && GOOGLE_SHEET_URL.startsWith("http")) {
      sheetLink.href = GOOGLE_SHEET_URL;
      sheetLink.classList.remove("locked");
      sheetLink.removeAttribute("aria-disabled");
    } else {
      sheetLink.href = "#";
      sheetLink.classList.add("locked");
      sheetLink.setAttribute("aria-disabled", "true");
    }
  }
}

function setupAuthButton() {
  const authButton = document.getElementById("auth-button");
  if (!authButton) return;

  authButton.addEventListener("click", () => {
    if (isAuthenticated()) {
      setAuthenticated(false);
      showForm();
      return;
    }
    showLogin();
  });
}

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

function setupSheetLink() {
  const link = document.getElementById("sheet-link");
  if (!link) return;

  link.addEventListener("click", (e) => {
    if (!isAuthenticated()) {
      e.preventDefault();
      showLogin("Faca login para acessar a planilha.");
      return;
    }

    if (!GOOGLE_SHEET_URL.startsWith("http")) {
      e.preventDefault();
      alert("Cole a URL da planilha em GOOGLE_SHEET_URL no script.js");
    }
  });

  updateAuthUI();
}

function showLogin(message = "") {
  document.getElementById("main-content").innerHTML = `
    <h2>Login de acesso</h2>
    <form id="login-form" class="login-box">
      <p class="login-hint">Acesse para ver a aba de cadastrados e abrir a planilha.</p>
      ${message ? `<p class="error">${escapeHtml(message)}</p>` : ""}
      <label>Usuário:
        <input type="text" name="usuario" autocomplete="username" required>
      </label>
      <label>Senha:
        <input type="password" name="senha" autocomplete="current-password" required>
      </label>
      <button id="login-submit" type="submit">Entrar</button>
    
    </form>
  `;

  const loginForm = document.getElementById("login-form");
  loginForm.onsubmit = handleLogin;
}

function handleLogin(e) {
  e.preventDefault();
  const form = e.target;
  const usuario = String(form.usuario.value || "").trim();
  const senha = String(form.senha.value || "").trim();

  if (usuario === LOGIN_USER && senha === LOGIN_PASSWORD) {
    setAuthenticated(true);
    showCount();
    return;
  }

  const message = document.getElementById("login-message");
  if (message) {
    message.classList.remove("login-help");
    message.classList.add("error");
    message.textContent = "Usuario ou senha invalido.";
  }
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
                <input type="tel" name="telefone" maxlength="15" placeholder="(99) 99999-9999" required>
            </label>
            <label>Endereço do amigo UMA:
                <textarea name="endereco" maxlength="180" required></textarea>
            </label>
            <button id="submit-button" type="submit">Cadastrar</button>
            <div id="form-message"></div>
        </form>
    `;
  const form = document.getElementById("cadastroForm");
  form.onsubmit = enviarCadastro;

  form.telefone.addEventListener("input", (event) => {
    event.target.value = formatPhone(event.target.value);
  });
}

function showCount() {
  if (!isAuthenticated()) {
    showLogin("Faca login para acessar cadastrados.");
    return;
  }

  document.getElementById("main-content").innerHTML = `
        <h2>Cadastrados com informações da tabela</h2>
        <div id="count">Carregando...</div>
        <div id="table-filters" class="table-filters hidden">
          <input id="search-input" type="text" placeholder="Buscar por nome, telefone ou endereço">
          <select id="congregacao-filter">
            <option value="">Todas as congregações</option>
          </select>
        </div>
        <div id="table-container"></div>
    `;
  fetchRegistered();
}

function digitsOnly(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatPhone(value) {
  const digits = digitsOnly(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function validateFormData(data) {
  const telefoneLimpo = digitsOnly(data.telefone);

  if (data.nome_cadastrante.trim().length < 2) {
    return "Informe o nome de quem esta cadastrando.";
  }

  if (data.congregacao.trim().length < 2) {
    return "Informe a congregacao.";
  }

  if (data.nome_amigo.trim().length < 2) {
    return "Informe o nome do amigo UMA.";
  }

  if (telefoneLimpo.length < 10 || telefoneLimpo.length > 11) {
    return "Telefone invalido. Use DDD + numero.";
  }

  if (data.endereco.trim().length < 5) {
    return "Endereco muito curto.";
  }

  return "";
}

// Função para enviar cadastro para Google Sheets
function enviarCadastro(e) {
  e.preventDefault();
  const form = e.target;
  const submitButton = document.getElementById("submit-button");

  if (submitButton.disabled) {
    return;
  }

  const data = {
    nome_cadastrante: form.nome_cadastrante.value.trim(),
    congregacao: form.congregacao.value.trim(),
    nome_amigo: form.nome_amigo.value.trim(),
    telefone: form.telefone.value.trim(),
    endereco: form.endereco.value.trim(),
  };

  const validationError = validateFormData(data);
  if (validationError) {
    document.getElementById("form-message").innerHTML =
      `<span class="error">${validationError}</span>`;
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";

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
    })
    .finally(() => {
      submitButton.disabled = false;
      submitButton.textContent = "Cadastrar";
    });
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderTable(rows) {
  if (!rows.length) {
    return '<p class="empty-state">Nenhum cadastrado encontrado.</p>';
  }

  const tableRows = rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.nome_cadastrante)}</td>
        <td>${escapeHtml(row.congregacao)}</td>
        <td>${escapeHtml(row.nome_amigo)}</td>
        <td>${escapeHtml(row.telefone)}</td>
        <td>${escapeHtml(row.endereco)}</td>
      </tr>
    `,
    )
    .join("");

  return `
    <div class="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Cadastrante</th>
            <th>Congregação</th>
            <th>Amigo UMA</th>
            <th>Telefone</th>
            <th>Endereço</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>
  `;
}

function renderPagination(totalItems, totalPages, page) {
  if (totalItems === 0 || totalPages <= 1) {
    return "";
  }

  const start = (page - 1) * PAGE_SIZE + 1;
  const end = Math.min(page * PAGE_SIZE, totalItems);

  let pageButtons = "";
  for (let i = 1; i <= totalPages; i += 1) {
    pageButtons += `
      <button class="page-btn${i === page ? " active" : ""}" data-page="${i}" type="button">
        ${i}
      </button>
    `;
  }

  return `
    <div class="pagination-wrap">
      <p class="pagination-info">Mostrando ${start}-${end} de ${totalItems}</p>
      <div class="pagination-controls">
        <button class="page-btn" data-page="${page - 1}" type="button" ${page === 1 ? "disabled" : ""}>Anterior</button>
        ${pageButtons}
        <button class="page-btn" data-page="${page + 1}" type="button" ${page === totalPages ? "disabled" : ""}>Proxima</button>
      </div>
    </div>
  `;
}

function bindPaginationEvents(totalPages) {
  const buttons = document.querySelectorAll(".page-btn[data-page]");
  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextPage = Number(button.dataset.page);
      if (!Number.isFinite(nextPage)) return;
      if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage)
        return;
      currentPage = nextPage;
      renderFilteredResults();
    });
  });
}

function renderFilteredResults() {
  const total = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);

  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filteredRows.slice(startIndex, startIndex + PAGE_SIZE);

  document.getElementById("count").textContent = total + " cadastrados";
  document.getElementById("table-container").innerHTML =
    renderTable(pageRows) + renderPagination(total, totalPages, currentPage);

  bindPaginationEvents(totalPages);
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function applyTableFilters() {
  const searchInput = document.getElementById("search-input");
  const congregacaoFilter = document.getElementById("congregacao-filter");
  if (!searchInput || !congregacaoFilter) return;

  const term = normalizeText(searchInput.value.trim());
  const selectedCongregacao = normalizeText(congregacaoFilter.value);

  filteredRows = registeredRows.filter((row) => {
    const rowCongregacao = normalizeText(row.congregacao);
    const searchable = normalizeText(
      `${row.nome_cadastrante} ${row.nome_amigo} ${row.telefone} ${row.endereco}`,
    );

    const matchesCongregacao =
      !selectedCongregacao || rowCongregacao === selectedCongregacao;
    const matchesTerm = !term || searchable.includes(term);

    return matchesCongregacao && matchesTerm;
  });

  currentPage = 1;
  renderFilteredResults();
}

function setupTableFilters(rows) {
  const filterWrap = document.getElementById("table-filters");
  const searchInput = document.getElementById("search-input");
  const congregacaoFilter = document.getElementById("congregacao-filter");

  if (!filterWrap || !searchInput || !congregacaoFilter) return;

  const congregacoes = Array.from(
    new Set(
      rows
        .map((row) => String(row.congregacao || "").trim())
        .filter((value) => value.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  congregacaoFilter.innerHTML =
    '<option value="">Todas as congregações</option>' +
    congregacoes
      .map(
        (nome) =>
          `<option value="${escapeHtml(nome)}">${escapeHtml(nome)}</option>`,
      )
      .join("");

  if (!searchInput.dataset.bound) {
    searchInput.addEventListener("input", applyTableFilters);
    congregacaoFilter.addEventListener("change", applyTableFilters);
    searchInput.dataset.bound = "1";
  }

  filterWrap.classList.remove("hidden");
}

function hideTableFilters() {
  const filterWrap = document.getElementById("table-filters");
  if (filterWrap) {
    filterWrap.classList.add("hidden");
  }
}

// Função para buscar cadastrados e contagem
function fetchRegistered() {
  registeredRows = [];
  filteredRows = [];
  currentPage = 1;
  hideTableFilters();

  jsonpRequest(APPS_SCRIPT_URL, { action: "list" })
    .then((data) => {
      if (data && data.result === "ok") {
        return jsonpRequest(APPS_SCRIPT_URL, { action: "count" }).then(
          (countData) => {
            const total =
              typeof countData.count === "number" ? countData.count : 0;
            document.getElementById("count").textContent =
              total + " cadastrados";
            document.getElementById("table-container").innerHTML =
              '<p class="empty-state">Sua API ainda nao retorna a lista. Reimplante o Apps Script com action=list.</p>';
          },
        );
      }

      if (Array.isArray(data.rows)) {
        registeredRows = data.rows;
        setupTableFilters(registeredRows);
        applyTableFilters();
        return;
      }

      if (typeof data.count === "number") {
        document.getElementById("count").textContent =
          data.count + " cadastrados";
        document.getElementById("table-container").innerHTML =
          '<p class="empty-state">API ainda sem listagem. Atualize o Apps Script para action=list.</p>';
        return;
      }

      document.getElementById("count").textContent =
        "Resposta inválida da API.";
      document.getElementById("table-container").innerHTML =
        '<p class="empty-state">Verifique se a URL implantada do Apps Script e a mais recente.</p>';
    })
    .catch(() => {
      document.getElementById("count").textContent =
        "Erro ao carregar cadastrados.";
      document.getElementById("table-container").innerHTML = "";
    });
}

// Inicializa na aba de cadastro
setupAuthButton();
setupSheetLink();
updateAuthUI();
showForm();
