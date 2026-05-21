const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbxIwBH8lpOJ4n0hlTjh_Knib5mY8viOSTlfsSmHS7KyvdI8tog6e5skIz3Y5Jj1KzbpkA/exec";

const GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1uQKBF1ADRcwUdTy8ORg9xDDeURV4gTL10oCRVf1cBys/edit?gid=0#gid=0";

// Cole aqui a URL do logo do WhatsApp que voce quiser usar nos cards.
const WHATSAPP_LOGO_URL =
  "https://cdn-icons-png.flaticon.com/256/2111/2111728.png";

const AUTH_STORAGE_KEY = "uma_auth_ok";
const TRANSITION_NAMES_STORAGE_KEY = "uma_transition_names";
// Tempo da tela AMIGO UMA em milissegundos.
const TRANSITION_HOLD_MS = 4700;
const TRANSITION_EXIT_MS = 520;
const SHOW_TRANSITION_ON_BOOT = true;
const LOGIN_USER = "admin";
const LOGIN_PASSWORD = "setor53";

let registeredRows = [];
let filteredRows = [];
let currentPage = 1;
const PAGE_SIZE = 10;
let toastHideTimer;
let isScreenTransitionRunning = false;

function getTransitionNames() {
  if (Array.isArray(registeredRows) && registeredRows.length) {
    return Array.from(
      new Set(
        registeredRows
          .map((row) => String(row.nome_amigo || "").trim())
          .filter((name) => name.length > 0),
      ),
    );
  }

  try {
    const cached = JSON.parse(
      localStorage.getItem(TRANSITION_NAMES_STORAGE_KEY) || "[]",
    );
    if (Array.isArray(cached) && cached.length) {
      return cached.map((name) => String(name || "").trim()).filter(Boolean);
    }
  } catch {
    // Ignora cache inválido.
  }

  return [
    "Samuel",
    "Rute",
    "Daniel",
    "Ester",
    "Lucas",
    "Noemi",
    "Pedro",
    "Debora",
    "Mateus",
    "Ana",
  ];
}

function saveTransitionNames(rows) {
  try {
    const names = Array.from(
      new Set(
        rows
          .map((row) => String(row.nome_amigo || "").trim())
          .filter((name) => name.length > 0),
      ),
    ).slice(0, 80);

    localStorage.setItem(TRANSITION_NAMES_STORAGE_KEY, JSON.stringify(names));
  } catch {
    // Se falhar no storage, segue sem cache.
  }
}

function renderTransitionNames() {
  const names = getTransitionNames();
  const repeated = Array.from({ length: 36 }, (_, index) => {
    const name = names[index % names.length];
    return `<span class="uma-name" style="--n:${index}">${escapeHtml(name)}</span>`;
  });

  return repeated.join("");
}

function runScreenTransition(nextRender) {
  if (typeof nextRender !== "function") return;
  if (isScreenTransitionRunning) {
    nextRender();
    return;
  }

  isScreenTransitionRunning = true;

  const overlay = document.createElement("div");
  overlay.className = "uma-transition-overlay";
  overlay.innerHTML = `
    <div class="uma-transition-bg-layer" aria-hidden="true"></div>
    <div class="uma-transition-names" aria-hidden="true">${renderTransitionNames()}</div>
    <div class="uma-transition-center">
      <p class="uma-transition-sub">Conectando amigos...</p>
      <h1>AMIGO UMA</h1>
    </div>
  `;

  document.body.appendChild(overlay);
  requestAnimationFrame(() => {
    overlay.classList.add("is-visible");
  });

  setTimeout(() => {
    nextRender();
    overlay.classList.add("is-leaving");
    setTimeout(() => {
      overlay.remove();
      isScreenTransitionRunning = false;
    }, TRANSITION_EXIT_MS);
  }, TRANSITION_HOLD_MS);
}

function isAuthenticated() {
  return localStorage.getItem(AUTH_STORAGE_KEY) === "1";
}

function setAuthenticated(value) {
  if (value) {
    localStorage.setItem(AUTH_STORAGE_KEY, "1");
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
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

function showLogin(message = "", options = {}) {
  if (!options.skipTransition) {
    runScreenTransition(() => showLogin(message, { skipTransition: true }));
    return;
  }

  document.getElementById("main-content").innerHTML = `
    <h2>Login de acesso</h2>
    <form id="login-form" class="login-box">
      <p class="login-hint">Acesse para ver a aba de cadastrados e abrir a planilha.</p>
      ${message ? `<p class="error">${escapeHtml(message)}</p>` : ""}
      <label>Usuário:
        <input type="text" name="usuario" autocomplete="username" required>
      </label>
      <label>Senha:
        <input id="senha-input" type="password" name="senha" autocomplete="current-password" required>
      </label>
      <label class="password-toggle">
        <input id="show-password" type="checkbox">
        Mostrar senha
      </label>
      <button id="login-submit" type="submit">Entrar</button>
      <div id="login-message" class="login-help"></div>
    </form>
  `;

  const loginForm = document.getElementById("login-form");
  const senhaInput = document.getElementById("senha-input");
  const showPassword = document.getElementById("show-password");

  if (showPassword && senhaInput) {
    showPassword.addEventListener("change", () => {
      senhaInput.type = showPassword.checked ? "text" : "password";
    });
  }

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
function showForm(options = {}) {
  if (!options.skipTransition) {
    runScreenTransition(() => showForm({ skipTransition: true }));
    return;
  }

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

function showCount(options = {}) {
  if (!options.skipTransition) {
    runScreenTransition(() => showCount({ skipTransition: true }));
    return;
  }

  if (!isAuthenticated()) {
    showLogin("Login expirado. Entre novamente para acessar cadastrados.", {
      skipTransition: true,
    });
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
        <div id="table-container">${renderLoadingState()}</div>
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

function toTitleCaseWords(value) {
  return String(value || "")
    .split(" ")
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

function normalizeCongregacao(value) {
  const compact = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
  return toTitleCaseWords(compact);
}

function normalizeFormData(rawData) {
  return {
    nome_cadastrante: String(rawData.nome_cadastrante || "")
      .replace(/\s+/g, " ")
      .trim(),
    congregacao: normalizeCongregacao(rawData.congregacao),
    nome_amigo: String(rawData.nome_amigo || "")
      .replace(/\s+/g, " ")
      .trim(),
    telefone: formatPhone(rawData.telefone),
    endereco: String(rawData.endereco || "")
      .replace(/\s+/g, " ")
      .trim(),
  };
}

function isDuplicateRegistration(rows, data) {
  const phone = digitsOnly(data.telefone);
  const friend = normalizeText(data.nome_amigo);
  const congregacao = normalizeText(data.congregacao);

  return rows.some((row) => {
    return (
      digitsOnly(row.telefone) === phone &&
      normalizeText(row.nome_amigo) === friend &&
      normalizeText(row.congregacao) === congregacao
    );
  });
}

function getFriendlyApiError(error) {
  if (!navigator.onLine) {
    return "Sem internet. Verifique sua conexão e tente novamente.";
  }

  const message = String(error && error.message ? error.message : "");
  if (message.includes("Tempo de resposta excedido")) {
    return "API indisponivel no momento. Tente novamente em instantes.";
  }

  if (message.includes("Falha na requisição")) {
    return "API indisponivel. Verifique se o Apps Script esta publicado.";
  }

  return "Erro inesperado ao comunicar com a API.";
}

function renderLoadingState() {
  return `
    <div class="loading-state" role="status" aria-live="polite" aria-busy="true">
      <div class="spinner"></div>
      <p>Carregando cadastrados...</p>
      <div class="skeleton-list" aria-hidden="true">
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
        <div class="skeleton-line"></div>
      </div>
    </div>
  `;
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

function showFormMessage(type, text) {
  const messageNode = document.getElementById("form-message");
  if (!messageNode) return;

  const safeText = escapeHtml(text);
  const cssType = type === "success" ? "success" : "error";
  const icon = cssType === "success" ? "✓" : "!";

  messageNode.innerHTML = `
    <div class="form-feedback ${cssType}" role="alert" aria-live="assertive">
      <span class="feedback-icon" aria-hidden="true">${icon}</span>
      <span class="feedback-text">${safeText}</span>
    </div>
  `;

  messageNode.scrollIntoView({ behavior: "smooth", block: "nearest" });
  showToast(cssType, text);
}

function ensureToastRoot() {
  let toastRoot = document.getElementById("toast-root");
  if (!toastRoot) {
    toastRoot = document.createElement("div");
    toastRoot.id = "toast-root";
    toastRoot.className = "toast-root";
    document.body.appendChild(toastRoot);
  }
  return toastRoot;
}

function showToast(type, text) {
  const toastRoot = ensureToastRoot();
  const cssType = type === "success" ? "success" : "error";
  const icon = cssType === "success" ? "✓" : "!";
  const safeText = escapeHtml(text);

  toastRoot.innerHTML = `
    <div class="toast ${cssType}" role="status" aria-live="polite">
      <span class="toast-icon" aria-hidden="true">${icon}</span>
      <span class="toast-text">${safeText}</span>
      <button class="toast-close" type="button" aria-label="Fechar aviso">×</button>
    </div>
  `;

  const toastNode = toastRoot.querySelector(".toast");
  const closeButton = toastRoot.querySelector(".toast-close");

  const closeToast = () => {
    if (!toastNode) return;
    toastNode.classList.add("hide");
    setTimeout(() => {
      if (toastRoot) {
        toastRoot.innerHTML = "";
      }
    }, 220);
  };

  if (closeButton) {
    closeButton.addEventListener("click", closeToast);
  }

  clearTimeout(toastHideTimer);
  toastHideTimer = setTimeout(closeToast, 3500);
}

// Função para enviar cadastro para Google Sheets
function enviarCadastro(e) {
  e.preventDefault();
  const form = e.target;
  const submitButton = document.getElementById("submit-button");

  if (submitButton.disabled) {
    return;
  }

  const rawData = {
    nome_cadastrante: form.nome_cadastrante.value.trim(),
    congregacao: form.congregacao.value.trim(),
    nome_amigo: form.nome_amigo.value.trim(),
    telefone: form.telefone.value.trim(),
    endereco: form.endereco.value.trim(),
  };

  const data = normalizeFormData(rawData);
  form.congregacao.value = data.congregacao;
  form.telefone.value = data.telefone;

  const validationError = validateFormData(data);
  if (validationError) {
    showFormMessage("error", validationError);
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "Enviando...";

  jsonpRequest(APPS_SCRIPT_URL, { action: "list" })
    .then((listData) => {
      if (
        Array.isArray(listData.rows) &&
        isDuplicateRegistration(listData.rows, data)
      ) {
        throw new Error("DUPLICATE_RECORD");
      }

      return jsonpRequest(APPS_SCRIPT_URL, {
        action: "add",
        ...data,
      });
    })
    .then((resp) => {
      if (resp.result === "success") {
        showFormMessage("success", "Cadastro realizado com sucesso!");
        form.reset();
      } else if (resp.result === "duplicate") {
        showFormMessage(
          "error",
          "Cadastro ja existente para este amigo, telefone e congregacao.",
        );
      } else {
        showFormMessage("error", "Erro ao cadastrar. Tente novamente.");
      }
    })
    .catch((error) => {
      if (String(error && error.message) === "DUPLICATE_RECORD") {
        showFormMessage(
          "error",
          "Cadastro ja existente para este amigo, telefone e congregacao.",
        );
        return;
      }

      showFormMessage("error", getFriendlyApiError(error));
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

function buildWhatsAppMessage(friendName) {
  const cleanName = String(friendName || "").trim();
  if (cleanName) {
    return `Ola, ${cleanName}! Tudo bem? Estou entrando em contato pelo cadastro do amigo UMA.`;
  }
  return "Ola! Tudo bem? Estou entrando em contato pelo cadastro do amigo UMA.";
}

function renderWhatsAppLogo() {
  if (WHATSAPP_LOGO_URL && /^https?:\/\//i.test(WHATSAPP_LOGO_URL)) {
    return `<img class="whatsapp-logo-img" src="${escapeHtml(WHATSAPP_LOGO_URL)}" alt="WhatsApp">`;
  }
  return '<span class="whatsapp-logo" aria-hidden="true">WA</span>';
}

function renderWhatsAppPhone(phoneText, friendName) {
  const digits = digitsOnly(phoneText);
  let waDigits = "";

  if (digits.length === 10 || digits.length === 11) {
    waDigits = `55${digits}`;
  } else if (
    (digits.length === 12 || digits.length === 13) &&
    digits.startsWith("55")
  ) {
    waDigits = digits;
  }

  if (!waDigits) {
    return `<span>${escapeHtml(phoneText)}</span>`;
  }

  const message = encodeURIComponent(buildWhatsAppMessage(friendName));

  return `<a class="whatsapp-link" href="https://wa.me/${waDigits}?text=${message}" target="_blank" rel="noopener noreferrer" aria-label="Conversar no WhatsApp com ${escapeHtml(friendName || "contato")}">${renderWhatsAppLogo()}<span>${escapeHtml(phoneText)}</span></a>`;
}

function renderTable(rows) {
  if (!rows.length) {
    return '<p class="empty-state">Nenhum cadastrado encontrado.</p>';
  }

  const cards = rows
    .map(
      (row, index) => `
      <article class="cadastro-card" style="--i:${index}">
        <header class="card-head">
          <span class="card-chip">${escapeHtml(row.congregacao)}</span>
        </header>
        <div class="card-grid">
          <p><strong>Amigo UMA</strong><span>${escapeHtml(row.nome_cadastrante)}</span></p>
          <p><strong>Cadastrado</strong><span>${escapeHtml(row.nome_amigo)}</span></p>
          <p><strong>Telefone</strong>${renderWhatsAppPhone(row.telefone, row.nome_amigo)}</p>
          <p class="card-address"><strong>Endereço</strong><span>${escapeHtml(row.endereco)}</span></p>
        </div>
      </article>
    `,
    )
    .join("");

  return `
    <div class="cards-grid" aria-live="polite">
      ${cards}
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

  const countNode = document.getElementById("count");
  const tableNode = document.getElementById("table-container");
  if (countNode) countNode.textContent = "Carregando...";
  if (tableNode) tableNode.innerHTML = renderLoadingState();

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
        saveTransitionNames(registeredRows);
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
    .catch((error) => {
      document.getElementById("count").textContent = "Falha ao carregar";
      document.getElementById("table-container").innerHTML =
        `<p class="error">${escapeHtml(getFriendlyApiError(error))}</p>`;
    });
}

// Inicializa na aba de cadastro
// Migra sessão antiga para login persistente no navegador.
if (
  sessionStorage.getItem(AUTH_STORAGE_KEY) === "1" &&
  localStorage.getItem(AUTH_STORAGE_KEY) !== "1"
) {
  localStorage.setItem(AUTH_STORAGE_KEY, "1");
}

setupAuthButton();
setupSheetLink();
updateAuthUI();

if (SHOW_TRANSITION_ON_BOOT) {
  runScreenTransition(() => showForm({ skipTransition: true }));
} else {
  showForm();
}
