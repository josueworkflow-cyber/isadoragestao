# Revisão do Resumo Geral

Revisão local em 06/10/2026, validada com dados sintéticos. Não houve acesso ao ambiente ou banco de produção.

## Fontes e regras

- Faturamento: vendas por fornecedor, incluindo ajustes manuais com seu sinal original. As vendas por cliente/ABC não são somadas novamente ao faturamento.
- Ano: as consultas de faturamento e detalhe por fornecedor consideram importações de 2026, como o calendário e o painel atuais.
- Mês: importações semanais seguem o calendário comercial oficial. Ajustes seguem o mês registrado na importação.
- Acumulado: soma de janeiro a dezembro, comparada ao objetivo anual; a tela identifica explicitamente essa comparação. O percentual anual representa progresso no objetivo, sem classificar automaticamente o ritmo como atrasado.
- Meta mensal: `(objetivo anual − vendas dos meses anteriores) / meses restantes`, limitada a zero. É a mesma regra de `gm` usada nos vendedores, relatórios e editor de metas. Na ausência de `ma`, preserva-se o fallback existente para a soma das metas mensais cadastradas.
- Atingimento: realizado dividido pela meta. Sem meta positiva, apresenta-se `—`, evitando divisão por zero.
- Saldo consolidado: `max(0, meta total − realizado total)`. Excedentes de um vendedor compensam faltas de outro; por isso, o saldo do rodapé pode diferir da soma dos saldos individuais.
- Vendedores inativos permanecem no histórico, com identificação visual. A quantidade de vendedores é derivada dos dados recebidos, sem número fixo.
- Gráficos, cartões e rankings usam o mesmo período e a mesma ordenação por faturamento. O gráfico dos vendedores compara efetivamente realizado e meta, ou atingimento, conforme o botão selecionado.
- Participação das fábricas: faturamento da fábrica dividido pelo total das fábricas no período. Divergências entre esse total e o consolidado geram aviso. Se houver fábrica com valor negativo, a rosca é substituída por explicação; a barra e os valores preservam o ajuste.
- A opção de ocultar valores também cobre rodapé, eixos monetários e tooltips, preservando a preferência no navegador.

## Indicador de pedidos

O parser calcula `orderCount`, mas `saveType2Import` atualmente não persiste esse campo. `getVendorsList` usa uma contagem manual quando disponível e, como fallback, conta registros de clientes, que podem representar vários pedidos. O Resumo Geral substitui esse indicador por vendedores com movimentação no período. A origem dos pedidos nas outras páginas permanece como estava; recuperar pedidos históricos precisaria dos arquivos originais ou de informação adicional.

## Layout

Filtro de período e olhinho no cabeçalho; indicadores principais; comparativo de vendedores e participação por fábrica; cartões compactos da equipe; resultado por fábrica; tabela do período com total consolidado. Gráficos usam contêineres com altura definida e `maintainAspectRatio: false`. A tabela tem rolagem horizontal própria no celular.

## Validação reproduzível

```sh
npm run test:summary
npm test --prefix backend
npm run preview:summary
```

A prévia abre em `http://127.0.0.1:8770`, servindo a aplicação com uma API local de dados sintéticos, sem conexão com PostgreSQL. Não substitui nem insere registros em qualquer banco. Os dados ficam em `frontend/tests/fixtures/summary-data.mjs`.

Referências independentes da massa de teste:

| Período | Faturamento | Meta | Atingimento | Saldo |
| --- | ---: | ---: | ---: | ---: |
| Acumulado | R$ 340.000,00 | R$ 984.000,00 | 34,5528% | R$ 644.000,00 |
| Janeiro | R$ 100.000,00 | R$ 82.000,00 | 121,9512% | R$ 0,00 |
| Fevereiro | R$ 100.000,00 | R$ 80.636,36 | 124,0135% | R$ 0,00 |
| Março | R$ 140.000,00 | R$ 78.700,00 | 177,8907% | R$ 0,00 |

Os testes também cobrem mês sem vendas, ausência de metas, vendedor inativo, fallback de metas, objetivo já superado, ajustes negativos, divergência de total, filtros dos dados de origem, privacidade e troca de gráficos. A validação visual cobre computador e celular de 390 pixels.
