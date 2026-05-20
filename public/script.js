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
  // Substitua a URL abaixo pela URL do seu Apps Script
  fetch("https://script.google.com/macros/s/AKfycby5OGSC-AL5ovWYLFBf8_sU_VIzkC9O5_t32Y6MVGr5rTvCfd5M2cb4wcEthwuc99EwsQ/exec", {
    method: "POST",
    mode: "cors",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
    .then((res) => res.json())
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
  // Substitua a URL abaixo pela URL do seu Apps Script
  fetch("https://script.google.com/macros/s/AKfycby5OGSC-AL5ovWYLFBf8_sU_VIzkC9O5_t32Y6MVGr5rTvCfd5M2cb4wcEthwuc99EwsQ/exec?count=1")
    .then((res) => res.json())
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
