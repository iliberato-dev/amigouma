const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwXFZ8225DlAQaxKamybXyWAutZ5Mso2TR2RcKwfgEt7WXaGXwA79TR71hdX12yMroaIw/exec";

const GOOGLE_SHEET_URL =
  "https://docs.google.com/spreadsheets/d/1uQKBF1ADRcwUdTy8ORg9xDDeURV4gTL10oCRVf1cBys/edit?gid=0#gid=0";

// Cole aqui a URL do logo do WhatsApp que voce quiser usar nos cards.
const WHATSAPP_LOGO_URL =
  "https://cdn-icons-png.flaticon.com/256/2111/2111728.png";

const AUTH_STORAGE_KEY = "uma_auth_ok";
const TRANSITION_NAMES_STORAGE_KEY = "uma_transition_names";
const TRANSITION_RECENT_NAMES_STORAGE_KEY = "uma_transition_recent_names";
const TRANSITION_ENABLED_STORAGE_KEY = "uma_transition_enabled";
// Tempo da tela AMIGO UMA em milissegundos.
const TRANSITION_HOLD_MS = 4700;
const TRANSITION_EXIT_MS = 520;
const SHOW_TRANSITION_ON_BOOT = true;
const LOGIN_USER = "admin";
const LOGIN_PASSWORD = "setor53";
const CONGREGACAO_OUTRA_VALUE = "__OTHER__";
const OBSERVACAO_OUTRA_VALUE = "outra";
const ENDERECO_SUGGESTIONS_URL = "https://nominatim.openstreetmap.org/search";
const ENDERECO_SUGGESTIONS_LIMIT = 5;
const ENDERECO_CIDADE_ALVO = "Sao Paulo";
const ENDERECO_ESTADO_ALVO = "Sao Paulo";
const SAO_PAULO_CITY_VIEWBOX = {
  left: -46.826,
  top: -23.356,
  right: -46.365,
  bottom: -23.824,
};

const CONGREGACOES = [
  "Sede",
  "Cidade Kemel",
  "Encosta Norte",
  "Fazenda Itaim",
  "Jd. Camargo Novo – Baixo",
  "Jd. Camargo Novo – Cima",
  "Jardim Campos",
  "Jardim Célia",
  "Jardim da Estação",
  "Jardim das Oliveiras",
  "Jardim Gióia",
  "Jardim Laura",
  "Jardim Lourdes",
  "Jardim Mabel",
  "Jardim Miliúnas",
  "Jardim Miraí",
  "Jardim Miriam",
  "Jardim Nélia",
  "Jardim Nélia II",
  "Jardim Noêmia",
  "Jardim Romano",
  "Jardim Santa Margarida",
  "Jardim São Luís",
  "Kemel Addas",
  "Km 29",
  "Parque das Águas",
  "Parque Santa Amélia",
  "Parque Veredas",
  "Riacho Carioca",
  "Santana do Agreste",
  "Texima",
  "Tijuco Preto",
  "Vila Alabama",
  "Vila Aymoré",
  "Vila Itaim",
  "Vila Jurema",
  "Vila Melo",
  "Vila Nova Itaim",
  "Vila Popular",
  "Vila Seabra",
  "Vila Sonia",
];

let registeredRows = [];
let filteredRows = [];
let currentPage = 1;
const PAGE_SIZE = 10;
let toastHideTimer;
let isScreenTransitionRunning = false;

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function isTransitionEnabled() {
  const stored = localStorage.getItem(TRANSITION_ENABLED_STORAGE_KEY);
  if (stored === null) {
    return !prefersReducedMotion();
  }
  return stored === "1";
}

function setTransitionEnabled(value) {
  if (value) {
    localStorage.setItem(TRANSITION_ENABLED_STORAGE_KEY, "1");
  } else {
    localStorage.setItem(TRANSITION_ENABLED_STORAGE_KEY, "0");
  }
  updateTransitionToggleUI();
}

function updateTransitionToggleUI() {
  const toggle = document.getElementById("transition-toggle");
  if (!toggle) return;
  toggle.checked = isTransitionEnabled();
}

function setupTransitionToggle() {
  const toggle = document.getElementById("transition-toggle");
  if (!toggle) return;

  toggle.addEventListener("change", () => {
    setTransitionEnabled(toggle.checked);
  });

  updateTransitionToggleUI();
}

function getFirstAndSecondName(value) {
  const parts = String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return parts.slice(0, 2).join(" ");
}

function getRecentTransitionNames() {
  try {
    const cached = JSON.parse(
      localStorage.getItem(TRANSITION_RECENT_NAMES_STORAGE_KEY) || "[]",
    );
    if (Array.isArray(cached)) {
      return cached.map((name) => getFirstAndSecondName(name)).filter(Boolean);
    }
  } catch {
    // Ignora cache inválido.
  }

  return [];
}

function saveRecentTransitionNames(names) {
  try {
    localStorage.setItem(
      TRANSITION_RECENT_NAMES_STORAGE_KEY,
      JSON.stringify(Array.from(new Set(names)).slice(0, 20)),
    );
  } catch {
    // Se falhar no storage, segue sem cache.
  }
}

function getTransitionNames() {
  const recentNames = getRecentTransitionNames();

  if (Array.isArray(registeredRows) && registeredRows.length) {
    const baseNames = Array.from(
      new Set(
        registeredRows
          .map((row) => getFirstAndSecondName(row.nome_amigo))
          .filter((name) => name.length > 0),
      ),
    );
    return Array.from(new Set([...recentNames, ...baseNames]));
  }

  try {
    const cached = JSON.parse(
      localStorage.getItem(TRANSITION_NAMES_STORAGE_KEY) || "[]",
    );
    if (Array.isArray(cached) && cached.length) {
      const baseNames = cached
        .map((name) => getFirstAndSecondName(name))
        .filter(Boolean);
      return Array.from(new Set([...recentNames, ...baseNames]));
    }
  } catch {
    // Ignora cache inválido.
  }

  const defaultNames = [
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

  return Array.from(new Set([...recentNames, ...defaultNames]));
}

function saveTransitionNames(rows) {
  try {
    const names = Array.from(
      new Set(
        rows
          .map((row) => getFirstAndSecondName(row.nome_amigo))
          .filter((name) => name.length > 0),
      ),
    ).slice(0, 80);

    localStorage.setItem(TRANSITION_NAMES_STORAGE_KEY, JSON.stringify(names));
  } catch {
    // Se falhar no storage, segue sem cache.
  }
}

function addTransitionName(name) {
  const trimmedName = getFirstAndSecondName(name);
  if (!trimmedName) return;

  if (Array.isArray(registeredRows)) {
    const alreadyInRows = registeredRows.some(
      (row) => getFirstAndSecondName(row && row.nome_amigo) === trimmedName,
    );

    if (!alreadyInRows) {
      registeredRows.unshift({ nome_amigo: trimmedName });
    }
  }

  const recentNames = getRecentTransitionNames().filter(
    (item) => item !== trimmedName,
  );
  recentNames.unshift(trimmedName);
  saveRecentTransitionNames(recentNames);

  try {
    const cached = JSON.parse(
      localStorage.getItem(TRANSITION_NAMES_STORAGE_KEY) || "[]",
    );
    const names = Array.isArray(cached)
      ? cached.map((item) => getFirstAndSecondName(item)).filter(Boolean)
      : [];

    if (!names.includes(trimmedName)) {
      names.unshift(trimmedName);
      localStorage.setItem(
        TRANSITION_NAMES_STORAGE_KEY,
        JSON.stringify(names.slice(0, 80)),
      );
    }
  } catch {
    // Ignora falha de cache local.
  }
}

function renderTransitionNames() {
  const names = getTransitionNames();
  const recentPriority = getRecentTransitionNames().slice(0, 3);
  const recentSet = new Set(recentPriority);
  const highlightedOnce = new Set();
  const recentPositions = [
    { x: 16, y: 22, rotate: -8 },
    { x: 84, y: 28, rotate: 7 },
    { x: 22, y: 78, rotate: -6 },
  ];
  const recentPositionMap = new Map(
    recentPriority.map((name, idx) => [name, recentPositions[idx]]),
  );

  const repeated = Array.from({ length: 36 }, (_, index) => {
    const name = getFirstAndSecondName(names[index % names.length]);
    const isRecentHighlight = recentSet.has(name) && !highlightedOnce.has(name);
    if (isRecentHighlight) {
      highlightedOnce.add(name);
    }

    const xBase = (index * 37) % 100;
    const yBase = (index * 53) % 100;
    let x = Math.min(96, Math.max(4, xBase));
    let y = Math.min(95, Math.max(6, yBase));
    let rotate = ((index % 7) - 3) * 2;

    if (isRecentHighlight) {
      const fixedPos = recentPositionMap.get(name);
      if (fixedPos) {
        x = fixedPos.x;
        y = fixedPos.y;
        rotate = fixedPos.rotate;
      }
    }

    // Evita muitos nomes no centro para manter o AMIGO UMA legível.
    if (x > 35 && x < 65 && y > 34 && y < 66) {
      y = y < 50 ? y - 18 : y + 18;
    }

    const sizeBase = 0.78 + ((index * 19) % 100) / 100;
    const opacityBase = 0.16 + ((index * 11) % 65) / 100;
    const size = (isRecentHighlight ? sizeBase + 0.4 : sizeBase).toFixed(2);
    const opacity = Math.min(
      0.9,
      isRecentHighlight ? opacityBase + 0.28 : opacityBase,
    ).toFixed(2);
    const delay = isRecentHighlight ? index * 40 : index * 85;
    const highlightClass = isRecentHighlight ? " recent-highlight" : "";

    return `<span class="uma-name${highlightClass}" style="--n:${index};--x:${x}%;--y:${y}%;--s:${size}rem;--o:${opacity};--d:${delay}ms;--r:${rotate}deg">${escapeHtml(name)}</span>`;
  });

  return repeated.join("");
}

function runScreenTransition(nextRender) {
  if (typeof nextRender !== "function") return;
  if (!isTransitionEnabled()) {
    nextRender();
    return;
  }
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
      <h1><img src="https://images.crunchbase.com/image/upload/c_pad,h_256,w_256,f_auto,q_auto:eco,dpr_1/ilvpms2r4xeuqjq2ou82?ik-sanitizeSvg=true" alt="Logo AMIGO UMA" width="150" height="150"></h1>
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

  const congregacaoOptions = [...CONGREGACOES]
    .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }))
    .map(
      (congregacao) =>
        `<option value="${escapeHtml(congregacao)}">${escapeHtml(congregacao)}</option>`,
    )
    .join("");

  document.getElementById("main-content").innerHTML = `
        <h2>Cadastro UMA</h2>
        
        <form id="cadastroForm">
            <label>Seu nome:
                <input type="text" name="nome_cadastrante" required>
            </label>
            <label>Congregação:
          <select name="congregacao" required>
            <option value="">Selecione a congregação</option>
            ${congregacaoOptions}
            <option value="${CONGREGACAO_OUTRA_VALUE}">Outra (digitar)</option>
          </select>
            </label>
            <label id="congregacao-outra-wrap" class="hidden">Congregação (outra):
                <input type="text" name="congregacao_outra" disabled>
            </label>
            <label>Nome do amigo UMA:
                <input type="text" name="nome_amigo" required>
            </label>
            <label>Telefone do amigo UMA:
                <input type="tel" name="telefone" maxlength="15" placeholder="(99) 99999-9999" required>
            </label>
            <label>É evangélico?
              <select name="evangelico" required>
                <option value="">Selecione</option>
                <option value="Sim">Sim</option>
                <option value="Não">Não</option>
              </select>
            </label>
            <label>Dia que irá ao evento:
              <select name="dia_evento" required>
                <option value="">Selecione o dia</option>
                <option value="28">Dia 28</option>
                <option value="29">Dia 29</option>
                <option value="30">Dia 30</option>
              </select>
            </label>
            <fieldset class="obs-fieldset">
              <legend>Observações</legend>
              <div class="obs-options">
                <label class="obs-option"><input type="checkbox" name="observacoes" value="Cadeirante"> Cadeirante</label>
                <label class="obs-option"><input type="checkbox" name="observacoes" value="Deficiente visual"> Deficiente visual</label>
                <label class="obs-option"><input type="checkbox" name="observacoes" value="Deficiente auditivo"> Deficiente auditivo</label>
                <label class="obs-option"><input id="obs-outra-check" type="checkbox" name="observacoes" value="${OBSERVACAO_OUTRA_VALUE}"> Outra</label>
              </div>
              <input id="obs-outra-input" class="hidden" type="text" name="observacao_outra" maxlength="80" placeholder="Descreva a observação" disabled>
            </fieldset>
            <label>Endereço do amigo UMA:
              <div class="address-autocomplete-wrap">
                <textarea name="endereco" maxlength="180" required></textarea>
                <div id="endereco-status" class="address-status hidden" aria-live="polite"></div>
                <ul id="endereco-suggestions" class="address-suggestions hidden" role="listbox" aria-label="Sugestoes de endereco"></ul>
              </div>
            </label>
            <button id="submit-button" type="submit">Cadastrar</button>
            <div id="form-message"></div>
        </form>
    `;
  const form = document.getElementById("cadastroForm");
  form.onsubmit = enviarCadastro;

  const congregacaoSelect = form.congregacao;
  const congregacaoOutraWrap = document.getElementById(
    "congregacao-outra-wrap",
  );
  const congregacaoOutraInput = form.congregacao_outra;

  function toggleCongregacaoOutra() {
    const isOutra = congregacaoSelect.value === CONGREGACAO_OUTRA_VALUE;
    congregacaoOutraWrap.classList.toggle("hidden", !isOutra);
    congregacaoOutraInput.disabled = !isOutra;
    congregacaoOutraInput.required = isOutra;

    if (isOutra) {
      requestAnimationFrame(() => {
        congregacaoOutraInput.focus();
      });
    }

    if (!isOutra) {
      congregacaoOutraInput.value = "";
    }
  }

  congregacaoSelect.addEventListener("change", toggleCongregacaoOutra);
  toggleCongregacaoOutra();

  form.telefone.addEventListener("input", (event) => {
    event.target.value = formatPhone(event.target.value);
  });

  const observacaoOutraCheck = document.getElementById("obs-outra-check");
  const observacaoOutraInput = document.getElementById("obs-outra-input");

  function toggleObservacaoOutra() {
    const isChecked = observacaoOutraCheck && observacaoOutraCheck.checked;
    observacaoOutraInput.classList.toggle("hidden", !isChecked);
    observacaoOutraInput.disabled = !isChecked;
    observacaoOutraInput.required = Boolean(isChecked);

    if (!isChecked) {
      observacaoOutraInput.value = "";
    }
  }

  if (observacaoOutraCheck && observacaoOutraInput) {
    observacaoOutraCheck.addEventListener("change", toggleObservacaoOutra);
    form.addEventListener("reset", () => {
      setTimeout(toggleObservacaoOutra, 0);
    });
    toggleObservacaoOutra();
  }

  setupEnderecoAutocomplete(form);
}

function formatEnderecoSuggestion(displayName) {
  const parts = String(displayName || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.slice(0, 4).join(", ");
}

function extractHouseNumberFromQuery(query) {
  const text = String(query || "").trim();
  const match = text.match(/(?:,|\s)(\d{1,6}[a-zA-Z]?)\s*$/);
  return match ? match[1] : "";
}

function buildEnderecoSuggestionLabel(item, fallbackHouseNumber = "") {
  const address = item && item.address ? item.address : {};
  const houseNumber = String(address.house_number || "").trim();
  const effectiveHouseNumber =
    houseNumber || String(fallbackHouseNumber || "").trim();
  const road = String(address.road || address.pedestrian || "").trim();
  const suburb = String(address.suburb || address.neighbourhood || "").trim();
  const city = String(
    address.city || address.town || address.municipality || "",
  ).trim();
  const stateCode = String(address.state_code || "SP").trim();

  if (road) {
    const firstPart = effectiveHouseNumber
      ? `${road}, ${effectiveHouseNumber}`
      : road;
    const parts = [firstPart];
    if (suburb) parts.push(suburb);
    if (city) parts.push(city);
    if (stateCode) parts.push(stateCode);
    return parts.join(" - ");
  }

  return formatEnderecoSuggestion(item && item.display_name);
}

function normalizeTextNoAccents(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function isEnderecoFromSaoPaulo(item) {
  const address = item && item.address ? item.address : {};
  const state = normalizeTextNoAccents(address.state);
  const cityCandidates = [
    address.city,
    address.town,
    address.municipality,
    address.village,
    address.county,
  ].map(normalizeTextNoAccents);

  return (
    state === normalizeTextNoAccents(ENDERECO_ESTADO_ALVO) &&
    cityCandidates.includes(normalizeTextNoAccents(ENDERECO_CIDADE_ALVO))
  );
}

function setupEnderecoAutocomplete(form) {
  const enderecoInput = form.endereco;
  const suggestionsList = document.getElementById("endereco-suggestions");
  const statusNode = document.getElementById("endereco-status");

  if (!enderecoInput || !suggestionsList || !statusNode) return;

  let debounceId;
  let requestController;
  let currentSuggestions = [];
  let activeIndex = -1;
  let requestToken = 0;

  function setStatus(message) {
    statusNode.textContent = message;
    statusNode.classList.toggle("hidden", !message);
  }

  function closeSuggestions() {
    currentSuggestions = [];
    activeIndex = -1;
    suggestionsList.innerHTML = "";
    suggestionsList.classList.add("hidden");
    setStatus("");
  }

  function renderSuggestions() {
    if (!currentSuggestions.length) {
      suggestionsList.innerHTML = "";
      suggestionsList.classList.add("hidden");
      return;
    }

    suggestionsList.innerHTML = currentSuggestions
      .map((suggestion, index) => {
        const isActive = index === activeIndex;
        return `
          <li>
            <button
              id="endereco-suggestion-${index}"
              type="button"
              class="address-suggestion-btn${isActive ? " active" : ""}"
              data-index="${index}"
              role="option"
              aria-selected="${isActive ? "true" : "false"}"
            >
              ${escapeHtml(suggestion.label)}
            </button>
          </li>
        `;
      })
      .join("");

    suggestionsList.classList.remove("hidden");
  }

  function applySuggestion(index) {
    const selected = currentSuggestions[index];
    if (!selected) return;

    enderecoInput.value = selected.label.slice(0, 180);
    closeSuggestions();
    enderecoInput.focus();
  }

  function updateActiveSuggestion(nextIndex) {
    if (!currentSuggestions.length) return;
    activeIndex = nextIndex;
    renderSuggestions();

    const activeNode = suggestionsList.querySelector(
      `#endereco-suggestion-${activeIndex}`,
    );
    if (activeNode) {
      activeNode.scrollIntoView({ block: "nearest" });
    }
  }

  async function searchAddressSuggestions(query) {
    const typedHouseNumber = extractHouseNumberFromQuery(query);

    requestToken += 1;
    const currentToken = requestToken;

    if (requestController) {
      requestController.abort();
    }
    requestController = new AbortController();

    setStatus("Buscando sugestoes de endereco...");

    try {
      const queryParams = new URLSearchParams({
        q: `${query}, Sao Paulo, SP, Brasil`,
        format: "jsonv2",
        addressdetails: "1",
        countrycodes: "br",
        bounded: "1",
        viewbox: `${SAO_PAULO_CITY_VIEWBOX.left},${SAO_PAULO_CITY_VIEWBOX.top},${SAO_PAULO_CITY_VIEWBOX.right},${SAO_PAULO_CITY_VIEWBOX.bottom}`,
        limit: String(ENDERECO_SUGGESTIONS_LIMIT),
      });

      const response = await fetch(
        `${ENDERECO_SUGGESTIONS_URL}?${queryParams.toString()}`,
        {
          signal: requestController.signal,
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP_${response.status}`);
      }

      const data = await response.json();

      if (currentToken !== requestToken) {
        return;
      }

      const suggestions = Array.isArray(data)
        ? data
            .filter(isEnderecoFromSaoPaulo)
            .map((item) => buildEnderecoSuggestionLabel(item, typedHouseNumber))
            .filter((item) => item.length > 0)
        : [];

      currentSuggestions = Array.from(new Set(suggestions))
        .slice(0, ENDERECO_SUGGESTIONS_LIMIT)
        .map((label) => ({ label }));

      activeIndex = -1;
      renderSuggestions();

      if (!currentSuggestions.length) {
        setStatus("Nenhuma sugestao encontrada.");
      } else {
        setStatus("");
      }
    } catch (error) {
      if (error && error.name === "AbortError") {
        return;
      }
      closeSuggestions();
      setStatus("Nao foi possivel buscar sugestoes agora.");
    }
  }

  enderecoInput.addEventListener("input", () => {
    const query = String(enderecoInput.value || "")
      .replace(/\s+/g, " ")
      .trim();

    clearTimeout(debounceId);

    if (query.length < 4) {
      closeSuggestions();
      return;
    }

    debounceId = setTimeout(() => {
      searchAddressSuggestions(query);
    }, 350);
  });

  enderecoInput.addEventListener("keydown", (event) => {
    if (!currentSuggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      const next = (activeIndex + 1) % currentSuggestions.length;
      updateActiveSuggestion(next);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      const next =
        activeIndex <= 0 ? currentSuggestions.length - 1 : activeIndex - 1;
      updateActiveSuggestion(next);
      return;
    }

    if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      applySuggestion(activeIndex);
      return;
    }

    if (event.key === "Escape") {
      closeSuggestions();
    }
  });

  suggestionsList.addEventListener("mousedown", (event) => {
    // Evita blur do textarea antes de processar o clique.
    event.preventDefault();
  });

  suggestionsList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-index]");
    if (!button) return;

    const index = Number(button.dataset.index);
    if (Number.isNaN(index)) return;
    applySuggestion(index);
  });

  enderecoInput.addEventListener("blur", () => {
    setTimeout(() => {
      closeSuggestions();
    }, 120);
  });

  form.addEventListener("reset", () => {
    closeSuggestions();
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
          <select id="dia-evento-filter">
            <option value="">Todos os dias</option>
          </select>
          <select id="evangelico-filter">
            <option value="">Evangélico (todos)</option>
            <option value="Sim">Evangélico: Sim</option>
            <option value="Não">Evangélico: Não</option>
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
    evangelico: String(rawData.evangelico || "")
      .replace(/\s+/g, " ")
      .trim(),
    dia_evento: String(rawData.dia_evento || "")
      .replace(/\s+/g, " ")
      .trim(),
    observacoes: String(rawData.observacoes || "")
      .replace(/\s+/g, " ")
      .trim(),
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

  if (!["Sim", "Não"].includes(data.evangelico)) {
    return "Selecione Sim ou Não no campo de evangélico.";
  }

  if (!["28", "29", "30"].includes(data.dia_evento)) {
    return "Selecione o dia do evento (28, 29 ou 30).";
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
    congregacao:
      form.congregacao.value === CONGREGACAO_OUTRA_VALUE
        ? String(form.congregacao_outra.value || "").trim()
        : form.congregacao.value.trim(),
    nome_amigo: form.nome_amigo.value.trim(),
    telefone: form.telefone.value.trim(),
    evangelico: form.evangelico.value.trim(),
    dia_evento: form.dia_evento.value.trim(),
    observacoes: getObservacoesText(form),
    endereco: form.endereco.value.trim(),
  };

  const data = normalizeFormData(rawData);
  form.telefone.value = data.telefone;

  if (
    form.congregacao.value === CONGREGACAO_OUTRA_VALUE &&
    form.congregacao_outra
  ) {
    form.congregacao_outra.value = data.congregacao;
  }

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
        addTransitionName(data.nome_amigo);
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

function getObservacoesText(form) {
  const selectedValues = Array.from(
    form.querySelectorAll('input[name="observacoes"]:checked'),
  )
    .map((node) => String(node.value || "").trim())
    .filter(Boolean);

  const hasOutra = selectedValues.includes(OBSERVACAO_OUTRA_VALUE);
  const observacaoOutra = String(form.observacao_outra?.value || "").trim();

  const normalizedValues = selectedValues
    .filter((item) => item !== OBSERVACAO_OUTRA_VALUE)
    .concat(hasOutra && observacaoOutra ? [`Outra: ${observacaoOutra}`] : []);

  return normalizedValues.join("; ");
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
  const firstName = cleanName.split(/\s+/).filter(Boolean)[0] || "";
  if (firstName) {
    return `Ola, ${firstName}! Tudo bem? Estou entrando em contato pelo cadastro do amigo UMA.`;
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
          <p><strong>Evangélico</strong><span>${escapeHtml(row.evangelico || "-")}</span></p>
          <p><strong>Dia evento</strong><span>${escapeHtml(row.dia_evento || "-")}</span></p>
          <p><strong>Observações</strong><span>${escapeHtml(row.observacoes || "-")}</span></p>
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
  const diaEventoFilter = document.getElementById("dia-evento-filter");
  const evangelicoFilter = document.getElementById("evangelico-filter");
  if (
    !searchInput ||
    !congregacaoFilter ||
    !diaEventoFilter ||
    !evangelicoFilter
  )
    return;

  const term = normalizeText(searchInput.value.trim());
  const selectedCongregacao = normalizeText(congregacaoFilter.value);
  const selectedDiaEvento = normalizeText(diaEventoFilter.value);
  const selectedEvangelico = normalizeText(evangelicoFilter.value);

  filteredRows = registeredRows.filter((row) => {
    const rowCongregacao = normalizeText(row.congregacao);
    const rowDiaEvento = normalizeText(row.dia_evento);
    const rowEvangelico = normalizeText(row.evangelico);
    const searchable = normalizeText(
      `${row.nome_cadastrante} ${row.nome_amigo} ${row.telefone} ${row.endereco} ${row.evangelico || ""} ${row.dia_evento || ""} ${row.observacoes || ""}`,
    );

    const matchesCongregacao =
      !selectedCongregacao || rowCongregacao === selectedCongregacao;
    const matchesDiaEvento =
      !selectedDiaEvento || rowDiaEvento === selectedDiaEvento;
    const matchesEvangelico =
      !selectedEvangelico || rowEvangelico === selectedEvangelico;
    const matchesTerm = !term || searchable.includes(term);

    return (
      matchesCongregacao && matchesDiaEvento && matchesEvangelico && matchesTerm
    );
  });

  currentPage = 1;
  renderFilteredResults();
}

function setupTableFilters(rows) {
  const filterWrap = document.getElementById("table-filters");
  const searchInput = document.getElementById("search-input");
  const congregacaoFilter = document.getElementById("congregacao-filter");
  const diaEventoFilter = document.getElementById("dia-evento-filter");
  const evangelicoFilter = document.getElementById("evangelico-filter");

  if (
    !filterWrap ||
    !searchInput ||
    !congregacaoFilter ||
    !diaEventoFilter ||
    !evangelicoFilter
  )
    return;

  const congregacoes = Array.from(
    new Set(
      rows
        .map((row) => String(row.congregacao || "").trim())
        .filter((value) => value.length > 0),
    ),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));

  const diasEvento = Array.from(
    new Set(
      rows
        .map((row) => String(row.dia_evento || "").trim())
        .filter((value) => value.length > 0),
    ),
  ).sort((a, b) => Number(a) - Number(b));

  congregacaoFilter.innerHTML =
    '<option value="">Todas as congregações</option>' +
    congregacoes
      .map(
        (nome) =>
          `<option value="${escapeHtml(nome)}">${escapeHtml(nome)}</option>`,
      )
      .join("");

  diaEventoFilter.innerHTML =
    '<option value="">Todos os dias</option>' +
    diasEvento
      .map(
        (dia) =>
          `<option value="${escapeHtml(dia)}">Dia ${escapeHtml(dia)}</option>`,
      )
      .join("");

  evangelicoFilter.innerHTML =
    '<option value="">Evangélico (todos)</option>' +
    ["Sim", "Não"]
      .map(
        (opcao) =>
          `<option value="${escapeHtml(opcao)}">Evangélico: ${escapeHtml(opcao)}</option>`,
      )
      .join("");

  if (!searchInput.dataset.bound) {
    searchInput.addEventListener("input", applyTableFilters);
    congregacaoFilter.addEventListener("change", applyTableFilters);
    diaEventoFilter.addEventListener("change", applyTableFilters);
    evangelicoFilter.addEventListener("change", applyTableFilters);
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
setupTransitionToggle();
setupSheetLink();
updateAuthUI();

if (SHOW_TRANSITION_ON_BOOT) {
  runScreenTransition(() => showForm({ skipTransition: true }));
} else {
  showForm();
}
