# Lages Cars — Sistema de Aluguel de Carros

Protótipo acadêmico do LAB02 de Desenvolvimento de Interfaces Web. Clientes solicitam aluguéis; empresas e bancos avaliam os pedidos e executam contratos. Interface em azul, preto e branco, com fotografias reais dos modelos.

Estrutura adaptada do [template de README indicado pelo professor](https://github.com/joaopauloaramuni/desenvolvimento-de-interfaces-web/blob/main/TEMPLATES/template_README.md).

## Status do projeto

Versão 1.1: marca Lages Cars, código reunido em menos arquivos, fotos reais com créditos e mesmas regras de cadastro, pedidos e contratos. A publicação no GitHub e a identificação dos integrantes dependem dos dados da equipe.

## Índice

- [Links úteis](#links-úteis)
- [Sobre o projeto](#sobre-o-projeto)
- [Funcionalidades principais](#funcionalidades-principais)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Arquitetura](#arquitetura)
- [Instalação e execução](#instalação-e-execução)
- [Estrutura de arquivos](#estrutura-de-arquivos)
- [Fotografias reais](#fotografias-reais)
- [Testes](#testes)
- [Documentações utilizadas](#documentações-utilizadas)

## Links úteis

- Aplicação: http://127.0.0.1:3000
- [Modelagem UML e versões anteriores](MODELOS.html) — abrir no navegador; também disponível em http://127.0.0.1:3000/modelos quando o servidor estiver ativo.
- Créditos das fotos: botão “Créditos das fotografias” na tela de entrada e no rodapé do painel.

## Sobre o projeto

O sistema reúne cadastro prévio, gestão dos dados pessoais e financeiros do cliente, pedidos de aluguel e avaliação pelos agentes (empresas e bancos). Um pedido aprovado pode originar um contrato e, opcionalmente, um crédito concedido pelo banco indicado.

As páginas são montadas com JavaScript e Bootstrap 5. As operações persistem em `db.json` por meio da API do JSON Server; não há persistência de negócios em localStorage.

## Funcionalidades principais

- Cadastro/login e saída; autorização no servidor por perfil e titularidade.
- CRUD de clientes, CPF válido, e-mail/CPF únicos, RG, endereço e profissão.
- Zero a três empregadores com rendimentos positivos.
- Catálogo com matrícula, marca, modelo, ano, placa e diária, busca e categoria.
- Cliente cria, consulta, modifica e cancela pedidos próprios.
- Agentes consultam, modificam e emitem parecer financeiro obrigatório.
- Alterações reiniciam a análise; aprovação libera contratação.
- Propriedade contratual de cliente, empresa ou banco.
- Crédito opcional: banco, valor e parcelas; somente o banco indicado executa contrato com crédito.
- Histórico, impressão de contratos e bloqueio de reservas conflitantes.

## Tecnologias utilizadas

HTML5, CSS3, JavaScript, Fetch API, Bootstrap **5.3.8**, JSON Server **0.17.4** estável e Node.js 18 ou superior. As fotografias foram selecionadas pela API oficial do Wikimedia Commons. As dependências continuam com versões fixadas no lockfile.

## Arquitetura

```text
public/index.html (HTML + CSS + JavaScript)
                  |
             Fetch /api
                  |
             server.cjs
        JSON Server + regras
                  |
               db.json
```

Os dois subsistemas do enunciado permanecem: construção dinâmica das páginas (`index.html (JavaScript)`) e gestão de pedidos/contratos (`server.cjs`). O frontend foi reunido em um módulo único, incluindo Fetch, formulários e páginas. O backend concentra sessões, validações e acesso ao banco do JSON Server.

As entidades são objetos JSON: `usuarios` com `tipo` cliente/empresa/banco, `automoveis`, `pedidos`, `contratos` e `creditos`. Rendimentos ficam embutidos no cliente; metadados de fotografia ficam no automóvel. Senhas usam scrypt com salt; cookies são HttpOnly e SameSite=Strict. Sessões em memória duram oito horas e encerram ao reiniciar o servidor.

O arquivo `MODELOS.html` reúne os diagramas e suas fontes PlantUML, preservando v1 e v2. Os cinco diagramas v3 atualizados registram a nova estrutura e os metadados das fotografias. Não foram fornecidos modelos anteriores ao projeto nem feedback em aula.

## Instalação e execução

Abra a pasta que contém `package.json` no VS Code. No terminal:

```powershell
npm.cmd ci
npm.cmd start
```

Abra **http://127.0.0.1:3000** e mantenha o terminal ativo. O Live Server da porta 5500 não executa o backend. Não abra `public/index.html` diretamente.

Alternativas: execute `INICIAR.cmd`, que instala as dependências se estiverem ausentes; ou abra `LagesCars.code-workspace` e pressione **F5** após a instalação. A configuração do VS Code inicia o servidor e abre o navegador quando ele fica pronto.

Nenhuma chave de API é necessária. `PORT` altera a porta, `DB_FILE` seleciona outra base e `NODE_ENV=test` reduz logs. O servidor escuta em `127.0.0.1`.

### Demonstração

| Perfil | E-mail | Senha |
| --- | --- | --- |
| Cliente | `cliente@lagescars.local` | `LagesCars@123` |
| Empresa | `empresa@lagescars.local` | `LagesCars@123` |
| Banco | `banco@lagescars.local` | `LagesCars@123` |

As credenciais fictícias antigas continuam aceitas para compatibilidade. Dados de usuários reais, se houver, não são renomeados. O arquivo `db.json` já vem preenchido; alterações persistem nele. Faça backup antes de editar manualmente. Não foi mantido um script separado para regenerar e sobrescrever a base.

### Roteiro de apresentação

Entre como cliente, consulte a frota e solicite um automóvel em datas futuras. Entre como empresa, consulte o cliente e emita parecer positivo. Execute o contrato. Para demonstrar crédito, faça outro pedido indicando Banco Horizonte e conclua com a conta do banco. Consulte os contratos com o cliente, recarregue e confira os registros em `db.json`.

Compare os modelos no arquivo `MODELOS.html` e explique a redução de arquivos. A equipe deve compreender os fluxos para a apresentação e registrar futuras revisões reais como novas versões.

## Estrutura de arquivos

```text
public/
  index.html          Estrutura da página
  imagens/            Seis fotografias JPEG otimizadas
server.cjs            JSON Server, sessão e regras de negócio
db.json               Dados e créditos das fotografias
package.json          Dependências e comandos
package-lock.json     Versões reprodutíveis
teste.cjs             Teste de integração em base isolada
README.md             Documentação reunida
MODELOS.html          Diagramas e fontes em um único arquivo
INICIAR.cmd           Inicialização no Windows
LagesCars.code-workspace
.vscode/launch.json   Inicialização por F5
```

Sem contar dependências instaladas, arquivos do frontend foram reduzidos a três, mais as seis fotos. Foram removidos o módulo separado de API, os scripts auxiliares, a logo em arquivo separado, a cópia do template e as várias pastas de documentação. O código foi formatado para leitura, sem minificação.

## Fotografias reais

Banco de imagens: **Wikimedia Commons**. A seleção utilizou `action=query`, `prop=imageinfo` e `iiprop=url|extmetadata` na API pública para obter foto, autor, fonte e licença. Não são ilustrações geradas nem renders 3D.

As seis fotos foram conferidas por modelo e salvas em `public/imagens/` para evitar indisponibilidade de um serviço externo durante a apresentação. O aplicativo não depende de uma nova consulta ao Commons a cada carregamento. `GET /api/fotos` entrega os créditos públicos; `GET /api/automoveis` entrega o catálogo com metadados das fotos para usuários autenticados.

Cada objeto `automovel.foto` contém `arquivo`, `titulo`, `autor`, `licenca`, `licencaUrl`, `fonte` e `alteracao`. O crédito completo aparece no botão “Créditos das fotografias”. As fotos estão sob CC BY 3.0, CC BY 4.0 ou CC BY-SA 4.0 conforme o arquivo. Foram redimensionadas/convertidas para JPEG e enquadradas responsivamente; fotos derivadas sob ShareAlike mantêm a licença indicada. A licença do software não substitui as licenças das imagens.

Fotos ilustram o modelo, não a unidade física cadastrada: ano, cor e acabamento podem variar. Não há alegação de parceria com fabricantes ou fotógrafos.


## Histórias do usuário e critérios de aceite

| ID | História | Critério de aceite |
| --- | --- | --- |
| HU01 | Como visitante, quero cadastrar-me para acessar o sistema. | Dados obrigatórios, CPF válido e e-mail/CPF únicos; cadastro público cria somente cliente. |
| HU02 | Como usuário, quero entrar e sair da conta. | Login verifica senha no servidor; recursos de negócio exigem sessão; saída invalida a sessão. |
| HU03 | Como cliente, quero consultar e alterar meu cadastro. | Titular consulta e modifica seus dados; outro cliente não tem acesso. |
| HU04 | Como agente, quero gerenciar cadastros de clientes. | Permite criar, listar, consultar, alterar e excluir cliente sem pedidos vinculados. |
| HU05 | Como cliente, quero declarar empregadores e rendimentos. | Aceita zero a três entidades com valores positivos; rejeita a quarta no servidor. |
| HU06 | Como cliente, quero escolher um veículo. | Exibe marca, modelo, ano, matrícula, placa, diária e fotografia; permite busca e filtro. |
| HU07 | Como cliente, quero solicitar um aluguel. | Pedido com datas válidas, veículo e propriedade contratual; inicia em análise. |
| HU08 | Como cliente, quero acompanhar meus pedidos. | Exibe apenas pedidos próprios, com status, parecer e histórico. |
| HU09 | Como cliente, quero modificar ou cancelar um pedido. | Alterar reinicia análise; cancelar preserva histórico; contratado/cancelado não aceita alteração. |
| HU10 | Como empresa ou banco, quero modificar e avaliar pedidos. | Agente consulta dados financeiros e registra decisão com parecer obrigatório. |
| HU11 | Como agente, quero executar um contrato aprovado. | Exige aprovação, ausência de conflito de reservas e contratação única. |
| HU12 | Como cliente, quero indicar a propriedade contratual. | Proprietário válido pode ser o titular, uma empresa ou um banco. |
| HU13 | Como cliente, quero associar crédito bancário. | Banco válido, valor positivo e 1–60 parcelas; banco escolhido concede crédito na contratação. |
| HU14 | Como usuário, quero consultar e imprimir contratos. | Cliente vê contratos próprios; agentes consultam todos; crédito associado é identificado. |
| HU15 | Como usuário, quero conhecer a origem das fotografias. | Créditos exibem autor, licença, fonte e alterações de cada foto. |

## Rastreabilidade entre requisitos, modelos e código

| Requisito | Modelo v3 | Implementação |
| --- | --- | --- |
| Cadastro e CRUD de clientes | Casos de uso; Usuario/Cliente/Rendimento | server.cjs: cadastro/usuarios; index.html (JavaScript): formulários e perfil |
| Pedidos e status | Pedido; casos de uso; estados do pedido | server.cjs: pedidos; index.html (JavaScript): criação, detalhes e listagem |
| Avaliação financeira | Agente/Empresa/Banco; casos de uso | server.cjs: avaliar; index.html (JavaScript): formulário de parecer |
| Contratos, propriedade e crédito | Contrato/ContratoCredito e vínculos | server.cjs: contratar; index.html (JavaScript): contratos |
| Frota e fotografias | Automovel/Foto | db.json; public/imagens; index.html (JavaScript): catálogo e créditos |
| Dois subsistemas e persistência | Pacotes e componentes | public/index.html → Fetch → server.cjs → JSON Server/db.json |

### Revisão da modelagem para apresentação

Os diagramas atuais v3 de casos de uso, classes, pacotes, componentes e estados estão em **MODELOS.html**, junto às imagens e fontes editáveis de v1 e v2. A revisão de 01/11/2026 atualiza a marca, a consolidação dos arquivos e o objeto Foto. Compare as versões durante a apresentação. Feedback em aula não foi fornecido e não é presumido; registre futuras alterações como nova versão.

## Regras de negócio

1. Acesso aos recursos de negócio exige sessão. Cadastro público sempre cria cliente; agentes vêm previamente cadastrados.
2. Retirada a partir da data atual em America/Sao_Paulo; devolução igual ou posterior. As duas datas contam na cobrança de diárias.
3. Fluxo: `em_analise` → `aprovado` ou `recusado`; aprovado → `contratado`. Cliente pode cancelar antes da contratação.
4. Cliente titular ou agente pode modificar pedido em análise, aprovado ou recusado. A modificação reinicia a análise e invalida o parecer anterior.
5. Pedidos aprovados/contratados bloqueiam o mesmo automóvel em períodos sobrepostos, inclusive nas datas de fronteira.
6. Parecer textual é obrigatório. Contratação é única e exige aprovação. Se houver crédito, o banco indicado deve executar.
7. Contrato, crédito e status do pedido são persistidos juntos. Propriedade é contratual, sem alterar o cadastro permanente do veículo.
8. Exclusão de cliente com pedidos é bloqueada para preservar o histórico. Cancelamento é lógico.

## API

| Método e rota em /api | Finalidade e acesso |
| --- | --- |
| POST /cadastro, POST /login | Cadastro público e autenticação |
| GET /sessao, POST /sair | Sessão atual e saída |
| GET /usuarios | Próprio cadastro; agentes consultam clientes |
| POST /usuarios | Agente cadastra cliente |
| PATCH, DELETE /usuarios/:id | Titular ou agente; exclusão exige ausência de pedidos |
| GET /automoveis, GET /agentes | Catálogo e agentes para usuários cadastrados |
| GET /fotos | Créditos públicos das fotografias |
| GET, POST /pedidos | Consulta por titularidade/perfil; criação pelo cliente |
| PATCH /pedidos/:id | Modifica e reinicia análise |
| POST /pedidos/:id/cancelar | Cancela pelo titular |
| POST /pedidos/:id/avaliar | Agente aprova/recusa com parecer |
| POST /pedidos/:id/contratar | Agente executa contrato aprovado |
| GET /contratos, GET /creditos | Dados próprios ou todos para agentes |

Respostas: 200/201 para sucesso; 400 para dados inválidos; 401 para sessão ausente; 403 para falta de permissão; 404 para recurso inexistente; 409 para conflito. Erros são JSON com `message`. Hashes nunca são retornados ao navegador.

## Testes

```powershell
npm.cmd test
```

O teste inicia outra instância na porta 3107 com uma cópia temporária de `db.json`. Verifica cadastro, CPF, duplicidade, limite de empregadores, autorização, edição, aprovação/recusa, cancelamento, contratação, crédito e persistência. Também confere os créditos das seis fotos e o acesso HTTP a cada imagem. O banco da apresentação não é modificado pelos testes.

Na revisão manual, confira desktop/celular, filtro de veículos, créditos de imagem, formulários e impressão. Não há pagamentos reais, análise automática de solvência, assinatura eletrônica, recuperação de senha ou teste de carga. JSON Server é um protótipo educacional de processo único.

## Deploy

O servidor Node precisa estar ativo com armazenamento persistente para `db.json`. GitHub Pages sozinho não executa esse backend. Para o GitHub, envie os arquivos do projeto sem `node_modules`. Não foi informado repositório de destino. Hospedagem externa exige configuração própria e revisão de segurança.

## Documentações utilizadas

- [Bootstrap 5](https://getbootstrap.com/docs/5.3/getting-started/introduction/)
- [JSON Server 0.17.4](https://github.com/typicode/json-server/tree/v0.17.4)
- [Fetch API — MDN](https://developer.mozilla.org/pt-BR/docs/Web/API/Fetch_API)
- [API Imageinfo — Wikimedia/MediaWiki](https://www.mediawiki.org/wiki/API:Imageinfo)
- [Diagrama de pacotes](https://engsoftmoderna.info/cap4.html#diagrama-de-pacotes)
- [Projetos da disciplina](https://github.com/joaopauloaramuni/desenvolvimento-de-interfaces-web/tree/main/PROJETOS)
- [Template de README](https://github.com/joaopauloaramuni/desenvolvimento-de-interfaces-web/blob/main/TEMPLATES/template_README.md)

## Autores, contribuição e agradecimentos

Equipe acadêmica: nomes e matrículas ainda não fornecidos. Implementação preparada com assistência do Codex e sujeita à revisão e compreensão pela equipe. Ao modificar regras, atualize os testes e a modelagem no mesmo trabalho. Agradecimentos ao professor João Paulo Carneiro Aramuni, aos projetos Bootstrap/JSON Server, à documentação MDN e aos fotógrafos identificados nos créditos.

## Licença

Material acadêmico, sem licença de redistribuição do software definida pela equipe. As dependências e fotografias mantêm suas próprias licenças e atribuições.

## Organização consolidada — 01/11/2026

Toda a interface está em **public/index.html**: estrutura HTML, CSS dentro de `<style>` e JavaScript dentro de `<script type="module">`. Cada responsabilidade está identificada por comentários. Os antigos arquivos separados app.js e style.css foram incorporados e removidos.

**server.cjs** reúne a API, autenticação, banco e regras, também com comentários de seção. **teste.cjs** é mantido separado para não iniciar testes durante o uso normal. O frontend roda no navegador; o servidor roda no Node. Separar esses ambientes evita condições e complexidade desnecessárias. Dependências em node_modules não devem ser unificadas manualmente.

### Executar o ZIP no VS Code

Extraia o ZIP e abra **LagesCars.code-workspace**. Na primeira utilização, execute `npm.cmd ci` no terminal da pasta. Pressione **F5** para iniciar o backend e abrir **http://127.0.0.1:3000**. Alternativamente, execute **INICIAR.cmd**, que instala as dependências ausentes e inicia o servidor. Mantenha a execução ativa.

O Live Server está configurado na porta **5502**, com raiz public; ao abri-lo, a página encaminha à porta **3000**, onde funciona a API. O Live Server sozinho não inicia o Node. `node_modules` não acompanha o ZIP: será recriado por npm ci, conforme package-lock.json. Os dados existentes e as seis fotos estão incluídos.
