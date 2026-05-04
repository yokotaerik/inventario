# Regras de Negócio — Geração de Códigos

Todos os códigos do sistema seguem padrões determinísticos e são gerados automaticamente pelo backend. Esta documentação descreve as regras, formatos e onde cada lógica vive no código.

---

## 1. Código de Projeto

**Formato:** `70XXXX`
- Prefixo fixo `70`
- Sufixo de **4 caracteres alfanuméricos** maiúsculos (`A–Z`, `0–9`)
- Exemplo: `70AB3F`, `70Z9Q1`

**Geração:**
- Auto-gerado quando o campo `code` não é informado na criação do projeto
- O backend sorteia 4 caracteres aleatórios, verifica unicidade na tabela `projects.code` e repete até 5 vezes em caso de colisão
- Se todas as 5 tentativas colidirem, retorna `ConflictError` (probabilidade desprezível com ~1,6 M combinações)
- O código também pode ser informado manualmente na criação; nesse caso, apenas a unicidade é validada

**Onde vive:**
```
backend/projects/use_cases/create_project.py → CreateProjectUseCase._generate_code()
```

---

## 2. Código de Produto (Itens e Estoque)

**Formato:** `{project_code}-NNNN`
- Prefixo = código do projeto ao qual o item pertence
- Separador `-`
- Sufixo numérico sequencial com **4 dígitos** com zero à esquerda
- Exemplo: `70AB3F-0001`, `70AB3F-0012`

**Geração:**
- Auto-gerado quando um item (`items`) ou item de estoque (`stock_items`) é criado com um `project_id` e sem `product_code` explícito
- A sequência é **compartilhada** entre `items` e `stock_items` do mesmo projeto — ambas as tabelas são consultadas para encontrar o maior sufixo existente, e o próximo número é `max + 1`
- Itens sem projeto não recebem `product_code`

**Onde vive:**
```
backend/shared/product_code.py → next_product_code(db, project_code)
```

---

## 3. Código de Local (Project Location)

**Formato:** `{project_code}-LNN`
- Prefixo = código do projeto pai
- Literal `L` (de *Location*)
- Sufixo numérico sequencial com **2 dígitos** com zero à esquerda
- Exemplo: `70AB3F-L01`, `70AB3F-L09`

**Geração:**
- Auto-gerado na criação de todo novo `ProjectLocation`
- A sequência é por projeto: consulta todos os `project_locations.code` com o prefixo `{project_code}-L` e incrementa o maior sufixo encontrado
- Não pode ser informado manualmente pela API (sempre gerado pelo sistema)

**Onde vive:**
```
backend/shared/location_code.py → next_location_code(db, project_code)
```

---

## Resumo visual

```
Projeto         →  70AB3F
├── Local 1     →  70AB3F-L01
├── Local 2     →  70AB3F-L02
├── Item A      →  70AB3F-0001
├── Item B      →  70AB3F-0002
└── Estoque X   →  70AB3F-0003   ← sequência compartilhada com itens
```

---

## Invariantes

| Regra | Onde é validada |
|---|---|
| `projects.code` é único globalmente | `CreateProjectUseCase` + constraint `UNIQUE` no banco |
| `product_code` é único por tabela (`items`, `stock_items`) | constraint `UNIQUE` no banco |
| `project_locations.code` é único globalmente | constraint `UNIQUE` no banco |
| Itens sem projeto não têm `product_code` | `next_product_code` só é chamado quando `project_id` está presente |
