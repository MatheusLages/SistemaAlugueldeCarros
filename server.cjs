// ============================================================
// DEPENDÊNCIAS E BANCO DE DADOS
// ============================================================
const jsonServer = require("json-server");
const express = require("express");
const {
  randomBytes,
  scryptSync,
  timingSafeEqual,
  randomUUID,
} = require("node:crypto");
const path = require("node:path");
const server = jsonServer.create();
const router = jsonServer.router(
  process.env.DB_FILE || path.join(__dirname, "db.json"),
);
const db = router.db;
const sessions = new Map();
const fail = (res, code, message) => res.status(code).json({ message });
const safe = (u) => {
  const { senhaHash, ...rest } = u;
  return rest;
};
// ============================================================
// SENHAS E VALIDAÇÃO DE CADASTRO
// ============================================================
function passwordHash(value, salt = randomBytes(16).toString("hex")) {
  return `${salt}:${scryptSync(value, salt, 64).toString("hex")}`;
}
function matches(value, hash) {
  const [salt, digest] = String(hash).split(":");
  return (
    !!digest &&
    timingSafeEqual(
      Buffer.from(passwordHash(value, salt).split(":")[1], "hex"),
      Buffer.from(digest, "hex"),
    )
  );
}
function cpfValid(value) {
  const cpf = String(value).replace(/\D/g, "");
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  return [9, 10].every((n) => {
    let sum = 0;
    for (let i = 0; i < n; i++) sum += +cpf[i] * (n + 1 - i);
    return +cpf[n] === ((sum * 10) % 11) % 10;
  });
}
function validateClient(u, id) {
  for (const k of ["nome", "email", "rg", "cpf", "endereco", "profissao"])
    if (!String(u[k] || "").trim()) return `Preencha ${k}.`;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email)) return "E-mail inválido.";
  if (!cpfValid(u.cpf)) return "CPF inválido.";
  if (
    !Array.isArray(u.rendimentos) ||
    u.rendimentos.length > 3 ||
    u.rendimentos.some(
      (r) =>
        !String(r.empregador || "").trim() ||
        !Number.isFinite(+r.valor) ||
        +r.valor <= 0,
    )
  )
    return "Informe até 3 empregadores com rendimentos positivos.";
  if (
    db
      .get("usuarios")
      .value()
      .some((x) => x.id !== id && (x.email === u.email || x.cpf === u.cpf))
  )
    return "E-mail ou CPF já cadastrado.";
}
const clientFields = (b) => ({
  nome: String(b.nome || "").trim(),
  email: String(b.email || "")
    .trim()
    .toLowerCase(),
  rg: String(b.rg || "").trim(),
  cpf: String(b.cpf || "").replace(/\D/g, ""),
  endereco: String(b.endereco || "").trim(),
  profissao: String(b.profissao || "").trim(),
  rendimentos: Array.isArray(b.rendimentos)
    ? b.rendimentos.map((r) => ({
        empregador: String(r.empregador || "").trim(),
        valor: +r.valor,
      }))
    : [],
});
// ============================================================
// SESSÃO DO USUÁRIO
// ============================================================
function login(res, user) {
  const token = randomBytes(32).toString("hex");
  sessions.set(token, { id: user.id, until: Date.now() + 8 * 3600000 });
  res.setHeader(
    "Set-Cookie",
    `bd_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,
  );
  return res.json(safe(user));
}
server.use(
  jsonServer.defaults({
    static: path.join(__dirname, "public"),
    logger: process.env.NODE_ENV !== "test",
  }),
);
server.use(
  "/vendor/bootstrap",
  express.static(path.join(__dirname, "node_modules/bootstrap/dist")),
);
server.get("/modelos", (req, res) =>
  res.sendFile(path.join(__dirname, "MODELOS.html")),
);
server.use(jsonServer.bodyParser);
// ============================================================
// LOGIN E CADASTRO
// ============================================================
server.post("/api/login", (req, res) => {
  const email = String(req.body.email || "")
    .trim()
    .toLowerCase();
  const demoIds = ["cliente-demo", "empresa-demo", "banco-demo"];
  const u = db
    .get("usuarios")
    .value()
    .find(
      (u) =>
        u.email === email ||
        (demoIds.includes(u.id) &&
          u.email === email.replace("@bluedrive.local", "@lagescars.local")),
    );
  let senha = String(req.body.senha || "");
  // Compatibilidade das contas fictícias de demonstração da versão anterior.
  if (u && demoIds.includes(u.id) && senha === "BlueDrive@123")
    senha = "LagesCars@123";
  if (!u || !matches(senha, u.senhaHash))
    return fail(res, 401, "E-mail ou senha incorretos.");
  login(res, u);
});
server.post("/api/cadastro", (req, res) => {
  const u = clientFields(req.body),
    error = validateClient(u);
  if (error) return fail(res, 400, error);
  if (String(req.body.senha || "").length < 8)
    return fail(res, 400, "A senha deve ter pelo menos 8 caracteres.");
  const user = {
    ...u,
    id: randomUUID(),
    tipo: "cliente",
    senhaHash: passwordHash(req.body.senha),
  };
  db.get("usuarios").push(user).write();
  login(res, user);
});
// Atribuição pública das fotografias; nenhum dado de cliente é exposto.
server.get("/api/fotos", (req, res) =>
  res.json(
    db
      .get("automoveis")
      .value()
      .map((c) => ({ marca: c.marca, modelo: c.modelo, ...c.foto })),
  ),
);
// ============================================================
// AUTORIZAÇÃO DOS RECURSOS
// ============================================================
server.use("/api", (req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  const token = String(req.headers.cookie || "")
    .split("; ")
    .find((x) => x.startsWith("bd_session="))
    ?.split("=")[1];
  const session = sessions.get(token);
  req.user =
    session?.until > Date.now() &&
    db.get("usuarios").find({ id: session.id }).value();
  if (!req.user) return fail(res, 401, "Entre na sua conta para continuar.");
  req.agent = ["empresa", "banco"].includes(req.user.tipo);
  req.token = token;
  next();
});
server.get("/api/sessao", (req, res) => res.json(safe(req.user)));
server.post("/api/sair", (req, res) => {
  sessions.delete(req.token);
  res.setHeader(
    "Set-Cookie",
    "bd_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
  );
  res.json({ ok: true });
});
// ============================================================
// CRUD DE CLIENTES
// ============================================================
server.get("/api/usuarios", (req, res) =>
  res.json(
    db
      .get("usuarios")
      .value()
      .filter((u) => req.agent || u.id === req.user.id)
      .map(safe),
  ),
);
server.post("/api/usuarios", (req, res) => {
  if (!req.agent)
    return fail(res, 403, "Apenas agentes podem cadastrar outros clientes.");
  const u = clientFields(req.body),
    error = validateClient(u);
  if (error) return fail(res, 400, error);
  if (String(req.body.senha || "").length < 8)
    return fail(res, 400, "Informe uma senha de ao menos 8 caracteres.");
  const user = {
    ...u,
    id: randomUUID(),
    tipo: "cliente",
    senhaHash: passwordHash(req.body.senha),
  };
  db.get("usuarios").push(user).write();
  res.status(201).json(safe(user));
});
server.patch("/api/usuarios/:id", (req, res) => {
  const old = db.get("usuarios").find({ id: req.params.id }).value();
  if (!old) return fail(res, 404, "Cliente não encontrado.");
  if (old.tipo !== "cliente" || (!req.agent && old.id !== req.user.id))
    return fail(res, 403, "Acesso não permitido.");
  const u = clientFields(req.body),
    error = validateClient(u, old.id);
  if (error) return fail(res, 400, error);
  if (req.body.senha) {
    if (req.body.senha.length < 8)
      return fail(res, 400, "Informe ao menos 8 caracteres para a senha.");
    u.senhaHash = passwordHash(req.body.senha);
  }
  db.get("usuarios").find({ id: old.id }).assign(u).write();
  res.json(safe({ ...old, ...u }));
});
server.delete("/api/usuarios/:id", (req, res) => {
  const u = db.get("usuarios").find({ id: req.params.id }).value();
  if (!u) return fail(res, 404, "Cliente não encontrado.");
  if (u.tipo !== "cliente" || (!req.agent && u.id !== req.user.id))
    return fail(res, 403, "Acesso não permitido.");
  if (db.get("pedidos").some({ clienteId: u.id }).value())
    return fail(
      res,
      409,
      "Este cliente tem pedidos vinculados. Preserve o cadastro para manter o histórico.",
    );
  db.get("usuarios").remove({ id: u.id }).write();
  res.json({ ok: true });
});
// ============================================================
// FROTA E AGENTES
// ============================================================
server.get("/api/automoveis", (req, res) =>
  res.json(db.get("automoveis").value()),
);
server.get("/api/agentes", (req, res) =>
  res.json(
    db
      .get("usuarios")
      .value()
      .filter((u) => u.tipo !== "cliente")
      .map((u) => ({ id: u.id, nome: u.nome, tipo: u.tipo })),
  ),
);
// ============================================================
// VALIDAÇÃO DE ACESSO A PEDIDOS
// ============================================================
function accessible(req, res) {
  const p = db.get("pedidos").find({ id: req.params.id }).value();
  if (!p) {
    fail(res, 404, "Pedido não encontrado.");
    return null;
  }
  if (!req.agent && p.clienteId !== req.user.id) {
    fail(res, 403, "Acesso não permitido.");
    return null;
  }
  return p;
}
// ============================================================
// DADOS E REGRAS DO ALUGUEL
// ============================================================
function orderData(b) {
  return {
    automovelId: String(b.automovelId || ""),
    inicio: b.inicio,
    fim: b.fim,
    observacoes: String(b.observacoes || "").slice(0, 1000),
    propriedadeTipo: b.propriedadeTipo,
    propriedadeId: String(b.propriedadeId || ""),
    bancoId: b.bancoId ? String(b.bancoId) : null,
    creditoValor: b.bancoId ? +b.creditoValor : 0,
    parcelas: b.bancoId ? +b.parcelas : 0,
  };
}
function validateOrder(p, id) {
  if (!db.get("automoveis").find({ id: p.automovelId }).value())
    return "Escolha um automóvel válido.";
  const date = (s) =>
    /^\d{4}-\d{2}-\d{2}$/.test(s || "") &&
    !isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s;
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/Sao_Paulo",
  });
  if (!date(p.inicio) || !date(p.fim) || p.fim < p.inicio || p.inicio < today)
    return "Informe datas válidas: retirada a partir de hoje e devolução igual ou posterior.";
  const owner = db.get("usuarios").find({ id: p.propriedadeId }).value();
  if (
    !owner ||
    owner.tipo !== p.propriedadeTipo ||
    (owner.tipo === "cliente" && owner.id !== p.clienteId)
  )
    return "Proprietário incompatível com o tipo de contrato.";
  if (
    p.bancoId &&
    (!db.get("usuarios").find({ id: p.bancoId, tipo: "banco" }).value() ||
      !Number.isFinite(p.creditoValor) ||
      p.creditoValor <= 0 ||
      !Number.isInteger(p.parcelas) ||
      p.parcelas < 1 ||
      p.parcelas > 60)
  )
    return "Crédito: escolha um banco, valor positivo e entre 1 e 60 parcelas.";
  if (
    db
      .get("pedidos")
      .value()
      .some(
        (x) =>
          x.id !== id &&
          x.automovelId === p.automovelId &&
          ["aprovado", "contratado"].includes(x.status) &&
          x.inicio <= p.fim &&
          x.fim >= p.inicio,
      )
  )
    return "Automóvel indisponível nesse período. Escolha outras datas ou outro veículo.";
}
const history = (req, action) => ({
  em: new Date().toISOString(),
  autorId: req.user.id,
  autor: req.user.nome,
  acao: action,
});
// ============================================================
// GESTÃO DOS PEDIDOS
// ============================================================
server.get("/api/pedidos", (req, res) =>
  res.json(
    db
      .get("pedidos")
      .value()
      .filter((p) => req.agent || p.clienteId === req.user.id),
  ),
);
server.post("/api/pedidos", (req, res) => {
  if (req.agent) return fail(res, 403, "Apenas clientes criam pedidos.");
  const p = { ...orderData(req.body), clienteId: req.user.id },
    error = validateOrder(p);
  if (error) return fail(res, 400, error);
  const car = db.get("automoveis").find({ id: p.automovelId }).value();
  const pedido = {
    ...p,
    id: randomUUID(),
    status: "em_analise",
    diaria: car.diaria,
    criadoEm: new Date().toISOString(),
    parecer: "",
    agenteId: null,
    historico: [
      history(req, "Pedido criado e enviado para análise financeira."),
    ],
  };
  db.get("pedidos").push(pedido).write();
  res.status(201).json(pedido);
});
server.patch("/api/pedidos/:id", (req, res) => {
  const old = accessible(req, res);
  if (!old) return;
  if (!["em_analise", "aprovado", "recusado"].includes(old.status))
    return fail(res, 409, "Este pedido não pode mais ser modificado.");
  const p = { ...orderData(req.body), clienteId: old.clienteId },
    error = validateOrder(p, old.id);
  if (error) return fail(res, 400, error);
  const car = db.get("automoveis").find({ id: p.automovelId }).value();
  const update = {
    ...p,
    diaria: car.diaria,
    status: "em_analise",
    parecer: "",
    agenteId: null,
    historico: [
      ...old.historico,
      history(req, "Pedido modificado; nova análise financeira necessária."),
    ],
  };
  db.get("pedidos").find({ id: old.id }).assign(update).write();
  res.json({ ...old, ...update });
});
server.post("/api/pedidos/:id/cancelar", (req, res) => {
  const p = accessible(req, res);
  if (!p) return;
  if (req.agent)
    return fail(res, 403, "O cancelamento deve ser realizado pelo cliente.");
  if (["cancelado", "contratado"].includes(p.status))
    return fail(
      res,
      409,
      "Pedido cancelado ou com contrato executado não pode ser cancelado.",
    );
  const update = {
    status: "cancelado",
    historico: [...p.historico, history(req, "Pedido cancelado pelo cliente.")],
  };
  db.get("pedidos").find({ id: p.id }).assign(update).write();
  res.json({ ...p, ...update });
});
// ============================================================
// AVALIAÇÃO FINANCEIRA
// ============================================================
server.post("/api/pedidos/:id/avaliar", (req, res) => {
  const p = accessible(req, res);
  if (!p) return;
  if (!req.agent)
    return fail(res, 403, "Apenas empresas e bancos avaliam pedidos.");
  if (p.status !== "em_analise")
    return fail(res, 409, "Somente pedidos em análise podem receber parecer.");
  const { status, parecer } = req.body;
  if (
    !["aprovado", "recusado"].includes(status) ||
    !String(parecer || "").trim()
  )
    return fail(res, 400, "Informe uma decisão e o parecer financeiro.");
  if (status === "aprovado") {
    const error = validateOrder(p, p.id);
    if (error) return fail(res, 409, error);
  }
  const update = {
    status,
    parecer: String(parecer).slice(0, 2000),
    agenteId: req.user.id,
    historico: [...p.historico, history(req, `Parecer financeiro: ${status}.`)],
  };
  db.get("pedidos").find({ id: p.id }).assign(update).write();
  res.json({ ...p, ...update });
});
// ============================================================
// EXECUÇÃO DO CONTRATO E CRÉDITO
// ============================================================
server.post("/api/pedidos/:id/contratar", (req, res) => {
  const p = accessible(req, res);
  if (!p) return;
  if (!req.agent)
    return fail(res, 403, "A execução do contrato cabe aos agentes.");
  if (p.status !== "aprovado")
    return fail(res, 409, "O contrato exige parecer financeiro positivo.");
  if (p.bancoId && req.user.id !== p.bancoId)
    return fail(
      res,
      403,
      "O banco selecionado deve conceder o crédito e executar este contrato.",
    );
  const error = validateOrder(p, p.id);
  if (error) return fail(res, 409, error);
  const state = structuredClone(db.getState());
  const id = randomUUID(),
    dias =
      Math.round((Date.parse(p.fim) - Date.parse(p.inicio)) / 86400000) + 1;
  const contrato = {
    id,
    pedidoId: p.id,
    clienteId: p.clienteId,
    automovelId: p.automovelId,
    agenteId: req.user.id,
    propriedadeTipo: p.propriedadeTipo,
    propriedadeId: p.propriedadeId,
    inicio: p.inicio,
    fim: p.fim,
    diaria: p.diaria,
    dias,
    total: dias * p.diaria,
    criadoEm: new Date().toISOString(),
    creditoId: p.bancoId ? randomUUID() : null,
  };
  state.contratos.push(contrato);
  if (p.bancoId)
    state.creditos.push({
      id: contrato.creditoId,
      contratoId: id,
      bancoId: p.bancoId,
      valor: p.creditoValor,
      parcelas: p.parcelas,
      concedidoEm: contrato.criadoEm,
    });
  Object.assign(
    state.pedidos.find((x) => x.id === p.id),
    {
      status: "contratado",
      historico: [...p.historico, history(req, "Contrato executado.")],
    },
  );
  db.setState(state).write();
  res.status(201).json(contrato);
});
// ============================================================
// CONSULTA DE CONTRATOS E CRÉDITOS
// ============================================================
server.get("/api/contratos", (req, res) =>
  res.json(
    db
      .get("contratos")
      .value()
      .filter((c) => req.agent || c.clienteId === req.user.id),
  ),
);
server.get("/api/creditos", (req, res) => {
  const ids = db
    .get("contratos")
    .value()
    .filter((c) => req.agent || c.clienteId === req.user.id)
    .map((c) => c.id);
  res.json(
    db
      .get("creditos")
      .value()
      .filter((c) => ids.includes(c.contratoId)),
  );
});
// O router genérico não é exposto, para impedir acessos sem validação.
// Todas as rotas de negócio usam o banco do JSON Server persistido em db.json.
server.use("/api", (req, res) => fail(res, 404, "Recurso não encontrado."));
server.use((err, req, res, next) => {
  console.error(err.message);
  fail(res, 500, "Não foi possível concluir a operação.");
});
// ============================================================
// INICIALIZAÇÃO DO SERVIDOR LOCAL
// ============================================================
const port = Number(process.env.PORT || 3000);
if (require.main === module) {
  const listener = server.listen(port, "127.0.0.1", () =>
    console.log(`Lages Cars: http://127.0.0.1:${port}`),
  );
  listener.on("error", (error) => {
    console.error(
      error.code === "EADDRINUSE"
        ? `A porta ${port} já está em uso. Abra http://127.0.0.1:${port} se o sistema já estiver iniciado, ou encerre a outra execução antes de tentar novamente.`
        : `Não foi possível iniciar o servidor: ${error.message}`,
    );
    process.exitCode = 1;
  });
}
module.exports = { server, passwordHash, cpfValid };
