# Insight Hub

prompt completo


Quero que você gere um Knowledge Base completo para o meu projeto “Insights da Casa”,
 baseado no PRD abaixo. A ideia é que possamos antes de desenvolver 
ter a base de conhecimento alinhada, então não inicia o desenvolvimento da aplicação de cara. 
Estruture a base de conhcimento com:


# PRD - Insigths de Casa

## PROMPTS

Faseamento do projeto

# 🧠 Insights da Casa

**Time:** NoCoders

**Contribuidores:** Giovanna e Filippi

**Status**: Rascunho / Revisão do Problema / **Revisão da solução** / Em Produção / Resultados Coletados

## 🎯 **Objetivo do Produto**

Criar uma plataforma centralizada onde colaboradores **autorizados** possam visualizar, analisar e acompanhar feedbacks recebidos pela empresa — tanto de clientes quanto de funcionários — em forma de **listas, relatórios e dashboards**.

O objetivo principal: **melhorar a tomada de decisão dos times de produto, a priorização de iniciativas e o clima organizacional**.

## **🕵️‍♀️ Fatos**

**Contexto do problema:**

Muitos formulários espalhados e poucas pessoas focadas em analisá-los para realmente aplicar os insights na tomada de decisão;

Dificuldade dos colaboradores na construção de relatórios visualmente agradáveis e com baixo viés de interpretação;

Baixa visibilidade das lideranças sobre o clima organizacional da empresa x o próprio time, para entender gaps de desenvolvimento internos ou mesmo onde o time se destaca

Despriorização constante do time de produto para construir uma solução que facilite o acesso aos feedbacks de usuários

**Caminhos da solução:** 

Centralizar em um local os feedbacks, além de melhorar a documentação histórica dos mesmo, auxiliando no processo de visualização.

Ter gráficos gerados de forma automática, simplifica o processo de análise de informações brutas, aumentando a eficiência do time e acelerando a interpretação dos resultados em insigths aplicáveis

## **🤔 Hipótese**

***SE** implementarmos o Insights de Caso **ENTÃO** teremos dados de feedbacks da empresa e dos produtos centralizados e organizados em um mesmo portal, com dashboards e relatórios personalizáveis, **PORTANTO** teremos mais colaboradores usando esses dados para geração de insigths, priorização de iniciativas e tomada de decisões.*

## 🏛️ **1. Escopo do Sistema**

A plataforma possui três grandes eixos:

### **1. Feedbacks de Clientes**

- Feedbacks gerais sobre cursos, eventos, produtos e serviços.
- Entrada de dados via planilha, webhook ou API (dependendo do fluxo).
- Exibição em gráficos filtráveis (satisfação, NPS, categorias, palavras chaves, etc.).

### **2. Feedbacks Internos (Funcionários)**

- Feedback sobre clima, processos, liderança etc.
- Respostas anônimas ou identificadas (dependendo do tipo).
- Dashboard interno para RH e Gestores.

### **3. Controle de Acesso (Login com Permissões)**

- Funcionários autenticados via e-mail/senha (Supabase Auth ou Lovable Auth).
- Níveis de permissão para acesso aos dashboards:
    - **Admin** → vê tudo.
    - **Gestor** → vê sua área + feedbacks globais agregados.
    - **Colaborador** → acesso apenas aos dashboards públicos (aqueles relacionados a feedback de produtos).

---

## 🔐 **2. Perfis de Usuário**

| Perfil | Acesso |
| --- | --- |
| **Admin** | Todos os feedbacks, dashboards, gestão de usuários. |
| **Gestor** | Feedbacks de sua equipe e dashboards macro. |
| **Colaborador** | Painel geral de insights + visão limitada. |
|  |  |

⚠️ Todos os perfis podem acessar os feedbacks de clientes. Os únicos painéis restritos são so de feedbacks internos.  

## 🗂️ **3. Estrutura de Dados (Supabase)**

### **Tabela: users**

- id (uuid)
- email
- nome
- role ("admin", "gestor", "colaborador")
- created_at

### **Tabela: feedback_clientes**

### **Tabela: feedback_interno**

- id
- cliente_email
- categoria (ex: app, evento ou suporte)
- nota (1–10)
- feedback_texto
- tags
- data_envio

- id
- colaborador_id (para anônimo → null)
- setor
- Liderança: nota (1-10)
- Ambiente: nota (1-10)
- Processos:  (1-10)
- Comunicação:  (1-10)
- feedback_texto
- data_envio

## 📊 **4. Features Principais**

### 🔎 **4.1. Login + Gerenciamento de Permissões**

- Login e senha usando Supabase Auth.
- Redirecionamento pós-login com base no perfil.
- Ocultação automática dos dashboards não permitidos.

---

### ⭐ **4.2. Dashboard de Feedbacks de Clientes**

### Funcionalidades:

- Visão geral com:
    - NPS
    - Distribuição de notas
    - Palavras mais citadas (word cloud)
    - Gráficos filtráveis por:
        - Data
        - Categoria (app, evento ou suporte)
        - Nota
- Lista de feedbacks com busca e filtros avançados.
- Exportar CSV com os feedbacks filtrados ou não.
- Possibilidade de exportação do dashboard em PDF ou PNG

---

### 🧭 **4.3. Dashboard de Feedbacks Internos**

### Funcionalidades:

- Score geral (satisfação/clima).
- Gráficos sobre:
    - Liderança
    - Ambiente
    - Processos
    - Comunicação
- Possibilidade de respostas anônimas.
- Visão agregada por setor (somente para gestores/admins)
- Lista de feedbacks com busca e filtros avançados.
- Exportar CSV com os feedbacks filtrados ou não.
- Possibilidade de exportação do dashboard em PDF ou PNG

---

## ⚙️ **4.4. Administração**

Somente Admin acessa:

- CRUD de usuários (adicionar, trocar permissões etc.).
- Upload manual de feedbacks via CSV.
- Integração com API/Webhook para ingestão automática.

---

## 🔁 **5. Fluxos do Usuário (UX) - OPCIONAL**

### **Fluxo 1 — Login**

1. Usuário acessa a plataforma
2. Faz login
3. É direcionado para a página adequada conforme o perfil:
    - Admin → Página inicial com possibilidade de visualização de todos os dashboard
    - Gestor → Página inicial com possibilidade de visualização dos dashboard da equipe + gerais com os feedbacks de clientes
    - Colaborador → Página inicial com possibilidade de visualização dos dashboards gerais com os feedbacks de clientes

---

### **Fluxo 2 — Visualização de Feedbacks de Clientes**

1. Usuário logado abre “Feedbacks de Clientes”
2. Visualiza gráficos gerais
3. Filtra por categoria/nota/data
4. Clica em feedback individual para ver detalhes

---

### **Fluxo 3 — Feedbacks Internos**

1. Usuário acessa painel interno
2. Visualiza gráficos gerais
3. Filtra por equipe (gestor/admin)
4. Acompanha indicadores de clima

---

### **Fluxo 4 — Administração**

1. Admin acessa área de configuração
2. Gerencia usuários
3. Faz upload de CSV ou integra feedbacks
4. Atualiza permissões ou regras de visualização

## 🏗️ **6. Requisitos Técnicos (Lovable + Supabase)**

### **Conexão com Supabase**

- CRUD para as tabelas de feedback.
- Controle de acesso com `row-level security`.
- Views preparadas para dashboards.

### **Frontend (Lovable)**

- Páginas:
    - Login
    - Dashboard Clientes
    - Dashboard Interno
    - Página de Feedbacks (lista)
    - Página Admin
    - Página de Configurações
- Componentes de:
    - Filtros avançados
    - Tabelas
    - Cards de KPI
    - Gráficos (Pie, Bar, Line, Word Cloud)

### **Boas práticas Lovable**

- Use "Action Steps" separados para cada consulta (não misturar).
- Cache local para não recarregar gráficos o tempo todo.
- Layout responsivo usando stacks e grids do Lovable.

## **⚠️ Riscos**

*Pense em coisas que podem dar errado com o projeto com a ajuda da sua equipe e equipes parceiras. Para cada risco, planeje mitigações apropriadas.*

*Existem no geral 5 riscos:*

1. ***Proposta de valor** - os usuários realmente querem essa solução? Mais importante, eles vão fazer o que queremos que eles façam para ver valor na solução?*
    1. Baixa aderência dos colaboradores e gestores de área
2. ***Viabilidade Técnica** devemos construir? Quais são as nossas restrições de time? Estamos deixando algum débito técnico para trás?*
    1. Conseguimos construir com um time enxuto, usando o lovable, com baixo uso de recursos;
    2. Não deixaremos débito técnico pois estamos construindo com premissas de escalabilidade em um app confiável.
3. ***Viabilidade de negócio** - há algum risco de impactar o modelo de crescimento da sua área ou da empresa?*
    1. não!
4. ***Usabilidade** - os usuários conseguem encontrar a solução? Conseguem compreendê-la? Há alguma fricção física ou cognitiva?*
    1. disponibilizar acesso a ferramenta na central de conhecimento da empresa;
    2. instruir os admins a cederem acesso corretamente para os colaboradores.
5. ***Ético** - Há algum problema em construir essa solução?*
    1. é preciso ter cuidado com o vazamento de dados sensíveis de qualquer colaborador nas pesquisas internas → governança cuidado dos acessos mitiga essa possibilidade

## **Métricas de Sucesso**

*Descrevas as principais métricas e link dos dashboards de acompanhamento.*

*Como é o sucesso? Quais métricas você pretende mover? Explique por que essas métricas são importantes, se não óbvias.*

- **Métricas de negócio**
    - X% das iniciativas usando os dados como argumentação
- **Métricas primárias (produto)**
    - X acessos mensais
- **Métricas secundárias (experiência)**
    - Número de chamados sobre usabilidade do produto menor que X%
- **Métricas de tradeoff**
    - não se aplica

## **Resultados**

*Certifique-se de adicionar restrições qualitativas também. Pense em aprendizados, invalidações ou sucesso e explique-os em termos que qualquer um possa entender. Descreva exatamente quando desligar (pense nos recursos que você está usando), continuar (quais são alguns sinais de sucesso no curto prazo) ou bancar a aposta (métricas de sucesso).*

*Responda primordialmente essas três perguntas:*

- Nossa hipótese demonstrou-se confirmada ou invalidada?
- Devemos pivotar, preservar e acompanhar ou matar a ideia?
- Qual é a próxima hipótese que devemos atacar?



1. Visão do Produto
2. Perfis de Usuário (Admin, Gestor, Colaborador)
3. User Journeys
4. Arquitetura de Dados (tabelas Supabase)
5. Regras de Permissão
6. Páginas e Fluxos
7. Requisitos técnicos e padrões de design

Este Knowledge deve ser usado como referência fixa em todas as próximas interações. 
Pergunte qualquer dúvida antes de montar.



iniciar desenvolvimento do mvp fase 1




no nosso mvp lase 1, precisamos concluir o desenvolvimento desses 3 pontos:

autenticação (login/logout)
tabela feadback_clientes
permissões basicas (RLS)

lembrando que o nosso produto vai ter controle de permissão baseado na tabela users.role:

- admin → acesso total
- gestor → dashboards internos + clientes
- colaborador → somente dashboards de clientes

Tarefas:
- Criar middleware que redireciona automaticamente
- Condicionar navegação e componentes


Antes de criar o código, liste como pretende estruturar o fluxo.




ainda seguindo a estrutura do roadmap sugerido, temos algumas coisas a serem feitas na tela de fedback clientes - essa tela ainda não existe!

seguindo a nossa base de conhecimento que voce tem acesso, me ajude com a criação dessa tela

### funcionalaidades: 

- visão geral com:
-nps
-distribuição de notas
-palavras mais citadas (word cloud)
-graficos filtrativos por
 -data
 -categoria (app, evento ou suporte)
 -nota
-lista de fedbacks com busca e filtros avançados.
-exportar csv com os fedbacks filtrados ou não
-possibilidade de exportação do dashboard em pdf ou png 

conectar a tabela fedback_clientes

siga o design system existente
n~eo mexa em outras notas
faça perguntas antes de implementar 



vamos seguir para a fase 2 do roadmap desenhado:

fase 2: fedbacks internos (semanas 4-5)
criação de tabela fedback_interno + pesquisas
dashbord de clima organizacional
filtros por setor/equipe (gestor)
configuração de anonimato 

seguindo o nosso prd/base de conhecimento, imaginamos a nossa tela de fedback interno da seguinte forma:


### funcionalaidades: 

- visão geral com:
-nps
-distribuição de notas
-palavras mais citadas (word cloud)
-graficos filtrativos por
 -data
 -categoria (app, evento ou suporte)
 -nota
-lista de fedbacks com busca e filtros avançados.
-exportar csv com os fedbacks filtrados ou não
-possibilidade de exportação do dashboard em pdf ou png 

para a tabela de fadback interno, voce pode seguir a sua proposta inicial!



olhando para o momento do nosso projeto, quero evoluir para a criação da
nossa tela de admin, mas quero focar em algumas features especificas
nesse primeiro momento!

fase 3: admin & avançado (semanas 6-7)
painel de administração completo
upload de csv 

quero focar na parte de upload de csv, a ideia e que nesse primeiro momento, a gente consinga 
fazer o upload para a tabela fedback_clientes, para que os dados possam refletir na nossa tela/fedback/clientes



Adicionar dois recursos na página /admin:

1. Upload de CSV manual → insere registros em feedback_clientes

Inclua:
- Validação dos campos
- Preview do CSV
- Logs de ingestão
- Componente atômico de upload seguindo design system

segue um exemplo de como vão chegar os dados do meu csv:


1,nome@gmail.com,8,"amei o evento","performance,ux",2026-09-22,2026-09-22
2,polar@gmail.com,7,"foi bom","performance,ux",2026-09-22,2026-09-22
3,aidran@gmail.com,6,"ta ok","performance,ux",2026-09-22,2026-09-22
4,putzelys@gmail.com,5,"podia ser melhor","performance,ux",2026-09-22,2026-09-22
5,tromba@gmail.com,1,"que merda e essa, essa porra não ta com nada","performance,ux",2026-09-22,2026-09-22



olhando para nossa tela/fedbacks/clientes, temos algumas melhorias a serem feitas:

1 - o grafico de total de fedbacks esta mostrando o total de fato, mas não
mostra o total por categoria, os numeros estão zerados 

2 - o nosso grafico de destribuição de categoria (o grafico de pizza) não 
esta funcionando, não existe grafico 

3- a feature de exportação do dashboard em pdf ou png tambem não 
existe, e muito importante para essa pagina que essa feature esteja 
funcinal e exista



estou com um erro na minha pagina/fedbacks/clientes. quando eu vou ate o 
filtro de categoria, e de filtro por uma categoria ele não esta filtrando o meu
relatorio. os outros filtros (data e nota) estão funcionando, o erro acontece apenas no filtro
de categoria

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/9c526dba-7a13-4b60-9978-bf263b9938d3).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
