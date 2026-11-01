const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawn } = require("node:child_process");
test("Fluxo completo, autorização e persistência em banco isolado", async (t) => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "lagescars-test-"));
  const file = path.join(temp, "db.json");
  fs.copyFileSync(path.join(__dirname, "db.json"), file);
  const child = spawn(process.execPath, ["server.cjs"], {
    cwd: __dirname,
    env: { ...process.env, DB_FILE: file, PORT: "3107", NODE_ENV: "test" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  t.after(() => {
    child.kill();
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Servidor de teste não iniciou.")),
      10000,
    );
    child.once("error", reject);
    child.stdout.on("data", (b) => {
      if (b.toString().includes("Lages Cars")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.stderr.on("data", (b) => {
      clearTimeout(timer);
      reject(new Error(b.toString()));
    });
  });
  async function call(route, method = "GET", body, cookie = "") {
    const r = await fetch(`http://127.0.0.1:3107/api/${route}`, {
      method,
      headers: { "Content-Type": "application/json", Cookie: cookie },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: r.status,
      body: await r.json(),
      cookie: r.headers.get("set-cookie")?.split(";")[0],
    };
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 90);
  const start = tomorrow.toISOString().slice(0, 10);
  tomorrow.setDate(tomorrow.getDate() + 2);
  const end = tomorrow.toISOString().slice(0, 10);
  const company = (
    await call("login", "POST", {
      email: "empresa@lagescars.local",
      senha: "LagesCars@123",
    })
  ).cookie;
  const bank = (
    await call("login", "POST", {
      email: "banco@lagescars.local",
      senha: "LagesCars@123",
    })
  ).cookie;
  const client = (
    await call("login", "POST", {
      email: "cliente@lagescars.local",
      senha: "LagesCars@123",
    })
  ).cookie;
  assert.equal((await call("fotos")).body.length, 6);
  const fleet = await call("automoveis", "GET", null, client);
  assert.ok(
    fleet.body.every(
      (car) => car.foto?.arquivo && car.foto?.licenca && car.foto?.fonte,
    ),
  );
  for (const car of fleet.body) {
    const image = await fetch("http://127.0.0.1:3107/" + car.foto.arquivo);
    assert.equal(image.status, 200);
    assert.ok(image.headers.get("content-type").startsWith("image/"));
  }
  assert.equal((await call("pedidos")).status, 401);
  assert.equal(
    (
      await call("login", "POST", {
        email: "cliente@lagescars.local",
        senha: "errada",
      })
    ).status,
    401,
  );
  const registration = {
    nome: "Cliente Teste",
    email: "teste@exemplo.local",
    cpf: "11144477735",
    rg: "RG-TESTE",
    endereco: "Endereço fictício",
    profissao: "Profissional de testes",
    rendimentos: [],
    senha: "Teste@1234",
    tipo: "banco",
  };
  assert.equal(
    (await call("cadastro", "POST", { ...registration, cpf: "00000000000" }))
      .status,
    400,
  );
  assert.equal(
    (
      await call("cadastro", "POST", {
        ...registration,
        rendimentos: Array(4).fill({ empregador: "Exemplo", valor: 100 }),
      })
    ).status,
    400,
  );
  const registered = await call("cadastro", "POST", registration);
  assert.equal(registered.status, 200);
  assert.equal(registered.body.tipo, "cliente");
  assert.equal(registered.body.senhaHash, undefined);
  const own = registered.cookie,
    uid = registered.body.id;
  assert.equal((await call("cadastro", "POST", registration)).status, 400);
  assert.equal(
    (
      await call(
        `usuarios/${uid}`,
        "PATCH",
        { ...registration, nome: "Nome atualizado" },
        own,
      )
    ).status,
    200,
  );
  assert.equal(
    (await call(`usuarios/${uid}`, "PATCH", registration, client)).status,
    403,
  );
  const draft = {
    automovelId: "car-4",
    inicio: start,
    fim: end,
    propriedadeTipo: "cliente",
    propriedadeId: uid,
    observacoes: "Teste",
    bancoId: null,
  };
  assert.equal(
    (await call("pedidos", "POST", { ...draft, fim: "2020-01-01" }, own))
      .status,
    400,
  );
  assert.equal((await call("pedidos", "POST", draft, company)).status, 403);
  let p = await call("pedidos", "POST", draft, own);
  assert.equal(p.status, 201);
  const id = p.body.id;
  assert.equal(
    (await call("pedidos", "GET", null, client)).body.some((p) => p.id === id),
    false,
  );
  assert.equal(
    (
      await call(
        `pedidos/${id}/avaliar`,
        "POST",
        { status: "aprovado", parecer: "Teste" },
        own,
      )
    ).status,
    403,
  );
  assert.equal(
    (await call(`pedidos/${id}/contratar`, "POST", {}, company)).status,
    409,
  );
  assert.equal(
    (
      await call(
        `pedidos/${id}/avaliar`,
        "POST",
        { status: "aprovado", parecer: "Renda compatível." },
        company,
      )
    ).status,
    200,
  );
  assert.equal(
    (await call(`pedidos/${id}`, "PATCH", draft, own)).body.status,
    "em_analise",
  );
  assert.equal(
    (
      await call(
        `pedidos/${id}/avaliar`,
        "POST",
        { status: "recusado", parecer: "Rever informações." },
        company,
      )
    ).body.status,
    "recusado",
  );
  const creditDraft = {
    ...draft,
    bancoId: "banco-demo",
    creditoValor: 500,
    parcelas: 5,
  };
  assert.equal(
    (await call(`pedidos/${id}`, "PATCH", creditDraft, own)).status,
    200,
  );
  await call(
    `pedidos/${id}/avaliar`,
    "POST",
    { status: "aprovado", parecer: "Aprovado após revisão." },
    bank,
  );
  assert.equal(
    (await call(`pedidos/${id}/contratar`, "POST", {}, company)).status,
    403,
  );
  const executed = await call(`pedidos/${id}/contratar`, "POST", {}, bank);
  assert.equal(executed.status, 201);
  assert.equal(executed.body.total, 159 * 3);
  assert.equal(
    (await call(`pedidos/${id}/contratar`, "POST", {}, bank)).status,
    409,
  );
  assert.equal(
    (await call("creditos", "GET", null, own)).body[0].bancoId,
    "banco-demo",
  );
  assert.equal((await call("pedidos", "POST", draft, own)).status, 400);
  assert.equal(
    (await call(`pedidos/${id}/cancelar`, "POST", {}, own)).status,
    409,
  );
  assert.equal(
    (await call(`usuarios/${uid}`, "DELETE", null, own)).status,
    409,
  );
  const other = await call(
    "pedidos",
    "POST",
    { ...draft, automovelId: "car-6" },
    own,
  );
  assert.equal(
    (await call(`pedidos/${other.body.id}/cancelar`, "POST", {}, own)).body
      .status,
    "cancelado",
  );
  const tempClient = await call(
    "usuarios",
    "POST",
    { ...registration, cpf: "12345678909", email: "remover@exemplo.local" },
    company,
  );
  assert.equal(tempClient.status, 201);
  assert.equal(
    (await call(`usuarios/${tempClient.body.id}`, "DELETE", null, company))
      .status,
    200,
  );
  const saved = JSON.parse(fs.readFileSync(file, "utf8"));
  assert.equal(saved.pedidos.find((p) => p.id === id).status, "contratado");
  assert.ok(saved.contratos.find((c) => c.id === executed.body.id));
  await call("sair", "POST", {}, own);
  assert.equal((await call("pedidos", "GET", null, own)).status, 401);
});
